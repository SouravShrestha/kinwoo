-- Bulk delete used to be one HTTP request and one RPC per item. This deletes a selection in one
-- call with the same rules as delete_grocery_item, skipping items the caller may not delete so the
-- client can report "deleted 3 of 5" as before.
create function public.delete_grocery_items(p_list_id uuid, p_item_ids uuid[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_is_admin boolean;
  v_count int := 0;
  v_item record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 or cardinality(p_item_ids) > 200 then
    raise exception 'INVALID_INPUT';
  end if;

  select l.house_id into v_house_id
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_is_admin := public.is_house_admin(v_house_id);

  for v_item in
    delete from public.grocery_items i
     where i.id = any(p_item_ids)
       and i.list_id = p_list_id
       -- Bought items are financial records; they cannot be deleted.
       and i.status <> 'bought'
       and (v_is_admin or i.created_by = v_uid)
    returning i.id, i.name
  loop
    v_count := v_count + 1;
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.deleted', 'grocery_item', v_item.id,
      jsonb_build_object('list_id', p_list_id, 'name', v_item.name)
    );
  end loop;

  return v_count;
end $$;

revoke all on function public.delete_grocery_items(uuid, uuid[]) from public, anon;
grant execute on function public.delete_grocery_items(uuid, uuid[]) to authenticated;
