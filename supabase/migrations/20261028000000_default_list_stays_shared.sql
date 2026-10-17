-- A house must always have a shared default list, so the default list can never be private.

update public.grocery_lists
   set visibility = 'shared'
 where is_default = true and visibility = 'private';

alter table public.grocery_lists
  add constraint grocery_lists_default_is_shared
  check (not is_default or visibility = 'shared');

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

  if not public.is_house_member(v_list.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_is_admin   := public.is_house_admin(v_list.house_id);
  v_is_creator := v_list.created_by = v_uid;

  if (p_name is not null or p_icon is not null or p_visibility is not null) then
    if not (v_is_admin or v_is_creator) then
      raise exception 'FORBIDDEN';
    end if;
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
