-- Performance pass: denormalise grocery_items.house_id so realtime can filter by house, index the
-- foreign keys and filter columns that were scanned, evaluate membership once per statement in
-- RLS instead of once per row, and compute house nets in one pass.

-- grocery_items.house_id ---------------------------------------------------------------------

alter table public.grocery_items add column house_id uuid references public.houses (id) on delete cascade;

update public.grocery_items i
   set house_id = l.house_id
  from public.grocery_lists l
 where l.id = i.list_id;

alter table public.grocery_items alter column house_id set not null;

create index grocery_items_house_idx on public.grocery_items (house_id);

-- Always derived from the list, so a client can never set it and moves keep it in step.
create function public.set_grocery_item_house() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select l.house_id into new.house_id from public.grocery_lists l where l.id = new.list_id;
  return new;
end $$;

revoke all on function public.set_grocery_item_house() from public, anon, authenticated;

create trigger grocery_items_set_house
  before insert or update of list_id, house_id on public.grocery_items
  for each row
  execute function public.set_grocery_item_house();

-- Realtime sends DELETE events without RLS or filters, and with only the primary key, so clients
-- cannot tell which house a deleted item belonged to. Touching the parent list instead produces
-- an UPDATE on grocery_lists, which is house-filtered and RLS-checked.
create function public.touch_lists_of_deleted_items() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.grocery_lists l
     set updated_at = now()
   where l.id in (select distinct d.list_id from deleted d)
     and l.deleted_at is null;
  return null;
end $$;

revoke all on function public.touch_lists_of_deleted_items() from public, anon, authenticated;

create trigger grocery_items_touch_list_on_delete
  after delete on public.grocery_items
  referencing old table as deleted
  for each statement
  execute function public.touch_lists_of_deleted_items();

-- Indexes --------------------------------------------------------------------------------------

-- Embedded in every item fetch and joined by the grocery_purchases RLS policy.
create index grocery_purchases_item_idx on public.grocery_purchases (item_id);
create index activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index activity_log_actor_idx on public.activity_log (actor_id);
create index grocery_purchase_batches_house_idx on public.grocery_purchase_batches (house_id);
create index grocery_items_category_idx on public.grocery_items (category_id);
create index grocery_items_assigned_to_idx on public.grocery_items (assigned_to);
create index grocery_items_claimed_by_idx on public.grocery_items (claimed_by);
create index grocery_categories_house_idx on public.grocery_categories (house_id);
create index expenses_created_by_idx on public.expenses (created_by);
create index expenses_updated_by_idx on public.expenses (updated_by);

-- Membership evaluated once per statement --------------------------------------------------------

-- Each helper is wrapped in a scalar subquery inside the policies, which Postgres runs once per
-- statement (an InitPlan) rather than once per row as is_house_member(house_id) was.
create function public.my_house_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.house_id), '{}')
    from public.house_members m
    join public.houses h on h.id = m.house_id
   where m.user_id = (select auth.uid())
     and m.status = 'active'
     and h.deleted_at is null;
$$;

create function public.my_readable_list_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(l.id), '{}')
    from public.grocery_lists l
   where l.house_id = any (public.my_house_ids())
     and (l.visibility = 'shared' or l.created_by = (select auth.uid()))
     and l.deleted_at is null;
$$;

-- Text ids because activity payloads carry list ids as JSON strings. Matches by id regardless of
-- deleted_at so a deleted private list stays hidden too.
create function public.my_hidden_list_keys() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(l.id::text), '{}')
    from public.grocery_lists l
   where l.house_id = any (public.my_house_ids())
     and l.visibility = 'private'
     and l.created_by is distinct from (select auth.uid());
$$;

revoke all on function public.my_house_ids() from public, anon;
revoke all on function public.my_readable_list_ids() from public, anon;
revoke all on function public.my_hidden_list_keys() from public, anon;
grant execute on function public.my_house_ids() to authenticated;
grant execute on function public.my_readable_list_ids() to authenticated;
grant execute on function public.my_hidden_list_keys() to authenticated;

alter policy houses_select on public.houses
  using (id = any ((select public.my_house_ids())::uuid[]));

