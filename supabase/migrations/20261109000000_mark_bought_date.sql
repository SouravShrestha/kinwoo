-- Lets the buyer record the day an item was actually bought. Omitting it keeps stamping now().
drop function public.mark_item_bought(uuid, numeric, text, int, text);

create function public.mark_item_bought(
  p_item_id uuid,
  p_quantity numeric default null,
  p_unit text default null,
  p_price_paise int default null,
  p_store text default null,
  p_bought_at timestamptz default null
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

  if p_bought_at is not null and p_bought_at > now() then
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
    coalesce(p_bought_at, now())
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

revoke all on function public.mark_item_bought(uuid, numeric, text, int, text, timestamptz)
  from public, anon;
grant execute on function public.mark_item_bought(uuid, numeric, text, int, text, timestamptz)
  to authenticated;
