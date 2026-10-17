-- Lists lifecycle rules:
--   * Soft-delete via `deleted_at` (separate from `archived_at`).
--   * `grocery_purchases` no longer cascades when an item is deleted; purchases are financial
--     records and must outlive their linked items.
--   * Visibility is now mutable: creator or Admin may change it after creation.
--   * Rename (name/icon) restricted to creator or Admin; any housemate may still change
--     `position` and `is_default` on a shared list.
--   * New `delete_grocery_item` RPC: creator or Admin, blocked on status = 'bought'.

-- ─── 1. Schema changes ────────────────────────────────────────────────────────

-- Add deleted_at to grocery_lists (distinct from archived_at).
alter table public.grocery_lists
  add column if not exists deleted_at timestamptz;

-- Purchases must survive item deletion. Drop the CASCADE FK and replace with RESTRICT.
alter table public.grocery_purchases
  drop constraint grocery_purchases_item_id_fkey,
  add constraint grocery_purchases_item_id_fkey
    foreign key (item_id) references public.grocery_items (id)
    on delete restrict;

-- ─── 2. RLS: exclude deleted lists everywhere ─────────────────────────────────

-- can_read_list must also hide deleted lists.
create or replace function public.can_read_list(p_list_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.grocery_lists l
    where l.id = p_list_id
      and public.is_house_member(l.house_id)
      and (l.visibility = 'shared' or l.created_by = (select auth.uid()))
      and l.archived_at is null
      and l.deleted_at is null
  );
$$;

-- Exclude deleted lists from the select policy.
drop policy if exists grocery_lists_select on public.grocery_lists;
create policy grocery_lists_select on public.grocery_lists
  for select to authenticated
  using (
    public.is_house_member(house_id)
    and (visibility = 'shared' or created_by = (select auth.uid()))
    and deleted_at is null
  );

-- ─── 3. update_grocery_list — split rename from metadata edits ────────────────
--
-- Before this migration the function allowed any housemate to rename a shared
-- list. The new rules are:
--   * name / icon / visibility → creator or Admin only.
--   * position / is_default    → any active housemate (shared list) or creator (private).
--
-- We also add `p_visibility` to support Shared ↔ Private toggling.

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

  -- name / icon / visibility: creator or Admin only.
  if (p_name is not null or p_icon is not null or p_visibility is not null) then
    if not (v_is_admin or v_is_creator) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  -- position / is_default: any housemate on a shared list, or creator on a private list.
  if (p_position is not null or p_is_default is not null) then
    if not (v_is_admin or v_list.visibility = 'shared' or v_is_creator) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  -- Validate name length.
  if p_name is not null and char_length(btrim(p_name)) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  -- is_default guards.
  if p_is_default is not null then
    if p_is_default = false and v_list.is_default then
      raise exception 'FORBIDDEN';
    end if;
    -- Promoting a private list to default is not allowed.
    if p_is_default = true then
      -- Use new visibility if being changed simultaneously, else existing.
      if coalesce(p_visibility, v_list.visibility) = 'private' then
        raise exception 'FORBIDDEN';
      end if;
    end if;
  end if;

  -- Promote to default: demote the current default first.
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

-- ─── 4. delete_grocery_list — soft-delete ─────────────────────────────────────
--
-- Rules:
--   * Shared list: creator or Admin.
--   * Private list: creator only (Admin cannot delete another housemate's private list).
--   * Default list: never deletable.
--   * Sets deleted_at; does NOT touch grocery_items or grocery_purchases.

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

  if not public.is_house_member(v_list.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_list.is_default then
    raise exception 'FORBIDDEN';
  end if;

  -- Shared list: creator or Admin.
  -- Private list: creator only (Admin gets no special access to others' private lists).
  if v_list.visibility = 'shared' then
    if not (public.is_house_admin(v_list.house_id) or v_list.created_by = v_uid) then
      raise exception 'FORBIDDEN';
    end if;
  else
    if v_list.created_by != v_uid then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.deleted', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name, 'visibility', v_list.visibility)
  );

  update public.grocery_lists
     set deleted_at = now()
   where id = p_list_id;
end $$;

-- ─── 5. archive_grocery_list — restrict to creator or Admin ───────────────────

create or replace function public.archive_grocery_list(p_list_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid       uuid := auth.uid();
  v_list      public.grocery_lists;
  v_default_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists
   where id = p_list_id and deleted_at is null;
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
   where house_id = v_list.house_id and is_default = true
     and archived_at is null and deleted_at is null;

  if v_default_id is null then
    raise exception 'NOT_FOUND';
  end if;

  -- Migrate pending items to the default list.
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

-- ─── 6. delete_grocery_item — new RPC ─────────────────────────────────────────
--
-- Rules:
--   * Bought items cannot be deleted (status = 'bought' → FORBIDDEN).
--   * Creator of the item or Admin may delete pending / claimed / assigned / cancelled items.

create function public.delete_grocery_item(p_item_id uuid) returns void
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

  if not public.is_house_member(v_item_rec.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  -- Bought items are financial records; they cannot be deleted.
  if v_item_rec.status = 'bought' then
    raise exception 'FORBIDDEN';
  end if;

  -- Only the item's creator or a house Admin may delete it.
  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.deleted', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );

  delete from public.grocery_items where id = p_item_id;
end $$;

-- ─── 7. Grants ────────────────────────────────────────────────────────────────

revoke all on function
  public.update_grocery_list(uuid, text, text, public.list_visibility, int, boolean),
  public.delete_grocery_list(uuid),
  public.archive_grocery_list(uuid),
  public.delete_grocery_item(uuid)
  from public, anon;

grant execute on function
  public.update_grocery_list(uuid, text, text, public.list_visibility, int, boolean),
  public.delete_grocery_list(uuid),
  public.archive_grocery_list(uuid),
  public.delete_grocery_item(uuid)
  to authenticated;
