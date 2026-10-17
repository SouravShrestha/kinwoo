-- Lists are either active or soft-deleted. Archiving is removed: archived lists become deleted.

update public.grocery_lists
   set deleted_at = archived_at
 where archived_at is not null
   and deleted_at is null;

update public.activity_log
   set type = 'grocery_list.deleted'
 where type = 'grocery_list.archived';

drop index if exists public.grocery_lists_house_name_active_idx;
create unique index grocery_lists_house_name_active_idx
  on public.grocery_lists (house_id, name)
  where deleted_at is null;

create or replace function public.can_read_list(p_list_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.grocery_lists l
    where l.id = p_list_id
      and public.is_house_member(l.house_id)
      and (l.visibility = 'shared' or l.created_by = (select auth.uid()))
      and l.deleted_at is null
  );
$$;

drop function if exists public.archive_grocery_list(uuid);

alter table public.grocery_lists drop column archived_at;
