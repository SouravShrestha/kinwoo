create or replace function public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
  v_assignee_name text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, i.status, l.house_id, l.name as list_name
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

  select display_name into v_assignee_name from public.profiles where id = p_assigned_to;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.assigned', 'grocery_item', p_item_id,
    jsonb_build_object(
      'assigned_to', p_assigned_to,
      'assigned_to_name', v_assignee_name,
      'list_id', v_item_rec.list_id,
      'list_name', v_item_rec.list_name,
      'name', v_item_rec.name
    )
  );
end $$;

create or replace function public.assign_grocery_items(
  p_list_id uuid,
  p_item_ids uuid[],
  p_assigned_to uuid
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_assignee_name text;
  v_found int;
  v_count int := 0;
  v_item record;
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
        'assigned_to_name', v_assignee_name,
        'list_id', p_list_id,
        'list_name', v_list_name,
        'name', v_item.name
      )
    );
  end loop;

  return v_count;
end $$;

create or replace function public.respond_to_assignment(p_item_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.assigned_to, l.house_id, l.name as list_name
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.assigned_to is distinct from v_uid then
    raise exception 'NOT_ASSIGNEE';
  end if;

  if p_accept then
    update public.grocery_items
       set assignment_response = 'accepted'
     where id = p_item_id;

    perform public.log_activity(
      v_item_rec.house_id, v_uid, 'grocery_item.assignment_accepted', 'grocery_item', p_item_id,
      jsonb_build_object(
        'list_id', v_item_rec.list_id,
        'list_name', v_item_rec.list_name,
        'name', v_item_rec.name
      )
    );
  else
    update public.grocery_items
       set assignment_response = 'declined',
           status = 'pending',
           assigned_to = null,
           assigned_by = null,
           assigned_at = null
     where id = p_item_id;

    perform public.log_activity(
      v_item_rec.house_id, v_uid, 'grocery_item.assignment_declined', 'grocery_item', p_item_id,
      jsonb_build_object(
        'list_id', v_item_rec.list_id,
        'list_name', v_item_rec.list_name,
        'name', v_item_rec.name
      )
    );
  end if;
end $$;

update public.activity_log as a
   set payload = a.payload || jsonb_build_object('list_name', l.name)
  from public.grocery_lists as l
 where a.type in (
         'grocery_item.assigned',
         'grocery_item.assignment_accepted',
         'grocery_item.assignment_declined'
       )
   and a.payload ? 'list_id'
   and l.id = (a.payload ->> 'list_id')::uuid
   and not a.payload ? 'list_name';

update public.activity_log as a
   set payload = a.payload || jsonb_build_object('assigned_to_name', p.display_name)
  from public.profiles as p
 where a.type = 'grocery_item.assigned'
   and a.payload ? 'assigned_to'
   and p.id = (a.payload ->> 'assigned_to')::uuid
   and not a.payload ? 'assigned_to_name';
