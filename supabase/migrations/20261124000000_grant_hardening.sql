-- Every other table revokes Supabase's default grants before granting back what it needs; this one
-- only added SELECT, leaving INSERT/UPDATE/DELETE/TRUNCATE granted and RLS as the only guard.
revoke all on public.house_invited_emails from anon, authenticated;
grant select on public.house_invited_emails to authenticated;

-- The activity_log policy needs EXECUTE on this helper, so it stays callable directly. Limiting it
-- to the caller's own houses stops it answering "is this UUID someone's private list?" for any
-- house, and comparing uuids (not text) lets the lookup use the grocery_lists primary key.
create or replace function public.activity_touches_hidden_list(
  p_entity_type text, p_entity_id uuid, p_payload jsonb
) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.grocery_lists l
    where l.id = any (array(
            select v::uuid
              from unnest(array[
                     case when p_entity_type = 'grocery_list' then p_entity_id::text end,
                     p_payload ->> 'list_id',
                     p_payload ->> 'from_list_id',
                     p_payload ->> 'to_list_id'
                   ]) as v
             where v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
      and l.visibility = 'private'
      and l.created_by is distinct from (select auth.uid())
      and public.is_house_member(l.house_id)
  );
$$;
