-- Expenses are independent financial records. A linked purchase or batch is only provenance:
-- deleting the item or list never removes the expense, and editing the expense never touches it.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  amount_paise int not null check (amount_paise > 0 and amount_paise <= 1000000000),
  category text not null check (category in (
    'rent', 'utilities', 'groceries', 'internet', 'household', 'food_dining', 'transport', 'other'
  )),
  note text check (note is null or char_length(note) between 1 and 500),
  spent_on date not null,
  split_method text not null check (split_method in ('equal', 'exact', 'percent', 'shares')),
  purchase_id uuid unique references public.grocery_purchases (id) on delete set null,
  batch_id uuid unique references public.grocery_purchase_batches (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (purchase_id is null or batch_id is null)
);

create index expenses_house_spent_idx
  on public.expenses (house_id, spent_on desc, created_at desc)
  where deleted_at is null;

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create table public.expense_payers (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount_paise int not null check (amount_paise > 0),
  primary key (expense_id, user_id)
);

-- `weight` is the value typed for exact, percent and shares splits, in hundredths.
create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  share_paise int not null check (share_paise >= 0),
  weight int check (weight is null or weight > 0),
  primary key (expense_id, user_id)
);

create index expense_payers_user_idx on public.expense_payers (user_id);
create index expense_shares_user_idx on public.expense_shares (user_id);

alter table public.expenses enable row level security;
alter table public.expense_payers enable row level security;
alter table public.expense_shares enable row level security;

revoke all on public.expenses, public.expense_payers, public.expense_shares
  from anon, authenticated;
grant select on public.expenses, public.expense_payers, public.expense_shares to authenticated;

create policy expenses_select on public.expenses
  for select to authenticated
  using (deleted_at is null and public.is_house_member(house_id));

create policy expense_payers_select on public.expense_payers
  for select to authenticated
  using (exists (
    select 1 from public.expenses e
     where e.id = expense_id and e.deleted_at is null and public.is_house_member(e.house_id)
  ));

create policy expense_shares_select on public.expense_shares
  for select to authenticated
  using (exists (
    select 1 from public.expenses e
     where e.id = expense_id and e.deleted_at is null and public.is_house_member(e.house_id)
  ));

