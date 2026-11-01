-- A private list never produces an expense, so its purchases are edited directly. Editing any
-- item of a batch edits the whole batch (total, store, date); per-item prices stay.
create function public.update_private_purchase(
  p_item_id uuid,
  p_price_paise integer,
  p_store text,
  p_bought_at timestamptz
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
     or (v_batch_id is not null and p_price_paise is null) then
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
  end if;
end;
$$;

revoke all on function public.update_private_purchase(uuid, integer, text, timestamptz) from public;
grant execute on function public.update_private_purchase(uuid, integer, text, timestamptz)
  to authenticated, service_role;
