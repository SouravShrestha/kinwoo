-- Local development data. Runs after migrations on `supabase db reset`.
-- Three housemates sharing a house (admin + two members), plus an outsider with no
-- house. All sign in by email OTP (read the code in Mailpit). Covers: a shared list and
-- a private list, grocery items in every status/urgency, a purchase batch settled as an
-- expense, manual expenses across every split method, and one recorded settlement.

insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'admin@kinwoo.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Asha Rao"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'member@kinwoo.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Mohan Verma"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-4000-8000-0000000000a3', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'outsider@kinwoo.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Olivia Outsider"}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'priya@kinwoo.test', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Nair"}', now(), now(),
    '', '', '', ''
  )
on conflict (id) do nothing;

insert into public.houses (id, name, address, created_by)
values (
  '00000000-0000-4000-8000-0000000000b1', 'Green Meadows Flat 4B', 'HSR Layout, Bengaluru',
  '00000000-0000-4000-8000-0000000000a1'
)
on conflict (id) do nothing;

insert into public.house_members (house_id, user_id, role, status, joined_at)
values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'admin', 'active', now()),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a2', 'member', 'active', now()),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a4', 'member', 'active', now())
on conflict (house_id, user_id) do nothing;

-- Fixed code so the join flow can be tried without opening the admin account.
insert into public.house_invites (house_id, code, created_by)
values ('00000000-0000-4000-8000-0000000000b1', 'SEED22', '00000000-0000-4000-8000-0000000000a1')
on conflict do nothing;

-- Every house gets a default grocery list via create_house(); the seed house is inserted
-- directly, so it needs the same list or the app has no list to select on first load.
insert into public.grocery_lists (id, house_id, name, icon, position, visibility, is_default, created_by)
values (
  '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Groceries', '🛒', 0,
  'shared', true, '00000000-0000-4000-8000-0000000000a1'
)
on conflict (house_id, name) where deleted_at is null do nothing;

-- A private list, visible only to its creator, to cover that path too.
insert into public.grocery_lists (id, house_id, name, icon, position, visibility, is_default, created_by)
values (
  '00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b1', 'Mohan''s Personal', '🧴', 1,
  'private', false, '00000000-0000-4000-8000-0000000000a2'
)
on conflict (house_id, name) where deleted_at is null do nothing;

-- Grocery items across every status and urgency, with real category links and Indian names.
insert into public.grocery_items (
  id, list_id, house_id, name, quantity, unit, category_id, urgency, status,
  claimed_by, claimed_at, assigned_by, assigned_to, assigned_at, assignment_response,
  note, position, created_by
)
values
  -- pending
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Toor dal', 1, 'kg', (select id from public.grocery_categories where name = 'Staples' and house_id is null), 'this_week', 'pending', null, null, null, null, null, null, null, 0, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Amul milk', 2, 'L', (select id from public.grocery_categories where name = 'Dairy' and house_id is null), 'today', 'pending', null, null, null, null, null, null, null, 1, '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'LPG cylinder refill', 1, 'pc', (select id from public.grocery_categories where name = 'Fuel' and house_id is null), 'now', 'pending', null, null, null, null, null, null, 'Call Hema gas agency before 6pm', 2, '00000000-0000-4000-8000-0000000000a1'),
  -- claimed
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Coriander leaves', 2, 'bunch', (select id from public.grocery_categories where name = 'Vegetables' and house_id is null), 'soon', 'claimed', '00000000-0000-4000-8000-0000000000a4', now(), null, null, null, null, null, 3, '00000000-0000-4000-8000-0000000000a2'),
  -- assigned, accepted
  ('00000000-0000-4000-8000-0000000000d5', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Aashirvaad atta', 5, 'kg', (select id from public.grocery_categories where name = 'Staples' and house_id is null), 'this_week', 'assigned', null, null, '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2', now(), 'accepted', null, 4, '00000000-0000-4000-8000-0000000000a1'),
  -- assigned, pending response
  ('00000000-0000-4000-8000-0000000000d6', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Surf Excel detergent', 1, 'pc', (select id from public.grocery_categories where name = 'Laundry' and house_id is null), 'whenever', 'assigned', null, null, '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a4', now(), null, null, 5, '00000000-0000-4000-8000-0000000000a2'),
  -- cancelled
  ('00000000-0000-4000-8000-0000000000d7', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Pet food', 1, 'kg', (select id from public.grocery_categories where name = 'Pet' and house_id is null), 'whenever', 'cancelled', null, null, null, null, null, null, 'No pet anymore', 6, '00000000-0000-4000-8000-0000000000a1'),
  -- private list item
  ('00000000-0000-4000-8000-0000000000d8', '00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b1', 'Himalaya face wash', 1, 'pc', (select id from public.grocery_categories where name = 'Personal' and house_id is null), 'whenever', 'pending', null, null, null, null, null, null, null, 7, '00000000-0000-4000-8000-0000000000a2')
on conflict (id) do nothing;

-- A bought batch (Big Bazaar run) with two items marked bought, linked to a settled expense.
insert into public.grocery_purchase_batches (id, house_id, list_id, bought_by, name, total_paise, store, bought_at)
values (
  '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1',
  'Weekly groceries', 84050, 'More Supermarket', now() - interval '2 days'
)
on conflict (id) do nothing;

insert into public.grocery_items (
  id, list_id, house_id, name, quantity, unit, category_id, urgency, status,
  position, created_by, archived_at
)
values
  (
    '00000000-0000-4000-8000-0000000000d9', '00000000-0000-4000-8000-0000000000c1',
    '00000000-0000-4000-8000-0000000000b1', 'Tata Salt', 1, 'kg',
    (select id from public.grocery_categories where name = 'Staples' and house_id is null),
    'whenever', 'bought', 7, '00000000-0000-4000-8000-0000000000a1', now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-8000-0000000000da', '00000000-0000-4000-8000-0000000000c1',
    '00000000-0000-4000-8000-0000000000b1', 'Red Label tea', 1, 'pc',
    (select id from public.grocery_categories where name = 'Beverages' and house_id is null),
    'whenever', 'bought', 8, '00000000-0000-4000-8000-0000000000a2', now() - interval '2 days'
  )
on conflict (id) do nothing;

insert into public.grocery_purchases (item_id, batch_id, bought_by, price_paise, bought_at)
select '00000000-0000-4000-8000-0000000000d9', '00000000-0000-4000-8000-0000000000e1',
       '00000000-0000-4000-8000-0000000000a1', 28000, now() - interval '2 days'
where not exists (select 1 from public.grocery_purchases where item_id = '00000000-0000-4000-8000-0000000000d9');

insert into public.grocery_purchases (item_id, batch_id, bought_by, price_paise, bought_at)
select '00000000-0000-4000-8000-0000000000da', '00000000-0000-4000-8000-0000000000e1',
       '00000000-0000-4000-8000-0000000000a1', 56050, now() - interval '2 days'
where not exists (select 1 from public.grocery_purchases where item_id = '00000000-0000-4000-8000-0000000000da');

-- Expense from that batch, split equally across all three housemates.
insert into public.expenses (
  id, house_id, title, amount_paise, category, note, spent_on, split_method, batch_id, created_by
)
values (
  '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000b1',
  'Weekly groceries', 84050, 'groceries', 'More Supermarket run', (now() - interval '2 days')::date,
  'equal', '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000a1'
)
on conflict (id) do nothing;

insert into public.expense_payers (expense_id, user_id, amount_paise)
values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 84050)
on conflict do nothing;

insert into public.expense_shares (expense_id, user_id, share_paise)
values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 28017),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a2', 28017),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a4', 28016)
on conflict do nothing;

