-- Any member who can see a list may assign its pending items to a housemate, one or many at a
-- time. Reassigning items that are already claimed or assigned stays with admins and the creator.

create or replace function public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, i.status, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id
     for update of i;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.status <> 'pending'
     and not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'ALREADY_CLAIMED';
  end if;

  if not exists (
    select 1 from public.house_members
     where house_id = v_item_rec.house_id and user_id = p_assigned_to and status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set assigned_by = v_uid,
         assigned_to = p_assigned_to,
         assigned_at = now(),
         status = 'assigned',
         assignment_response = null
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.assigned', 'grocery_item', p_item_id,
    jsonb_build_object(
      'assigned_to', p_assigned_to,
      'list_id', v_item_rec.list_id,
      'name', v_item_rec.name
    )
  );
end $$;

-- Only pending items are touched, so no role check is needed beyond list access. Items that
-- stopped being pending are skipped and the count actually assigned is returned.
create or replace function public.assign_grocery_items(
  p_list_id uuid,
  p_item_ids uuid[],
  p_assigned_to uuid
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_found int;
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

  if not exists (
    select 1 from public.house_members
     where house_id = v_house_id and user_id = p_assigned_to and status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;

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

  for v_item in
    update public.grocery_items
       set assigned_by = v_uid,
           assigned_to = p_assigned_to,
           assigned_at = now(),
           status = 'assigned',
           assignment_response = null
     where id = any(p_item_ids) and list_id = p_list_id and status = 'pending'
    returning id, name
  loop
    v_count := v_count + 1;
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.assigned', 'grocery_item', v_item.id,
      jsonb_build_object(
        'assigned_to', p_assigned_to,
        'list_id', p_list_id,
        'name', v_item.name
      )
    );
  end loop;

  return v_count;
end $$;

-- "Assign to me" for several items is a claim, the same as tapping "I'll buy" on each.
create function public.claim_grocery_items(p_list_id uuid, p_item_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_found int;
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

  perform 1 from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id
     for update;

  select count(*) into v_found
    from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id;

  if v_found <> cardinality(array(select distinct unnest(p_item_ids))) then
    raise exception 'NOT_FOUND';
  end if;

  for v_item in
    update public.grocery_items
       set claimed_by = v_uid,
           claimed_at = now(),
           status = 'claimed'
     where id = any(p_item_ids) and list_id = p_list_id and status = 'pending'
    returning id, name
  loop
    v_count := v_count + 1;
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.claimed', 'grocery_item', v_item.id,
      jsonb_build_object('list_id', p_list_id, 'name', v_item.name)
    );
  end loop;

  return v_count;
end $$;

revoke all on function public.claim_grocery_items(uuid, uuid[]) from public, anon;
grant execute on function public.claim_grocery_items(uuid, uuid[]) to authenticated;
