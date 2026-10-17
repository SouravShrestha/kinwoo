create table public.grocery_purchase_batches (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  list_id uuid not null references public.grocery_lists (id) on delete restrict,
  bought_by uuid not null references public.profiles (id),
  name text check (name is null or char_length(name) between 1 and 60),
  total_paise int not null check (total_paise >= 0),
  store text check (store is null or char_length(store) <= 100),
  bought_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index grocery_purchase_batches_list_idx
  on public.grocery_purchase_batches (list_id, bought_at desc);

-- Batches are financial records like purchases, so they must outlive their items.
alter table public.grocery_purchases
  add column batch_id uuid references public.grocery_purchase_batches (id) on delete restrict,
  add column batch_position int check (batch_position is null or batch_position >= 0);

create index grocery_purchases_batch_idx
  on public.grocery_purchases (batch_id) where batch_id is not null;

alter table public.grocery_purchase_batches enable row level security;

revoke all on public.grocery_purchase_batches from anon, authenticated;
grant select on public.grocery_purchase_batches to authenticated;

create policy grocery_purchase_batches_select on public.grocery_purchase_batches
  for select to authenticated
  using (public.can_read_list(list_id));

create or replace function public.mark_item_bought(
  p_item_id uuid,
  p_quantity numeric default null,
  p_unit text default null,
  p_price_paise int default null,
  p_store text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.quantity, i.unit, i.status, i.claimed_by, i.assigned_to,
         l.house_id
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

  if not (
    public.is_house_admin(v_item_rec.house_id)
    or (v_item_rec.claimed_by is not null and v_item_rec.claimed_by = v_uid)
    or (v_item_rec.assigned_to is not null and v_item_rec.assigned_to = v_uid)
    or (v_item_rec.claimed_by is null and v_item_rec.assigned_to is null)
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_price_paise is not null and p_price_paise < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_store is not null and char_length(btrim(p_store)) > 100 then
    raise exception 'INVALID_INPUT';
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
    now()
  );

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
end $$;

-- All or nothing: every item must be on the list, unbought and buyable by the caller.
create function public.mark_items_bought(
  p_list_id uuid,
  p_item_ids uuid[],
  p_total_paise int,
  p_name text default null,
  p_store text default null,
  p_item_prices int[] default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_is_admin boolean;
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

  select l.house_id, l.name into v_house_id, v_list_name
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
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

  v_is_admin := public.is_house_admin(v_house_id);

  if not v_is_admin and exists (
    select 1 from public.grocery_items
     where id = any(p_item_ids)
       and not (
         (claimed_by is not null and claimed_by = v_uid)
         or (assigned_to is not null and assigned_to = v_uid)
         or (claimed_by is null and assigned_to is null)
       )
  ) then
    raise exception 'FORBIDDEN';
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

  return v_batch_id;
end $$;

revoke all on function public.mark_items_bought(uuid, uuid[], int, text, text, int[])
  from public, anon;
grant execute on function public.mark_items_bought(uuid, uuid[], int, text, text, int[])
  to authenticated;
