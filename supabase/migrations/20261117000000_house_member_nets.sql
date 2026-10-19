-- Each member's net is the sum of their rounded pair balances, so it matches what house_balances
-- shows them and the nets across the house add up to exactly zero.
create function public.house_member_nets(p_house_id uuid)
returns table (user_id uuid, display_name text, avatar_url text, net_paise bigint, is_self boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;
  return query
  with people as (
    select distinct m.user_id, bool_or(m.status = 'active') over (partition by m.user_id) as active
      from public.house_members m
     where m.house_id = p_house_id
  ),
  nets as (
    select people.user_id, people.active,
           coalesce((select sum(b.net_paise)
                       from public.expense_pair_balances(p_house_id, people.user_id) b), 0)::bigint
             as net_paise
      from people
  )
  select nets.user_id, pr.display_name, pr.avatar_url, nets.net_paise, nets.user_id = v_uid
    from nets
    left join public.profiles pr on pr.id = nets.user_id
   where nets.active or nets.net_paise <> 0
   order by nets.user_id;
end $$;

revoke all on function public.house_member_nets(uuid) from public, anon;
grant execute on function public.house_member_nets(uuid) to authenticated;