-- Rent split by exact amounts (Asha's room is bigger, so she pays more).
insert into public.expenses (
  id, house_id, title, amount_paise, category, note, spent_on, split_method, created_by
)
values (
  '00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000b1',
  'Flat rent - November', 4500000, 'rent', 'Paid to landlord via UPI', (now() - interval '5 days')::date,
  'exact', '00000000-0000-4000-8000-0000000000a1'
)
on conflict (id) do nothing;

insert into public.expense_payers (expense_id, user_id, amount_paise)
values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000a1', 4500000)
on conflict do nothing;

insert into public.expense_shares (expense_id, user_id, share_paise)
values
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000a1', 1700000),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000a2', 1400000),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000a4', 1400000)
on conflict do nothing;

-- Electricity bill split by percent (Mohan works from home, uses more power).
insert into public.expenses (
  id, house_id, title, amount_paise, category, note, spent_on, split_method, created_by
)
values (
  '00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000b1',
  'BESCOM electricity bill', 320000, 'utilities', 'October cycle', (now() - interval '10 days')::date,
  'percent', '00000000-0000-4000-8000-0000000000a2'
)
on conflict (id) do nothing;

insert into public.expense_payers (expense_id, user_id, amount_paise)
values ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000a2', 320000)
on conflict do nothing;

insert into public.expense_shares (expense_id, user_id, share_paise, weight)
values
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000a1', 96000, 30),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000a2', 144000, 45),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000a4', 80000, 25)
on conflict do nothing;

-- Swiggy order split by shares (Priya ordered extra, so gets more weight).
insert into public.expenses (
  id, house_id, title, amount_paise, category, note, spent_on, split_method, created_by
)
values (
  '00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000b1',
  'Swiggy dinner order', 92000, 'food', 'Biryani night', (now() - interval '1 day')::date,
  'shares', '00000000-0000-4000-8000-0000000000a4'
)
on conflict (id) do nothing;

insert into public.expense_payers (expense_id, user_id, amount_paise)
values ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000a4', 92000)
on conflict do nothing;

insert into public.expense_shares (expense_id, user_id, share_paise, weight)
values
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000a1', 23000, 1),
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000a2', 23000, 1),
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000a4', 46000, 2)
on conflict do nothing;

-- A settlement: Mohan pays Asha back part of what he owes from the rent split.
insert into public.settlements (house_id, payer_id, payee_id, amount_paise, created_by)
select '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a2',
       '00000000-0000-4000-8000-0000000000a1', 1000000, '00000000-0000-4000-8000-0000000000a2'
where not exists (
  select 1 from public.settlements
  where house_id = '00000000-0000-4000-8000-0000000000b1'
    and payer_id = '00000000-0000-4000-8000-0000000000a2'
    and payee_id = '00000000-0000-4000-8000-0000000000a1'
);

-- Where the push trigger posts locally (Kong, inside the Docker network) and the shared secret
-- it sends. The secret must match PUSH_FUNCTION_SECRET in supabase/functions/.env.
select vault.create_secret('http://supabase_kong_kinwoo:8000/functions/v1/send-push', 'push_function_url')
 where not exists (select 1 from vault.secrets where name = 'push_function_url');
select vault.create_secret('local-push-secret', 'push_function_secret')
 where not exists (select 1 from vault.secrets where name = 'push_function_secret');
