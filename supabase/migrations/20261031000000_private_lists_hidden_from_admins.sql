-- A private list is visible to its creator only, admins included. Every list and item write path now
-- gates on can_read_list instead of plain house membership, and activity entries that reference
-- someone else's private list are hidden.

-- Left over from 20261023/20261024; create or replace with a new signature adds an overload
-- instead of replacing, so this stale one stayed callable with the pre-visibility rules.
drop function if exists public.update_grocery_list(uuid, text, text, int, boolean);

create or replace function public.update_grocery_list(
  p_list_id     uuid,
  p_name        text    default null,
  p_icon        text    default null,
  p_visibility  public.list_visibility default null,
  p_position    int     default null,
  p_is_default  boolean default null
) returns public.grocery_lists
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_list public.grocery_lists;
  v_is_admin boolean;
  v_is_creator boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists
   where id = p_list_id and deleted_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_list.id) then
    raise exception 'FORBIDDEN';
  end if;

  v_is_admin   := public.is_house_admin(v_list.house_id);
  v_is_creator := v_list.created_by = v_uid;

  if (p_name is not null or p_icon is not null or p_visibility is not null) then
    if not (v_is_admin or v_is_creator) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  if p_visibility is not null and not v_is_creator then
    raise exception 'FORBIDDEN';
  end if;

  if p_is_default = true and not v_is_admin then
    raise exception 'FORBIDDEN';
  end if;

  if (p_position is not null or p_is_default is not null) then
    if not (v_is_admin or v_list.visibility = 'shared' or v_is_creator) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  if p_name is not null and char_length(btrim(p_name)) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  if p_visibility = 'private' and v_list.is_default then
    raise exception 'DEFAULT_LIST_MUST_BE_PUBLIC';
  end if;

  if p_visibility = 'private' and v_list.visibility <> 'private' then
    if exists (
      select 1 from public.grocery_items i
       where i.list_id = v_list.id
         and i.status = 'assigned'
         and i.assigned_to is not null
         and i.assigned_to <> v_list.created_by
    ) then
      raise exception 'LIST_HAS_ASSIGNED_ITEMS';
    end if;
  end if;

  if p_is_default is not null then
    if p_is_default = false and v_list.is_default then
      raise exception 'FORBIDDEN';
    end if;
    if p_is_default = true then
      if coalesce(p_visibility, v_list.visibility) = 'private' then
        raise exception 'FORBIDDEN';
      end if;
    end if;
  end if;

  if coalesce(p_is_default, false) = true and not v_list.is_default then
    update public.grocery_lists
       set is_default = false
     where house_id = v_list.house_id and is_default = true;
  end if;

  update public.grocery_lists
     set name       = case when p_name       is not null then btrim(p_name) else name end,
         icon       = case when p_icon       is not null
                           then coalesce(nullif(btrim(p_icon), ''), icon)
                           else icon end,
         visibility = case when p_visibility is not null then p_visibility else visibility end,
         position   = case when p_position   is not null then p_position   else position end,
         is_default = case when p_is_default is not null then p_is_default else is_default end
   where id = p_list_id
  returning * into v_list;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.updated', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name, 'visibility', v_list.visibility)
  );

  return v_list;
end $$;

create or replace function public.delete_grocery_list(p_list_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists
   where id = p_list_id and deleted_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_list.id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_list.is_default then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_list.house_id) or v_list.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.deleted', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name, 'visibility', v_list.visibility)
  );

  update public.grocery_lists
     set deleted_at = now()
   where id = p_list_id;
end $$;

create or replace function public.update_grocery_item(
  p_item_id uuid,
  p_name text default null,
  p_quantity numeric default null,
  p_unit text default null,
  p_category_id uuid default null,
  p_urgency text default null,
  p_note text default null
) returns public.grocery_items
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.grocery_items;
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_item from public.grocery_items where id = p_item_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_list from public.grocery_lists where id = v_item.list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_list.id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (v_item.created_by = v_uid or v_item.claimed_by = v_uid or public.is_house_admin(v_list.house_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is not null and char_length(btrim(p_name)) not between 1 and 100 then
    raise exception 'INVALID_NAME';
  end if;

  if p_urgency is not null
     and p_urgency not in ('now', 'soon', 'today', 'tomorrow', 'this_week', 'whenever') then
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

  update public.grocery_items
     set name = case when p_name is not null then btrim(p_name) else name end,
         quantity = case when p_quantity is not null then p_quantity else quantity end,
         unit = case when p_unit is not null then nullif(btrim(p_unit), '') else unit end,
         category_id = case when p_category_id is not null then p_category_id else category_id end,
         urgency = case when p_urgency is not null then p_urgency::public.item_urgency else urgency end,
         note = case when p_note is not null then nullif(p_note, '') else note end
   where id = p_item_id
  returning * into v_item;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_item.updated', 'grocery_item', v_item.id,
    jsonb_build_object('list_id', v_item.list_id, 'name', v_item.name)
  );

  return v_item;
end $$;

create or replace function public.unclaim_grocery_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.claimed_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.claimed_by is distinct from v_uid then
    raise exception 'NOT_CLAIMER';
  end if;

  update public.grocery_items
     set status = 'pending',
         claimed_by = null,
         claimed_at = null
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.unclaimed', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );
end $$;

create or replace function public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
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

create or replace function public.respond_to_assignment(p_item_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.assigned_to, l.house_id
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
      jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
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
      jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
    );
  end if;
end $$;

create or replace function public.cancel_grocery_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set status = 'cancelled'
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.cancelled', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );
end $$;

create or replace function public.delete_grocery_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.status, i.created_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id
     and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  -- Bought items are financial records; they cannot be deleted.
  if v_item_rec.status = 'bought' then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.deleted', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );

  delete from public.grocery_items where id = p_item_id;
end $$;

-- Matches by id regardless of deleted_at so a deleted private list stays hidden too.
create function public.activity_touches_hidden_list(
  p_entity_type text, p_entity_id uuid, p_payload jsonb
) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.grocery_lists l
    where l.visibility = 'private'
      and l.created_by is distinct from (select auth.uid())
      and l.id::text in (
        case when p_entity_type = 'grocery_list' then p_entity_id::text end,
        p_payload ->> 'list_id',
        p_payload ->> 'from_list_id',
        p_payload ->> 'to_list_id'
      )
  );
$$;

revoke all on function public.activity_touches_hidden_list(text, uuid, jsonb) from public, anon;
grant execute on function public.activity_touches_hidden_list(text, uuid, jsonb) to authenticated;

drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log
  for select to authenticated
  using (
    public.is_house_member(house_id)
    and not public.activity_touches_hidden_list(entity_type, entity_id, payload)
  );
