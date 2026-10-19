create or replace function public.set_member_role(
  p_house_id uuid, p_user_id uuid, p_role public.house_role
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_target public.house_members; v_member_name text;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  -- Serialises admin changes so two demotions cannot both pass the last-admin check.
  perform 1 from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  if v_target.role = p_role then return; end if;

  if v_target.role = 'admin' and p_role = 'member' then
    if not exists (select 1 from public.house_members
                    where house_id = p_house_id and status = 'active'
                      and role = 'admin' and user_id <> p_user_id) then
      raise exception 'LAST_ADMIN';
    end if;
  end if;

  update public.house_members set role = p_role where id = v_target.id;

  select display_name into v_member_name from public.profiles where id = p_user_id;

  perform public.log_activity(p_house_id, auth.uid(), 'role_changed', 'member', p_user_id,
                              jsonb_build_object('from', v_target.role, 'to', p_role,
                                                 'member_name', v_member_name));
end $$;

create or replace function public.remove_member(
  p_house_id uuid, p_user_id uuid, p_keep_debt boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_target public.house_members;
  v_member_name text;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if p_user_id = v_uid then raise exception 'USE_LEAVE_HOUSE'; end if;

  perform 1 from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  if public.user_has_outstanding_balance(p_house_id, p_user_id) then
    raise exception 'OUTSTANDING_BALANCE';
  end if;

  update public.house_members
     set status = 'removed', left_at = now(), removed_by = v_uid
   where id = v_target.id;

  select display_name into v_member_name from public.profiles where id = p_user_id;

  perform public.log_activity(p_house_id, v_uid, 'member_removed', 'member', p_user_id,
                              jsonb_build_object('keep_debt', false,
                                                 'member_name', v_member_name));
end $$;

create or replace function public.move_grocery_item(p_item_id uuid, p_target_list_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.grocery_items;
  v_src_list public.grocery_lists;
  v_target_list public.grocery_lists;
  v_pos int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_item from public.grocery_items where id = p_item_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_src_list from public.grocery_lists where id = v_item.list_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_target_list from public.grocery_lists where id = p_target_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_src_list.house_id <> v_target_list.house_id then
    raise exception 'WRONG_HOUSE';
  end if;
  if not (public.can_read_list(v_src_list.id) and public.can_read_list(v_target_list.id)) then
    raise exception 'FORBIDDEN';
  end if;
  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_items
   where list_id = p_target_list_id;
  update public.grocery_items
     set list_id = p_target_list_id,
         position = v_pos
   where id = p_item_id;
  perform public.log_activity(
    v_src_list.house_id, v_uid, 'grocery_item.moved', 'grocery_item', p_item_id,
    jsonb_build_object(
      'from_list_id', v_src_list.id,
      'to_list_id', p_target_list_id,
      'list_name', v_target_list.name,
      'name', v_item.name
    )
  );
end $$;

update public.activity_log as a
   set payload = a.payload || jsonb_build_object('member_name', p.display_name)
  from public.profiles as p
 where a.type in ('member_removed', 'role_changed')
   and p.id = a.entity_id
   and not a.payload ? 'member_name';

update public.activity_log as a
   set payload = a.payload || jsonb_build_object('list_name', l.name)
  from public.grocery_lists as l
 where a.type = 'grocery_item.moved'
   and a.payload ? 'to_list_id'
   and l.id = (a.payload ->> 'to_list_id')::uuid
   and not a.payload ? 'list_name';
