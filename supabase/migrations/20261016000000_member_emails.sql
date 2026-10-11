-- Emails live in auth.users, which clients cannot read. Admins may see the address of anyone in
-- their house; everyone else sees only their own.
create function public.list_member_emails(p_house_id uuid)
returns table (user_id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text
    from public.house_members m
    join auth.users u on u.id = m.user_id
   where m.house_id = p_house_id
     and m.status = 'active'
     and (public.is_house_admin(p_house_id)
          or (m.user_id = (select auth.uid()) and public.is_house_member(p_house_id)));
$$;

revoke all on function public.list_member_emails(uuid) from public, anon;
grant execute on function public.list_member_emails(uuid) to authenticated;
