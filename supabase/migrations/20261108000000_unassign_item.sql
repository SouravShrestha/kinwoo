-- Returns a claimed or assigned item to pending. Allowed for whoever holds it, whoever assigned
-- it, the item's creator and house admins.
create or replace function public.unassign_grocery_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.status, i.created_by, i.claimed_by, i.assigned_to,
         i.assigned_by, l.house_id, l.name as list_name
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
  if v_item_rec.status not in ('claimed', 'assigned') then raise exception 'INVALID_INPUT'; end if;

  -- coalesce: the holder columns are often null, and a null here would skip the check.
  if not coalesce(
    v_uid = v_item_rec.claimed_by
    or v_uid = v_item_rec.assigned_to
    or v_uid = v_item_rec.assigned_by
    or v_uid = v_item_rec.created_by
    or public.is_house_admin(v_item_rec.house_id),
    false
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set status = 'pending',
         claimed_by = null,
         claimed_at = null,
         assigned_to = null,
         assigned_by = null,
         assigned_at = null,
         assignment_response = null
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.unassigned', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'list_name', v_item_rec.list_name,
      'name', v_item_rec.name
    )
  );
end $$;

revoke all on function public.unassign_grocery_item(uuid) from public, anon;
grant execute on function public.unassign_grocery_item(uuid) to authenticated;
