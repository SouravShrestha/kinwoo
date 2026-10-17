-- Grocery lists, categories, items, purchases, RLS and RPCs.

create type public.item_status as enum ('pending', 'claimed', 'assigned', 'bought', 'cancelled');
create type public.item_urgency as enum ('today', 'this_week', 'whenever');
create type public.list_visibility as enum ('shared', 'private');

create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default '🛒',
  position int not null default 0,
  visibility public.list_visibility not null default 'shared',
  is_default boolean not null default false,
  archived_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index grocery_lists_house_name_active_idx
  on public.grocery_lists (house_id, name)
  where archived_at is null;

create unique index grocery_lists_one_default_idx
  on public.grocery_lists (house_id)
  where is_default = true;

create trigger grocery_lists_set_updated_at
  before update on public.grocery_lists
  for each row execute function public.set_updated_at();

create table public.grocery_categories (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references public.houses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create unique index grocery_categories_house_name_idx
  on public.grocery_categories (coalesce(house_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.grocery_lists (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  quantity numeric(10, 2),
  unit text check (unit is null or char_length(unit) <= 20),
  category_id uuid references public.grocery_categories (id) on delete set null,
  urgency public.item_urgency not null default 'whenever',
  status public.item_status not null default 'pending',
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz,
  assignment_response text check (assignment_response is null or assignment_response in ('accepted', 'declined')),
  note text check (note is null or char_length(note) <= 500),
  idempotency_key text,
  position int not null default 0,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index grocery_items_list_idempotency_idx
  on public.grocery_items (list_id, idempotency_key)
  where idempotency_key is not null;

create index grocery_items_list_status_idx
  on public.grocery_items (list_id, status);

create trigger grocery_items_set_updated_at
  before update on public.grocery_items
  for each row execute function public.set_updated_at();

create table public.grocery_purchases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.grocery_items (id) on delete cascade,
  bought_by uuid not null references public.profiles (id),
  quantity numeric(10, 2),
  unit text check (unit is null or char_length(unit) <= 20),
  price_paise int check (price_paise is null or price_paise >= 0),
  store text check (store is null or char_length(store) <= 100),
  bought_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.grocery_lists enable row level security;
alter table public.grocery_categories enable row level security;
alter table public.grocery_items enable row level security;
alter table public.grocery_purchases enable row level security;

revoke all on public.grocery_lists, public.grocery_categories,
              public.grocery_items, public.grocery_purchases
  from anon, authenticated;

grant select on public.grocery_lists, public.grocery_categories,
                public.grocery_items, public.grocery_purchases
  to authenticated;

create function public.can_read_list(p_list_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.grocery_lists l
    where l.id = p_list_id
      and public.is_house_member(l.house_id)
      and (l.visibility = 'shared' or l.created_by = (select auth.uid()))
      and l.archived_at is null
  );
$$;

create policy grocery_lists_select on public.grocery_lists
  for select to authenticated
  using (
    public.is_house_member(house_id)
    and (visibility = 'shared' or created_by = (select auth.uid()))
  );

create policy grocery_categories_select on public.grocery_categories
  for select to authenticated
  using (house_id is null or public.is_house_member(house_id));

create policy grocery_items_select on public.grocery_items
  for select to authenticated
  using (public.can_read_list(list_id));

create policy grocery_purchases_select on public.grocery_purchases
  for select to authenticated
  using (
    exists (
      select 1 from public.grocery_items i
      where i.id = grocery_purchases.item_id
        and public.can_read_list(i.list_id)
    )
  );

insert into public.grocery_categories (id, house_id, name, position) values
  (gen_random_uuid(), null, 'Fruits & Vegetables', 1),
  (gen_random_uuid(), null, 'Dairy', 2),
  (gen_random_uuid(), null, 'Meat & Fish', 3),
  (gen_random_uuid(), null, 'Bakery', 4),
  (gen_random_uuid(), null, 'Snacks', 5),
  (gen_random_uuid(), null, 'Beverages', 6),
  (gen_random_uuid(), null, 'Household', 7),
  (gen_random_uuid(), null, 'Personal Care', 8),
  (gen_random_uuid(), null, 'Other', 9);

insert into public.grocery_lists (house_id, name, icon, position, visibility, is_default, created_by)
select h.id, 'Groceries', '🛒', 0, 'shared', true, h.created_by
from public.houses h
where h.deleted_at is null
  and not exists (
    select 1 from public.grocery_lists l where l.house_id = h.id and l.is_default = true
  );

create function public.create_grocery_list(
  p_house_id uuid,
  p_name text,
  p_icon text default '🛒',
  p_visibility text default 'shared'
) returns public.grocery_lists
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_pos int;
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if not public.is_house_member(p_house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  if p_visibility not in ('shared', 'private') then
    raise exception 'INVALID_INPUT';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_lists
   where house_id = p_house_id;

  insert into public.grocery_lists (
    house_id, name, icon, position, visibility, is_default, created_by
  ) values (
    p_house_id,
    btrim(p_name),
    coalesce(nullif(btrim(p_icon), ''), '🛒'),
    v_pos,
    p_visibility::public.list_visibility,
    false,
    v_uid
  ) returning * into v_list;

  perform public.log_activity(
    p_house_id, v_uid, 'grocery_list.created', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name)
  );

  return v_list;
end $$;

create function public.update_grocery_list(
  p_list_id uuid,
  p_name text default null,
  p_icon text default null,
  p_position int default null
) returns public.grocery_lists
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_list.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_list.house_id) or v_list.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is not null then
    if char_length(btrim(p_name)) not between 1 and 60 then
      raise exception 'INVALID_NAME';
    end if;
    if btrim(p_name) <> v_list.name and v_list.is_default then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  update public.grocery_lists
     set name = case when p_name is not null then btrim(p_name) else name end,
         icon = case when p_icon is not null then coalesce(nullif(btrim(p_icon), ''), icon) else icon end,
         position = case when p_position is not null then p_position else position end
   where id = p_list_id
  returning * into v_list;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.updated', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name)
  );

  return v_list;
end $$;

create function public.archive_grocery_list(p_list_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
  v_default_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
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
   where house_id = v_list.house_id and is_default = true and archived_at is null;

  if v_default_id is null then
    raise exception 'NOT_FOUND';
  end if;

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

create function public.add_grocery_item(
  p_list_id uuid,
  p_name text,
  p_quantity numeric default null,
  p_unit text default null,
  p_category_id uuid default null,
  p_urgency text default 'whenever',
  p_note text default null,
  p_idempotency_key text default null
) returns public.grocery_items
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
  v_item public.grocery_items;
  v_pos int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if p_idempotency_key is not null then
    select * into v_item
      from public.grocery_items
     where list_id = p_list_id and idempotency_key = p_idempotency_key;
    if found then
      return v_item;
    end if;
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'INVALID_NAME';
  end if;

  if p_urgency not in ('today', 'this_week', 'whenever') then
    raise exception 'INVALID_INPUT';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_category_id is not null then
    if not exists (
      select 1 from public.grocery_categories
       where id = p_category_id and (house_id is null or house_id = v_list.house_id)
    ) then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_items
   where list_id = p_list_id;

  insert into public.grocery_items (
    list_id, name, quantity, unit, category_id, urgency, note, idempotency_key, position, created_by
  ) values (
    p_list_id,
    btrim(p_name),
    p_quantity,
    nullif(btrim(p_unit), ''),
    p_category_id,
    p_urgency::public.item_urgency,
    nullif(p_note, ''),
    nullif(btrim(p_idempotency_key), ''),
    v_pos,
    v_uid
  ) returning * into v_item;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_item.added', 'grocery_item', v_item.id,
    jsonb_build_object('list_id', p_list_id, 'name', v_item.name)
  );

  return v_item;
end $$;

create function public.update_grocery_item(
  p_item_id uuid,
  p_name text default null,
  p_quantity numeric default null,
  p_unit text default null,
  p_category_id uuid default null,
  p_urgency text default null,
  p_note text default null
) returns public.grocery_items
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.grocery_items;
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_item from public.grocery_items where id = p_item_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_list from public.grocery_lists where id = v_item.list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_list.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (v_item.created_by = v_uid or v_item.claimed_by = v_uid or public.is_house_admin(v_list.house_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is not null and char_length(btrim(p_name)) not between 1 and 100 then
    raise exception 'INVALID_NAME';
  end if;

  if p_urgency is not null and p_urgency not in ('today', 'this_week', 'whenever') then
    raise exception 'INVALID_INPUT';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_category_id is not null then
    if not exists (
      select 1 from public.grocery_categories
       where id = p_category_id and (house_id is null or house_id = v_list.house_id)
    ) then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  update public.grocery_items
     set name = case when p_name is not null then btrim(p_name) else name end,
         quantity = case when p_quantity is not null then p_quantity else quantity end,
         unit = case when p_unit is not null then nullif(btrim(p_unit), '') else unit end,
         category_id = case when p_category_id is not null then p_category_id else category_id end,
         urgency = case when p_urgency is not null then p_urgency::public.item_urgency else urgency end,
         note = case when p_note is not null then nullif(p_note, '') else note end
   where id = p_item_id
  returning * into v_item;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_item.updated', 'grocery_item', v_item.id,
    jsonb_build_object('list_id', v_item.list_id, 'name', v_item.name)
  );

  return v_item;
end $$;

create function public.claim_grocery_item(p_item_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
  v_rows_affected int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set claimed_by = v_uid,
         claimed_at = now(),
         status = 'claimed'
   where id = p_item_id and status = 'pending';

  get diagnostics v_rows_affected = row_count;

  if v_rows_affected = 0 then
    return jsonb_build_object(
      'claimed', false,
      'claimed_by_name', (
        select p.display_name
          from public.grocery_items i
          left join public.profiles p on p.id = i.claimed_by
         where i.id = p_item_id
      )
    );
  end if;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.claimed', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );

  return jsonb_build_object('claimed', true);
end $$;

create function public.unclaim_grocery_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.claimed_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_item_rec.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.claimed_by is distinct from v_uid then
    raise exception 'NOT_CLAIMER';
  end if;

  update public.grocery_items
     set status = 'pending',
         claimed_by = null,
         claimed_at = null
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.unclaimed', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );
end $$;

create function public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_item_rec.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  if not exists (
    select 1 from public.house_members
     where house_id = v_item_rec.house_id and user_id = p_assigned_to and status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set assigned_by = v_uid,
         assigned_to = p_assigned_to,
         assigned_at = now(),
         status = 'assigned',
         assignment_response = null
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.assigned', 'grocery_item', p_item_id,
    jsonb_build_object(
      'assigned_to', p_assigned_to,
      'list_id', v_item_rec.list_id,
      'name', v_item_rec.name
    )
  );
end $$;

create function public.respond_to_assignment(p_item_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.assigned_to, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_item_rec.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.assigned_to is distinct from v_uid then
    raise exception 'NOT_ASSIGNEE';
  end if;

  if p_accept then
    update public.grocery_items
       set assignment_response = 'accepted'
     where id = p_item_id;

    perform public.log_activity(
      v_item_rec.house_id, v_uid, 'grocery_item.assignment_accepted', 'grocery_item', p_item_id,
      jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
    );
  else
    update public.grocery_items
       set assignment_response = 'declined',
           status = 'pending',
           assigned_to = null,
           assigned_by = null,
           assigned_at = null
     where id = p_item_id;

    perform public.log_activity(
      v_item_rec.house_id, v_uid, 'grocery_item.assignment_declined', 'grocery_item', p_item_id,
      jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
    );
  end if;
end $$;

create function public.mark_item_bought(
  p_item_id uuid,
  p_quantity numeric default null,
  p_unit text default null,
  p_price_paise int default null,
  p_store text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.quantity, i.unit, i.claimed_by, i.assigned_to, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (
    public.is_house_admin(v_item_rec.house_id)
    or (v_item_rec.claimed_by is not null and v_item_rec.claimed_by = v_uid)
    or (v_item_rec.assigned_to is not null and v_item_rec.assigned_to = v_uid)
    or (v_item_rec.claimed_by is null and v_item_rec.assigned_to is null)
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_price_paise is not null and p_price_paise < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_store is not null and char_length(btrim(p_store)) > 100 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.grocery_purchases (
    item_id, bought_by, quantity, unit, price_paise, store, bought_at
  ) values (
    p_item_id,
    v_uid,
    coalesce(p_quantity, v_item_rec.quantity),
    coalesce(nullif(btrim(p_unit), ''), v_item_rec.unit),
    p_price_paise,
    nullif(btrim(p_store), ''),
    now()
  );

  update public.grocery_items
     set status = 'bought'
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.bought', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'name', v_item_rec.name,
      'price_paise', p_price_paise,
      'store', nullif(btrim(p_store), '')
    )
  );
end $$;

create function public.cancel_grocery_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.is_house_member(v_item_rec.house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set status = 'cancelled'
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.cancelled', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );
end $$;

create function public.move_grocery_item(p_item_id uuid, p_target_list_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.grocery_items;
  v_src_list public.grocery_lists;
  v_target_list public.grocery_lists;
  v_pos int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_item from public.grocery_items where id = p_item_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_src_list from public.grocery_lists where id = v_item.list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_target_list from public.grocery_lists where id = p_target_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if v_src_list.house_id <> v_target_list.house_id then
    raise exception 'WRONG_HOUSE';
  end if;

  if not (public.can_read_list(v_src_list.id) and public.can_read_list(v_target_list.id)) then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_items
   where list_id = p_target_list_id;

  update public.grocery_items
     set list_id = p_target_list_id,
         position = v_pos
   where id = p_item_id;

  perform public.log_activity(
    v_src_list.house_id, v_uid, 'grocery_item.moved', 'grocery_item', p_item_id,
    jsonb_build_object(
      'from_list_id', v_src_list.id,
      'to_list_id', p_target_list_id,
      'name', v_item.name
    )
  );
end $$;

create function public.add_grocery_category(p_house_id uuid, p_name text)
returns public.grocery_categories
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_pos int;
  v_cat public.grocery_categories;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if not public.is_house_member(p_house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 40 then
    raise exception 'INVALID_NAME';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_categories
   where house_id = p_house_id;

  insert into public.grocery_categories (house_id, name, position)
  values (p_house_id, btrim(p_name), v_pos)
  returning * into v_cat;

  return v_cat;
end $$;

revoke all on function
  public.can_read_list(uuid),
  public.create_grocery_list(uuid, text, text, text),
  public.update_grocery_list(uuid, text, text, int),
  public.archive_grocery_list(uuid),
  public.add_grocery_item(uuid, text, numeric, text, uuid, text, text, text),
  public.update_grocery_item(uuid, text, numeric, text, uuid, text, text),
  public.claim_grocery_item(uuid),
  public.unclaim_grocery_item(uuid),
  public.assign_grocery_item(uuid, uuid),
  public.respond_to_assignment(uuid, boolean),
  public.mark_item_bought(uuid, numeric, text, int, text),
  public.cancel_grocery_item(uuid),
  public.move_grocery_item(uuid, uuid),
  public.add_grocery_category(uuid, text)
  from public, anon;

grant execute on function
  public.can_read_list(uuid),
  public.create_grocery_list(uuid, text, text, text),
  public.update_grocery_list(uuid, text, text, int),
  public.archive_grocery_list(uuid),
  public.add_grocery_item(uuid, text, numeric, text, uuid, text, text, text),
  public.update_grocery_item(uuid, text, numeric, text, uuid, text, text),
  public.claim_grocery_item(uuid),
  public.unclaim_grocery_item(uuid),
  public.assign_grocery_item(uuid, uuid),
  public.respond_to_assignment(uuid, boolean),
  public.mark_item_bought(uuid, numeric, text, int, text),
  public.cancel_grocery_item(uuid),
  public.move_grocery_item(uuid, uuid),
  public.add_grocery_category(uuid, text)
  to authenticated;

-- Extend create_house to also create the default grocery list.
create or replace function public.create_house(
  p_name text, p_address text default null
) returns public.houses
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_house public.houses;
  v_n int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  select count(*) into v_n from public.house_members
   where user_id = v_uid and status = 'active';
  if v_n >= public.max_houses_per_user() then raise exception 'HOUSE_LIMIT_REACHED'; end if;

  insert into public.houses (name, address, created_by)
  values (btrim(p_name), nullif(btrim(p_address), ''), v_uid)
  returning * into v_house;

  insert into public.house_members (house_id, user_id, role, status, joined_at)
  values (v_house.id, v_uid, 'admin', 'active', now());

  insert into public.house_invites (house_id, code, created_by)
  values (v_house.id, public.generate_invite_code(), v_uid);

  insert into public.grocery_lists (house_id, name, icon, position, visibility, is_default, created_by)
  values (v_house.id, 'Groceries', '🛒', 0, 'shared', true, v_uid);

  perform public.log_activity(v_house.id, v_uid, 'house_created', 'house', v_house.id,
                              jsonb_build_object('name', v_house.name));

  return v_house;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.grocery_lists, public.grocery_items;
  end if;
end $$;
