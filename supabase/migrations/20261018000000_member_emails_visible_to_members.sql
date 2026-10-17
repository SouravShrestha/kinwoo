-- Every member of a house may see the email of every other active member.
create or replace function public.list_member_emails(p_house_id uuid)
returns table (user_id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text
    from public.house_members m
    join auth.users u on u.id = m.user_id
   where m.house_id = p_house_id
     and m.status = 'active'
     and public.is_house_member(p_house_id);
$$;
