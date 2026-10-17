-- Adjust list permissions:
--   * Setting/clearing the default flag is allowed for anyone who can edit the
--     list (any housemate on a shared list, or the owner of a private one),
--     not admins only.
--   * Archiving and deleting stay restricted to a house admin or the list's
--     creator.
-- List visibility remains fixed at creation and is not editable.

create or replace function public.update_grocery_list(
  p_list_id uuid,
  p_name text default null,
  p_icon text default null,
  p_position int default null,
  p_is_default boolean default null
) returns public.grocery_lists
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_list.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  -- A shared list is editable by any housemate; a private list only by its
  -- owner. Admins can edit either.
  if not (public.is_house_admin(v_list.house_id)
          or v_list.visibility = 'shared'
          or v_list.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is not null then
    if char_length(btrim(p_name)) not between 1 and 60 then
      raise exception 'INVALID_NAME';
    end if;
  end if;

  if p_is_default is not null then
    -- Exactly one default must exist, so unsetting is only possible by promoting
    -- another list.
    if p_is_default = false and v_list.is_default then
      raise exception 'FORBIDDEN';
    end if;
    if p_is_default = true and v_list.visibility = 'private' then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  -- Promote this list to default: demote the current default first so the
  -- single-default unique index is never violated mid-update.
  if coalesce(p_is_default, false) = true and not v_list.is_default then
    update public.grocery_lists
       set is_default = false
     where house_id = v_list.house_id and is_default = true;
  end if;

  update public.grocery_lists
     set name = case when p_name is not null then btrim(p_name) else name end,
         icon = case when p_icon is not null then coalesce(nullif(btrim(p_icon), ''), icon) else icon end,
         position = case when p_position is not null then p_position else position end,
         is_default = case when p_is_default is not null then p_is_default else is_default end
   where id = p_list_id
  returning * into v_list;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.updated', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name)
  );

  return v_list;
end $$;

create or replace function public.delete_grocery_list(p_list_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_list.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_list.house_id) or v_list.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  if v_list.is_default then
    raise exception 'FORBIDDEN';
  end if;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.deleted', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name)
  );

  delete from public.grocery_lists where id = p_list_id;
end $$;

create or replace function public.archive_grocery_list(p_list_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
  v_default_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_list.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_list.house_id) or v_list.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  if v_list.is_default then
    raise exception 'FORBIDDEN';
  end if;

  select id into v_default_id
    from public.grocery_lists
   where house_id = v_list.house_id and is_default = true and archived_at is null;

  if v_default_id is null then
    raise exception 'NOT_FOUND';
  end if;

  update public.grocery_items
     set list_id = v_default_id
   where list_id = p_list_id and status = 'pending';

  update public.grocery_lists
     set archived_at = now()
   where id = p_list_id;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.archived', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name)
  );
end $$;
