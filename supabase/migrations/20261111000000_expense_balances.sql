-- Within an expense, each sharer owes each payer `share * paid / amount`. Pairs are summed exactly
-- and rounded once, so the two sides of a pair always mirror each other to the paisa.
create function public.expense_pair_balances(p_house_id uuid, p_user_id uuid)
returns table (other_id uuid, net_paise bigint)
language sql stable security definer set search_path = '' as $$
  with owed as (
    select s.user_id as debtor,
           p.user_id as creditor,
           s.share_paise::numeric * p.amount_paise / e.amount_paise as amount
      from public.expenses e
      join public.expense_shares s on s.expense_id = e.id
      join public.expense_payers p on p.expense_id = e.id
     where e.house_id = p_house_id
       and e.deleted_at is null
       and s.user_id <> p.user_id
       and (s.user_id = p_user_id or p.user_id = p_user_id)
  )
  select other_id, round(sum(signed))::bigint as net_paise
    from (
      select creditor as other_id, -amount as signed from owed where debtor = p_user_id
      union all
      select debtor as other_id, amount as signed from owed where creditor = p_user_id
    ) x
   group by other_id;
$$;

create or replace function public.user_has_outstanding_balance(p_house_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.expense_pair_balances(p_house_id, p_user_id) where net_paise <> 0
  );
$$;

-- Lists every other active member, plus former members the caller still has a balance with.
create function public.house_balances(p_house_id uuid)
returns table (user_id uuid, display_name text, avatar_url text, net_paise bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;

  return query
  with balances as (
    select b.other_id, b.net_paise from public.expense_pair_balances(p_house_id, v_uid) b
  ),
  people as (
    select m.user_id from public.house_members m
     where m.house_id = p_house_id and m.status = 'active' and m.user_id <> v_uid
    union
    select b.other_id from balances b where b.net_paise <> 0
  )
  select people.user_id, pr.display_name, pr.avatar_url, coalesce(b.net_paise, 0)::bigint
    from people
    left join balances b on b.other_id = people.user_id
    left join public.profiles pr on pr.id = people.user_id
   order by abs(coalesce(b.net_paise, 0)) desc, pr.display_name nulls last;
end $$;

-- Without settle up, the flags would let a balance silently disappear, so they no longer bypass
-- the check. The signatures stay so existing callers keep working.
create or replace function public.remove_member(
  p_house_id uuid, p_user_id uuid, p_keep_debt boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_target public.house_members;
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

  perform public.log_activity(p_house_id, v_uid, 'member_removed', 'member', p_user_id,
                              jsonb_build_object('keep_debt', false));
end $$;

create or replace function public.leave_house(
  p_house_id uuid, p_acknowledge_debt boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_me public.house_members;
  v_other_admins int;
  v_others int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  perform 1 from public.houses where id = p_house_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_me from public.house_members
   where house_id = p_house_id and user_id = v_uid and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  select count(*) filter (where role = 'admin'), count(*)
    into v_other_admins, v_others
    from public.house_members
   where house_id = p_house_id and status = 'active' and user_id <> v_uid;

  if v_others > 0 and v_me.role = 'admin' and v_other_admins = 0 then
    raise exception 'LAST_ADMIN';
  end if;

  if public.user_has_outstanding_balance(p_house_id, v_uid) then
    raise exception 'OUTSTANDING_BALANCE';
  end if;

  update public.house_members set status = 'left', left_at = now() where id = v_me.id;

  if v_others = 0 then
    update public.houses set deleted_at = now() where id = p_house_id;
  end if;

  perform public.log_activity(p_house_id, v_uid, 'member_left', 'member', v_uid);
end $$;

revoke all on function public.expense_pair_balances(uuid, uuid)
  from public, anon, authenticated;

revoke all on function public.house_balances(uuid) from public, anon;
grant execute on function public.house_balances(uuid) to authenticated;
