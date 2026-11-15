begin;
select * from no_plan();
create schema tests;
grant usage on schema tests to public;
create function tests.create_user(p_id uuid, p_email text) returns void
language sql as $$
  insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (p_id, 'authenticated', 'authenticated', p_email, now(),
          jsonb_build_object('full_name', p_email));
$$;
create function tests.as_user(p_id uuid) returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function tests.id(p_key text) returns uuid
language sql as $$ select current_setting('tests.' || p_key)::uuid $$;
create function tests.rows(p_type text) returns bigint
language sql as $$
  select count(*) from public.activity_log where house_id = tests.id('house') and type = p_type
$$;
grant execute on all functions in schema tests to public;

select tests.create_user('00000000-0000-4000-8000-0000000001a1', 'owner@test.local');
select tests.as_user('00000000-0000-4000-8000-0000000001a1');
select set_config('tests.house', (public.create_house('Flat', '12 Test Street, Bengaluru')).id::text, true);
select set_config('tests.list',
  (select id from public.grocery_lists where house_id = tests.id('house') and is_default)::text, true);

-- Back-to-back adds share one row
select set_config('tests.i1', (public.add_grocery_item(tests.id('list'), 'Milk')).id::text, true);
select set_config('tests.i2', (public.add_grocery_item(tests.id('list'), 'Bread')).id::text, true);
select set_config('tests.i3', (public.add_grocery_item(tests.id('list'), 'Eggs')).id::text, true);
select is(tests.rows('grocery_item.added'), 1::bigint, 'back-to-back adds log one row');
select is((select payload ->> 'name' from public.activity_log
            where house_id = tests.id('house') and type = 'grocery_item.added'),
  'Milk + 2 others', 'the row names the first item and counts the rest');
select is((select (payload ->> 'item_count')::int from public.activity_log
            where house_id = tests.id('house') and type = 'grocery_item.added'),
  3, 'the row counts every item');

select set_config('tests.i4',
  (public.add_grocery_item(tests.id('list'), 'Chilli', p_urgency := 'now')).id::text, true);
select is(tests.rows('grocery_item.added'), 2::bigint, 'a needed-now add gets its own row');

-- Bulk assign and claim log one row each
select is(public.assign_grocery_items(tests.id('list'),
  array[tests.id('i1'), tests.id('i2'), tests.id('i3')],
  '00000000-0000-4000-8000-0000000001a1'), 3, 'bulk assign assigns every item');
select is(tests.rows('grocery_item.assigned'), 1::bigint, 'bulk assign logs one row');
select is((select payload ->> 'name' from public.activity_log
            where house_id = tests.id('house') and type = 'grocery_item.assigned'),
  'Milk + 2 others', 'bulk assign row names the first item');

select set_config('tests.i5', (public.add_grocery_item(tests.id('list'), 'Salt')).id::text, true);
select is(public.claim_grocery_items(tests.id('list'), array[tests.id('i4'), tests.id('i5')]), 2,
  'bulk claim claims every item');
select is(tests.rows('grocery_item.claimed'), 1::bigint, 'bulk claim logs one row');

-- Editing a batch expense can change item prices
select set_config('tests.batch', public.mark_items_bought(
  tests.id('list'), array[tests.id('i1'), tests.id('i2'), tests.id('i3')]::uuid[], 30000, null, null,
  array[10000, 10000, 10000]::integer[],
  jsonb_build_object('split_method', 'equal',
    'payers', jsonb_build_array(jsonb_build_object(
      'user_id', '00000000-0000-4000-8000-0000000001a1', 'amount_paise', 30000)),
    'shares', jsonb_build_array(jsonb_build_object(
      'user_id', '00000000-0000-4000-8000-0000000001a1', 'share_paise', 30000, 'weight', null)))
)::text, true);
select set_config('tests.expense',
  (select id from public.expenses where batch_id = tests.id('batch'))::text, true);

select public.update_expense(tests.id('expense'), 'Run', 31000, 'groceries', null, current_date,
  'equal',
  jsonb_build_array(jsonb_build_object(
    'user_id', '00000000-0000-4000-8000-0000000001a1', 'amount_paise', 31000)),
  jsonb_build_array(jsonb_build_object(
    'user_id', '00000000-0000-4000-8000-0000000001a1', 'share_paise', 31000, 'weight', null)),
  jsonb_build_array(
    jsonb_build_object('item_id', tests.id('i1'), 'price_paise', 12000),
    jsonb_build_object('item_id', tests.id('i2'), 'price_paise', null)));
select is(
  (select array_agg(price_paise order by batch_position) from public.grocery_purchases
    where batch_id = tests.id('batch')),
  array[12000, null, 10000]::integer[], 'item prices follow the edit');

select throws_ok(
  format($q$select public.update_expense(%L, 'Run', 31000, 'groceries', null, current_date,
    'equal', %L::jsonb, %L::jsonb, %L::jsonb)$q$,
    tests.id('expense'),
    jsonb_build_array(jsonb_build_object(
      'user_id', '00000000-0000-4000-8000-0000000001a1', 'amount_paise', 31000)),
    jsonb_build_array(jsonb_build_object(
      'user_id', '00000000-0000-4000-8000-0000000001a1', 'share_paise', 31000, 'weight', null)),
    jsonb_build_array(jsonb_build_object('item_id', tests.id('i4'), 'price_paise', 1))),
  'P0001', 'INVALID_INPUT', 'an item outside the batch is rejected');

select * from finish();
rollback;