alter policy house_members_select on public.house_members
  using (user_id = (select auth.uid()) or house_id = any ((select public.my_house_ids())::uuid[]));

alter policy expenses_select on public.expenses
  using (deleted_at is null and house_id = any ((select public.my_house_ids())::uuid[]));

alter policy expense_payers_select on public.expense_payers
  using (exists (
    select 1 from public.expenses e
     where e.id = expense_payers.expense_id
       and e.deleted_at is null
       and e.house_id = any ((select public.my_house_ids())::uuid[])));

alter policy expense_shares_select on public.expense_shares
  using (exists (
    select 1 from public.expenses e
     where e.id = expense_shares.expense_id
       and e.deleted_at is null
       and e.house_id = any ((select public.my_house_ids())::uuid[])));

alter policy grocery_categories_select on public.grocery_categories
  using (house_id is null or house_id = any ((select public.my_house_ids())::uuid[]));

alter policy grocery_lists_select on public.grocery_lists
  using (
    house_id = any ((select public.my_house_ids())::uuid[])
    and (visibility = 'shared' or created_by = (select auth.uid()))
    and deleted_at is null
  );

alter policy grocery_items_select on public.grocery_items
  using (list_id = any ((select public.my_readable_list_ids())::uuid[]));

alter policy grocery_purchase_batches_select on public.grocery_purchase_batches
  using (list_id = any ((select public.my_readable_list_ids())::uuid[]));

alter policy grocery_purchases_select on public.grocery_purchases
  using (exists (
    select 1 from public.grocery_items i
     where i.id = grocery_purchases.item_id
       and i.list_id = any ((select public.my_readable_list_ids())::uuid[])));

alter policy activity_log_select on public.activity_log
  using (
    house_id = any ((select public.my_house_ids())::uuid[])
    and not (
      array[
        case when entity_type = 'grocery_list' then entity_id::text end,
        payload ->> 'list_id',
        payload ->> 'from_list_id',
        payload ->> 'to_list_id'
      ] && (select public.my_hidden_list_keys())
    )
  );

-- House nets in one pass -------------------------------------------------------------------------

-- Same result as summing expense_pair_balances per member (each pair is rounded before summing),
-- but scans the house's expenses once instead of once per member.
create or replace function public.house_member_nets(p_house_id uuid)
returns table (user_id uuid, display_name text, avatar_url text, net_paise bigint, is_self boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;
  return query
  with people as (
    select m.user_id, bool_or(m.status = 'active') as active
      from public.house_members m
     where m.house_id = p_house_id
     group by m.user_id
  ),
  owed as (
    select s.user_id as debtor,
           p.user_id as creditor,
           s.share_paise::numeric * p.amount_paise / e.amount_paise as amount
      from public.expenses e
      join public.expense_shares s on s.expense_id = e.id
      join public.expense_payers p on p.expense_id = e.id
     where e.house_id = p_house_id
       and e.deleted_at is null
       and s.user_id <> p.user_id
  ),
  pairs as (
    select x.member, round(sum(x.signed))::bigint as net
      from (
        select o.debtor as member, o.creditor as other, -o.amount as signed from owed o
        union all
        select o.creditor, o.debtor, o.amount from owed o
      ) x
     group by x.member, x.other
  ),
  nets as (
    select people.user_id, people.active,
           coalesce((select sum(pairs.net) from pairs where pairs.member = people.user_id), 0)::bigint
             as net_paise
      from people
  )
  select nets.user_id, pr.display_name, pr.avatar_url, nets.net_paise, nets.user_id = v_uid
    from nets
    left join public.profiles pr on pr.id = nets.user_id
   where nets.active or nets.net_paise <> 0
   order by nets.user_id;
end $$;

-- Housekeeping -----------------------------------------------------------------------------------

-- The rate limit only looks back ten minutes, so a day of attempts is plenty to keep.
create extension if not exists pg_cron;

select cron.schedule(
  'prune-invite-attempts',
  '17 3 * * *',
  $$delete from public.invite_attempts where created_at < now() - interval '1 day'$$
);