create function public.normalize_expense_title(p_title text) returns text
language sql immutable set search_path = '' as $$
  select nullif(btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g')), '');
$$;

create function public.check_expense_fields(
  p_title text,
  p_amount_paise int,
  p_category text,
  p_note text,
  p_spent_on date,
  p_split_method text
) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_title is null or char_length(p_title) > 80 then raise exception 'INVALID_INPUT'; end if;
  if p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 1000000000 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_category is null or p_category not in (
    'rent', 'utilities', 'groceries', 'internet', 'household', 'food_dining', 'transport', 'other'
  ) then
    raise exception 'INVALID_INPUT';
  end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'INVALID_INPUT'; end if;
  if p_split_method is null or p_split_method not in ('equal', 'exact', 'percent', 'shares') then
    raise exception 'INVALID_INPUT';
  end if;
  -- One day of slack, so a client ahead of the server's UTC date can still record "today".
  if p_spent_on is null or p_spent_on > current_date + 1 or p_spent_on < date '2000-01-01' then
    raise exception 'INVALID_INPUT';
  end if;
end $$;

-- Replaces an expense's payers and shares. Everyone must be an active member, except people who
-- were already on this expense, so an old expense with a former member can still be edited.
create function public.write_expense_parts(
  p_expense_id uuid,
  p_house_id uuid,
  p_amount_paise int,
  p_split_method text,
  p_payers jsonb,
  p_shares jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_payer_count int;
  v_share_count int;
  v_ok boolean;
begin
  if jsonb_typeof(p_payers) is distinct from 'array'
     or jsonb_typeof(p_shares) is distinct from 'array' then
    raise exception 'INVALID_INPUT';
  end if;

  v_payer_count := jsonb_array_length(p_payers);
  v_share_count := jsonb_array_length(p_shares);
  if v_payer_count < 1 or v_payer_count > 100 or v_share_count < 1 or v_share_count > 100 then
    raise exception 'INVALID_INPUT';
  end if;

  begin
    select count(user_id) = v_payer_count
           and count(distinct user_id) = v_payer_count
           and coalesce(bool_and(amount_paise > 0), false)
           and coalesce(sum(amount_paise), 0) = p_amount_paise
      into v_ok
      from jsonb_to_recordset(p_payers) as x(user_id uuid, amount_paise int);
    if not v_ok then raise exception 'INVALID_INPUT'; end if;

    select count(user_id) = v_share_count
           and count(distinct user_id) = v_share_count
           and coalesce(bool_and(share_paise >= 0), false)
           and coalesce(bool_or(share_paise > 0), false)
           and coalesce(sum(share_paise), 0) = p_amount_paise
           and case when p_split_method = 'equal'
                    then bool_and(weight is null)
                    else coalesce(bool_and(weight > 0), false) end
      into v_ok
      from jsonb_to_recordset(p_shares) as x(user_id uuid, share_paise int, weight int);
    if not v_ok then raise exception 'INVALID_INPUT'; end if;
  exception
    when invalid_text_representation or numeric_value_out_of_range or datatype_mismatch then
      raise exception 'INVALID_INPUT';
  end;

  if exists (
    select 1
      from (
        select x.user_id from jsonb_to_recordset(p_payers) as x(user_id uuid)
        union
        select x.user_id from jsonb_to_recordset(p_shares) as x(user_id uuid)
      ) u
     where not exists (
         select 1 from public.house_members m
          where m.house_id = p_house_id and m.user_id = u.user_id and m.status = 'active'
       )
       and not exists (
         select 1 from public.expense_payers p
          where p.expense_id = p_expense_id and p.user_id = u.user_id
       )
       and not exists (
         select 1 from public.expense_shares s
          where s.expense_id = p_expense_id and s.user_id = u.user_id
       )
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  delete from public.expense_payers where expense_id = p_expense_id;
  delete from public.expense_shares where expense_id = p_expense_id;

  insert into public.expense_payers (expense_id, user_id, amount_paise)
  select p_expense_id, x.user_id, x.amount_paise
    from jsonb_to_recordset(p_payers) as x(user_id uuid, amount_paise int);

  insert into public.expense_shares (expense_id, user_id, share_paise, weight)
  select p_expense_id, x.user_id, x.share_paise, x.weight
    from jsonb_to_recordset(p_shares) as x(user_id uuid, share_paise int, weight int);
end $$;

-- Shared by create_expense and the mark-bought RPCs; callers check access first.
create function public.insert_expense(
  p_house_id uuid,
  p_actor uuid,
  p_title text,
  p_amount_paise int,
  p_category text,
  p_note text,
  p_spent_on date,
  p_split_method text,
  p_payers jsonb,
  p_shares jsonb,
  p_purchase_id uuid default null,
  p_batch_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_title text := public.normalize_expense_title(p_title);
  v_note text := nullif(btrim(p_note), '');
  v_id uuid;
begin
  perform public.check_expense_fields(
    v_title, p_amount_paise, p_category, v_note, p_spent_on, p_split_method
  );

  insert into public.expenses (
    house_id, title, amount_paise, category, note, spent_on, split_method,
    purchase_id, batch_id, created_by
  ) values (
    p_house_id, v_title, p_amount_paise, p_category, v_note, p_spent_on, p_split_method,
    p_purchase_id, p_batch_id, p_actor
  ) returning id into v_id;

  perform public.write_expense_parts(
    v_id, p_house_id, p_amount_paise, p_split_method, p_payers, p_shares
  );

  perform public.log_activity(
    p_house_id, p_actor, 'expense.created', 'expense', v_id,
    jsonb_build_object(
      'title', v_title,
      'amount_paise', p_amount_paise,
      'category', p_category,
      'source', case when p_purchase_id is not null then 'purchase'
                     when p_batch_id is not null then 'batch' end
    )
  );

  return v_id;
end $$;

create function public.create_expense(
  p_house_id uuid,
  p_title text,
  p_amount_paise int,
  p_category text,
  p_note text,
  p_spent_on date,
  p_split_method text,
  p_payers jsonb,
  p_shares jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;

  return public.insert_expense(
    p_house_id, v_uid, p_title, p_amount_paise, p_category, p_note, p_spent_on,
    p_split_method, p_payers, p_shares
  );
end $$;

create function public.can_manage_expense(p_expense_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.expenses e
     where e.id = p_expense_id
       and e.deleted_at is null
       and public.is_house_member(e.house_id)
       and (
         public.is_house_admin(e.house_id)
         or e.created_by = (select auth.uid())
         or exists (select 1 from public.expense_payers p
                     where p.expense_id = e.id and p.user_id = (select auth.uid()))
         or exists (select 1 from public.expense_shares s
                     where s.expense_id = e.id and s.user_id = (select auth.uid()))
       )
  );
$$;

create function public.update_expense(
  p_expense_id uuid,
  p_title text,
  p_amount_paise int,
  p_category text,
  p_note text,
  p_spent_on date,
  p_split_method text,
  p_payers jsonb,
  p_shares jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_title text := public.normalize_expense_title(p_title);
  v_note text := nullif(btrim(p_note), '');
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id into v_house_id
    from public.expenses
   where id = p_expense_id and deleted_at is null
     for update;

  if not found or not public.is_house_member(v_house_id) then raise exception 'NOT_FOUND'; end if;
  if not public.can_manage_expense(p_expense_id) then raise exception 'FORBIDDEN'; end if;

  perform public.check_expense_fields(
    v_title, p_amount_paise, p_category, v_note, p_spent_on, p_split_method
  );

  update public.expenses
     set title = v_title,
         amount_paise = p_amount_paise,
         category = p_category,
         note = v_note,
         spent_on = p_spent_on,
         split_method = p_split_method
   where id = p_expense_id;

  perform public.write_expense_parts(
    p_expense_id, v_house_id, p_amount_paise, p_split_method, p_payers, p_shares
  );

  perform public.log_activity(
    v_house_id, v_uid, 'expense.updated', 'expense', p_expense_id,
    jsonb_build_object('title', v_title, 'amount_paise', p_amount_paise, 'category', p_category)
  );
end $$;

create function public.delete_expense(p_expense_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_expense record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id, title, amount_paise, category into v_expense
    from public.expenses
   where id = p_expense_id and deleted_at is null
     for update;

  if not found or not public.is_house_member(v_expense.house_id) then
    raise exception 'NOT_FOUND';
  end if;
  if not public.can_manage_expense(p_expense_id) then raise exception 'FORBIDDEN'; end if;

  update public.expenses set deleted_at = now() where id = p_expense_id;

  perform public.log_activity(
    v_expense.house_id, v_uid, 'expense.deleted', 'expense', p_expense_id,
    jsonb_build_object(
      'title', v_expense.title,
      'amount_paise', v_expense.amount_paise,
      'category', v_expense.category
    )
  );
end $$;

revoke all on function
  public.normalize_expense_title(text),
  public.check_expense_fields(text, int, text, text, date, text),
  public.write_expense_parts(uuid, uuid, int, text, jsonb, jsonb),
  public.insert_expense(uuid, uuid, text, int, text, text, date, text, jsonb, jsonb, uuid, uuid),
  public.can_manage_expense(uuid)
  from public, anon, authenticated;

revoke all on function
  public.create_expense(uuid, text, int, text, text, date, text, jsonb, jsonb),
  public.update_expense(uuid, text, int, text, text, date, text, jsonb, jsonb),
  public.delete_expense(uuid)
  from public, anon;

grant execute on function
  public.create_expense(uuid, text, int, text, text, date, text, jsonb, jsonb),
  public.update_expense(uuid, text, int, text, text, date, text, jsonb, jsonb),
  public.delete_expense(uuid)
  to authenticated;
