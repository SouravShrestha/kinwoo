-- Bulk and back-to-back grocery actions read as one activity row ("Milk + 2 others"), and a batch's
-- per-item prices can be edited along with its expense or private purchase.

CREATE FUNCTION public.activity_items_label(p_first text, p_count integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select case when p_count <= 1 then p_first
              else p_first || ' + ' || (p_count - 1)::text
                   || case when p_count = 2 then ' other' else ' others' end
         end;
$$;

REVOKE ALL ON FUNCTION public.activity_items_label(text, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_grocery_items(p_list_id uuid, p_item_ids uuid[], p_assigned_to uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_assignee_name text;
  v_found int;
  v_count int;
  v_ids uuid[];
  v_first text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 or cardinality(p_item_ids) > 200 then
    raise exception 'INVALID_INPUT';
  end if;

  select l.house_id, l.name into v_house_id, v_list_name
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not exists (
    select 1 from public.house_members
     where house_id = v_house_id and user_id = p_assigned_to and status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select display_name into v_assignee_name from public.profiles where id = p_assigned_to;

  -- Lock the rows so a concurrent claim cannot slip in between the check and the update.
  perform 1 from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id
     for update;

  select count(*) into v_found
    from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id;

  if v_found <> cardinality(array(select distinct unnest(p_item_ids))) then
    raise exception 'NOT_FOUND';
  end if;

  with updated as (
    update public.grocery_items
       set assigned_by = v_uid,
           assigned_to = p_assigned_to,
           assigned_at = now(),
           status = 'assigned',
           assignment_response = null
     where id = any(p_item_ids) and list_id = p_list_id and status = 'pending'
    returning id, name
  ), picked as (
    select k.id, min(k.ord) as ord from unnest(p_item_ids) with ordinality as k(id, ord) group by k.id
  )
  select count(*)::int, array_agg(u.id order by p.ord), (array_agg(u.name order by p.ord))[1]
    into v_count, v_ids, v_first
    from updated u join picked p on p.id = u.id;

  if v_count > 0 then
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.assigned', 'grocery_item', v_ids[1],
      jsonb_build_object(
        'assigned_to', p_assigned_to,
        'assigned_to_name', v_assignee_name,
        'list_id', p_list_id,
        'list_name', v_list_name,
        'name', public.activity_items_label(v_first, v_count),
        'item_ids', to_jsonb(v_ids),
        'item_count', v_count
      )
    );
  end if;

  return v_count;
end $$;

CREATE OR REPLACE FUNCTION public.claim_grocery_items(p_list_id uuid, p_item_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_found int;
  v_count int;
  v_ids uuid[];
  v_first text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 or cardinality(p_item_ids) > 200 then
    raise exception 'INVALID_INPUT';
  end if;

  select l.house_id, l.name into v_house_id, v_list_name
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  perform 1 from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id
     for update;

  select count(*) into v_found
    from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id;

  if v_found <> cardinality(array(select distinct unnest(p_item_ids))) then
    raise exception 'NOT_FOUND';
  end if;

  with updated as (
    update public.grocery_items
       set claimed_by = v_uid,
           claimed_at = now(),
           status = 'claimed'
     where id = any(p_item_ids) and list_id = p_list_id and status = 'pending'
    returning id, name
  ), picked as (
    select k.id, min(k.ord) as ord from unnest(p_item_ids) with ordinality as k(id, ord) group by k.id
  )
  select count(*)::int, array_agg(u.id order by p.ord), (array_agg(u.name order by p.ord))[1]
    into v_count, v_ids, v_first
    from updated u join picked p on p.id = u.id;

  if v_count > 0 then
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.claimed', 'grocery_item', v_ids[1],
      jsonb_build_object(
        'list_id', p_list_id,
        'list_name', v_list_name,
        'name', public.activity_items_label(v_first, v_count),
        'item_ids', to_jsonb(v_ids),
        'item_count', v_count
      )
    );
  end if;

  return v_count;
end $$;

-- An add right after the same person's previous add to the same list joins that activity row.
-- "Needed now" adds always get their own row: that insert is what sends their push.
CREATE OR REPLACE FUNCTION public.add_grocery_item(p_list_id uuid, p_name text, p_quantity numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_urgency text DEFAULT 'whenever'::text, p_note text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text) RETURNS public.grocery_items
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
  v_item public.grocery_items;
  v_pos int;
  v_last public.activity_log;
  v_count int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if p_idempotency_key is not null then
    select * into v_item
      from public.grocery_items
     where list_id = p_list_id and idempotency_key = p_idempotency_key;
    if found then
      return v_item;
    end if;
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'INVALID_NAME';
  end if;

  if p_urgency not in ('now', 'soon', 'today', 'tomorrow', 'this_week', 'whenever') then
    raise exception 'INVALID_INPUT';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_category_id is not null then
    if not exists (
      select 1 from public.grocery_categories
       where id = p_category_id and (house_id is null or house_id = v_list.house_id)
    ) then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_items
   where list_id = p_list_id;

  insert into public.grocery_items (
    list_id, name, quantity, unit, category_id, urgency, note, idempotency_key, position, created_by
  ) values (
    p_list_id,
    btrim(p_name),
    p_quantity,
    nullif(btrim(p_unit), ''),
    p_category_id,
    p_urgency::public.item_urgency,
    nullif(p_note, ''),
    nullif(btrim(p_idempotency_key), ''),
    v_pos,
    v_uid
  ) returning * into v_item;

  if p_urgency <> 'now' then
    select * into v_last
      from public.activity_log
     where house_id = v_list.house_id
     order by created_at desc, id desc
     limit 1
       for update;

    -- ponytail: fixed 30-minute window; make it a setting if houses want longer runs.
    if found
       and v_last.actor_id = v_uid
       and v_last.type = 'grocery_item.added'
       and v_last.payload ->> 'list_id' = p_list_id::text
       and v_last.payload ->> 'urgency' is distinct from 'now'
       and jsonb_typeof(v_last.payload -> 'item_ids') = 'array'
       and v_last.created_at > now() - interval '30 minutes' then
      v_count := jsonb_array_length(v_last.payload -> 'item_ids') + 1;
      update public.activity_log
         set payload = payload || jsonb_build_object(
               'name', public.activity_items_label(payload ->> 'first_name', v_count),
               'item_ids', (payload -> 'item_ids') || to_jsonb(v_item.id),
               'item_count', v_count
             ),
             created_at = now()
       where id = v_last.id;
      return v_item;
    end if;
  end if;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_item.added', 'grocery_item', v_item.id,
    jsonb_build_object(
      'list_id', p_list_id, 'list_name', v_list.name, 'name', v_item.name, 'urgency', p_urgency,
      'first_name', v_item.name, 'item_ids', jsonb_build_array(v_item.id), 'item_count', 1
    )
  );

  return v_item;
end $$;

-- p_prices: [{ item_id, price_paise }] for items of the batch; a null price clears it.
CREATE FUNCTION public.set_batch_item_prices(p_batch_id uuid, p_prices jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_total int;
  v_distinct int;
  v_matched int;
  v_bad int;
begin
  if p_batch_id is null or jsonb_typeof(p_prices) is distinct from 'array' then
    raise exception 'INVALID_INPUT';
  end if;

  select count(*), count(distinct x.item_id), count(p.item_id),
         count(*) filter (where x.price_paise < 0 or x.price_paise > 1000000000)
    into v_total, v_distinct, v_matched, v_bad
    from jsonb_to_recordset(p_prices) as x(item_id uuid, price_paise integer)
    left join public.grocery_purchases p on p.batch_id = p_batch_id and p.item_id = x.item_id;

  if v_total > 200 or v_distinct <> v_total or v_matched <> v_total or v_bad > 0 then
    raise exception 'INVALID_INPUT';
  end if;

  update public.grocery_purchases p
     set price_paise = x.price_paise
    from jsonb_to_recordset(p_prices) as x(item_id uuid, price_paise integer)
   where p.batch_id = p_batch_id and p.item_id = x.item_id;
end $$;

REVOKE ALL ON FUNCTION public.set_batch_item_prices(uuid, jsonb) FROM PUBLIC, anon, authenticated;

DROP FUNCTION public.update_expense(uuid, text, integer, text, text, date, text, jsonb, jsonb);

CREATE FUNCTION public.update_expense(p_expense_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb, p_item_prices jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_batch_id uuid;
  v_title text := public.normalize_expense_title(p_title);
  v_note text := nullif(btrim(p_note), '');
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id, batch_id into v_house_id, v_batch_id
    from public.expenses
   where id = p_expense_id and deleted_at is null
     for update;

  if not found or not public.is_house_member(v_house_id) then raise exception 'NOT_FOUND'; end if;
  if not public.can_manage_expense(p_expense_id) then raise exception 'FORBIDDEN'; end if;

  perform public.check_expense_fields(
    v_title, p_amount_paise, p_category, v_note, p_spent_on, p_split_method
  );

  update public.expenses
     set title = v_title,
         amount_paise = p_amount_paise,
         category = p_category,
         note = v_note,
         spent_on = p_spent_on,
         split_method = p_split_method,
         updated_by = v_uid
   where id = p_expense_id;

  update public.grocery_purchases p
     set price_paise = p_amount_paise
    from public.expenses e
   where e.id = p_expense_id and p.id = e.purchase_id;

  update public.grocery_purchase_batches b
     set total_paise = p_amount_paise
    from public.expenses e
   where e.id = p_expense_id and b.id = e.batch_id;

  if p_item_prices is not null then
    perform public.set_batch_item_prices(v_batch_id, p_item_prices);
  end if;

  perform public.write_expense_parts(
    p_expense_id, v_house_id, p_amount_paise, p_split_method, p_payers, p_shares
  );

  perform public.log_activity(
    v_house_id, v_uid, 'expense.updated', 'expense', p_expense_id,
    jsonb_build_object('title', v_title, 'amount_paise', p_amount_paise, 'category', p_category)
      || public.expense_parts_snapshot(p_expense_id)
  );
end $$;

REVOKE ALL ON FUNCTION public.update_expense(uuid, text, integer, text, text, date, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.update_expense(uuid, text, integer, text, text, date, text, jsonb, jsonb, jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_expense(uuid, text, integer, text, text, date, text, jsonb, jsonb, jsonb) TO service_role;

DROP FUNCTION public.update_private_purchase(uuid, integer, text, timestamptz);

CREATE FUNCTION public.update_private_purchase(
  p_item_id uuid,
  p_price_paise integer,
  p_store text,
  p_bought_at timestamptz,
  p_item_prices jsonb DEFAULT NULL
) returns void
  language plpgsql security definer
  set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_list_id uuid;
  v_status text;
  v_batch_id uuid;
  v_store text := nullif(btrim(p_store), '');
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.list_id, i.status::text into v_list_id, v_status
    from public.grocery_items i
   where i.id = p_item_id
     for update;
  if not found or v_status <> 'bought' or not public.can_read_list(v_list_id) then
    raise exception 'NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.grocery_lists l where l.id = v_list_id and l.visibility = 'private'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select p.batch_id into v_batch_id
    from public.grocery_purchases p
   where p.item_id = p_item_id
   order by p.created_at desc
   limit 1;
  if not found then raise exception 'NOT_FOUND'; end if;

  if exists (
    select 1
      from public.expenses e
     where e.deleted_at is null
       and (
         e.batch_id = v_batch_id
         or e.purchase_id in (select p.id from public.grocery_purchases p where p.item_id = p_item_id)
       )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_bought_at is null
     or p_bought_at > now() + interval '1 day'
     or char_length(v_store) > 100
     or p_price_paise < 0
     or p_price_paise > 1000000000
     or (v_batch_id is not null and p_price_paise is null)
     or (v_batch_id is null and p_item_prices is not null) then
    raise exception 'INVALID_INPUT';
  end if;

  if v_batch_id is null then
    update public.grocery_purchases
       set price_paise = p_price_paise, store = v_store, bought_at = p_bought_at
     where item_id = p_item_id;
  else
    update public.grocery_purchase_batches
       set total_paise = p_price_paise, store = v_store, bought_at = p_bought_at
     where id = v_batch_id;
    update public.grocery_purchases
       set store = v_store, bought_at = p_bought_at
     where batch_id = v_batch_id;
    if p_item_prices is not null then
      perform public.set_batch_item_prices(v_batch_id, p_item_prices);
    end if;
  end if;
end;
$$;

revoke all on function public.update_private_purchase(uuid, integer, text, timestamptz, jsonb) from public, anon;
grant execute on function public.update_private_purchase(uuid, integer, text, timestamptz, jsonb)
  to authenticated, service_role;
