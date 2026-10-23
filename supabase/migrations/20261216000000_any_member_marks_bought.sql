-- Any member who can see a list marks its items bought, whoever claimed or was assigned them.
CREATE OR REPLACE FUNCTION public.mark_item_bought(p_item_id uuid, p_quantity numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text, p_price_paise integer DEFAULT NULL::integer, p_store text DEFAULT NULL::text, p_bought_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expense jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
  v_purchase_id uuid;
  v_bought_at timestamptz := coalesce(p_bought_at, now());
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.quantity, i.unit, i.status, i.claimed_by, i.assigned_to,
         l.house_id, l.visibility
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id
     for update of i;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.status = 'bought' then raise exception 'ALREADY_BOUGHT'; end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_price_paise is not null and p_price_paise < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_store is not null and char_length(btrim(p_store)) > 100 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_bought_at is not null and p_bought_at > now() then
    raise exception 'INVALID_INPUT';
  end if;

  if p_expense is not null then
    if v_item_rec.visibility = 'private' then raise exception 'PRIVATE_LIST'; end if;
    if p_price_paise is null or p_price_paise = 0 then raise exception 'INVALID_INPUT'; end if;
  end if;

  insert into public.grocery_purchases (
    item_id, bought_by, quantity, unit, price_paise, store, bought_at
  ) values (
    p_item_id,
    v_uid,
    coalesce(p_quantity, v_item_rec.quantity),
    coalesce(nullif(btrim(p_unit), ''), v_item_rec.unit),
    p_price_paise,
    nullif(btrim(p_store), ''),
    v_bought_at
  ) returning id into v_purchase_id;

  update public.grocery_items
     set status = 'bought'
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.bought', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'name', v_item_rec.name,
      'price_paise', p_price_paise,
      'store', nullif(btrim(p_store), '')
    )
  );

  if p_expense is not null then
    perform public.insert_linked_expense(
      v_item_rec.house_id, v_uid, v_item_rec.name, p_price_paise, v_bought_at::date,
      p_expense, v_purchase_id, null
    );
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.mark_items_bought(p_list_id uuid, p_item_ids uuid[], p_total_paise integer, p_name text DEFAULT NULL::text, p_store text DEFAULT NULL::text, p_item_prices integer[] DEFAULT NULL::integer[], p_expense jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_visibility public.list_visibility;
  v_count int;
  v_found int;
  v_name text := nullif(btrim(p_name), '');
  v_store text := nullif(btrim(p_store), '');
  v_batch_id uuid;
  v_first_name text;
  v_label text;
  v_item record;
  v_price int;
  i int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  v_count := coalesce(cardinality(p_item_ids), 0);
  if v_count < 2 or v_count > 200 then raise exception 'INVALID_INPUT'; end if;

  if (select count(distinct x) from unnest(p_item_ids) as x) <> v_count
     or array_position(p_item_ids, null) is not null then
    raise exception 'INVALID_INPUT';
  end if;

  if p_item_prices is not null then
    if coalesce(cardinality(p_item_prices), 0) <> v_count then
      raise exception 'INVALID_INPUT';
    end if;
    if exists (select 1 from unnest(p_item_prices) as p where p < 0) then
      raise exception 'INVALID_INPUT';
    end if;
  end if;

  if p_total_paise is null or p_total_paise < 0 then raise exception 'INVALID_INPUT'; end if;
  if v_name is not null and char_length(v_name) > 60 then raise exception 'INVALID_INPUT'; end if;
  if v_store is not null and char_length(v_store) > 100 then raise exception 'INVALID_INPUT'; end if;

  select l.house_id, l.name, l.visibility into v_house_id, v_list_name, v_visibility
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_expense is not null then
    if v_visibility = 'private' then raise exception 'PRIVATE_LIST'; end if;
    if p_total_paise = 0 then raise exception 'INVALID_INPUT'; end if;
  end if;

  -- Lock the rows so a concurrent single buy cannot slip in between the checks and the writes.
  perform 1 from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id
     for update;

  select count(*) into v_found
    from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id and status <> 'cancelled';

  if v_found <> v_count then raise exception 'NOT_FOUND'; end if;

  if exists (
    select 1 from public.grocery_items
     where id = any(p_item_ids) and status = 'bought'
  ) then
    raise exception 'ALREADY_BOUGHT';
  end if;

  insert into public.grocery_purchase_batches (
    house_id, list_id, bought_by, name, total_paise, store
  ) values (
    v_house_id, p_list_id, v_uid, v_name, p_total_paise, v_store
  ) returning id into v_batch_id;

  for i in 1 .. v_count loop
    select id, name, quantity, unit into v_item
      from public.grocery_items
     where id = p_item_ids[i];

    v_price := case when p_item_prices is null then null else p_item_prices[i] end;
    if i = 1 then v_first_name := v_item.name; end if;

    insert into public.grocery_purchases (
      item_id, bought_by, quantity, unit, price_paise, store, bought_at, batch_id, batch_position
    ) values (
      v_item.id, v_uid, v_item.quantity, v_item.unit, v_price, v_store, now(), v_batch_id, i - 1
    );
  end loop;

  update public.grocery_items
     set status = 'bought'
   where id = any(p_item_ids);

  v_label := coalesce(
    v_name,
    v_first_name || ' + ' || (v_count - 1)::text
      || case when v_count - 1 = 1 then ' other' else ' others' end
  );

  perform public.log_activity(
    v_house_id, v_uid, 'grocery_batch.bought', 'grocery_purchase_batch', v_batch_id,
    jsonb_build_object(
      'list_id', p_list_id,
      'list_name', v_list_name,
      'label', v_label,
      'item_ids', to_jsonb(p_item_ids),
      'item_count', v_count,
      'total_paise', p_total_paise,
      'store', v_store
    )
  );

  if p_expense is not null then
    perform public.insert_linked_expense(
      v_house_id, v_uid, v_label, p_total_paise, now()::date, p_expense, null, v_batch_id
    );
  end if;

  return v_batch_id;
end $$;
