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
grant execute on all functions in schema tests to public;

select tests.create_user('00000000-0000-4000-8000-0000000000f1', 'owner@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000f2', 'mate@test.local');

select tests.as_user('00000000-0000-4000-8000-0000000000f1');
select set_config('tests.house', (public.create_house('Flat', '12 Test Street, Bengaluru')).id::text, true);
update public.houses set join_mode = 'anyone' where id = tests.id('house');
select set_config('tests.code',
  (select code from public.house_invites where house_id = tests.id('house')), true);
select set_config('tests.shared',
  (select id from public.grocery_lists where house_id = tests.id('house') and is_default)::text, true);
select set_config('tests.private',
  (public.create_grocery_list(tests.id('house'), 'Mine', '🛒', 'private')).id::text, true);
select set_config('tests.s1', (public.add_grocery_item(tests.id('shared'), 'Soap')).id::text, true);
select set_config('tests.p1', (public.add_grocery_item(tests.id('private'), 'Tea')).id::text, true);
select set_config('tests.p2', (public.add_grocery_item(tests.id('private'), 'Rice')).id::text, true);
select set_config('tests.p3', (public.add_grocery_item(tests.id('private'), 'Dal')).id::text, true);
select public.mark_item_bought(tests.id('s1'), null, null, 5000);
select public.mark_item_bought(tests.id('p1'), null, null, 20000, 'Old store');
select public.mark_items_bought(
  tests.id('private'), array[tests.id('p2'), tests.id('p3')]::uuid[], 30000, 'Staples', null,
  array[10000, 20000]::integer[]);

select tests.as_user('00000000-0000-4000-8000-0000000000f2');
select public.join_house(current_setting('tests.code'));
select throws_ok(
  format($q$select public.update_private_purchase(%L, 100, null, now())$q$, tests.id('p1')),
  'P0001', 'NOT_FOUND', 'another member cannot see or edit a private purchase');

select tests.as_user('00000000-0000-4000-8000-0000000000f1');
select throws_ok(
  format($q$select public.update_private_purchase(%L, 100, null, now())$q$, tests.id('s1')),
  'P0001', 'FORBIDDEN', 'shared purchases are edited through their expense');
select throws_ok(
  format($q$select public.update_private_purchase(%L, -1, null, now())$q$, tests.id('p1')),
  'P0001', 'INVALID_INPUT', 'negative amount is rejected');
select throws_ok(
  format($q$select public.update_private_purchase(%L, 100, null, now() + interval '3 days')$q$, tests.id('p1')),
  'P0001', 'INVALID_INPUT', 'a date far ahead is rejected');
select throws_ok(
  format($q$select public.update_private_purchase(%L, null, null, now())$q$, tests.id('p2')),
  'P0001', 'INVALID_INPUT', 'a batch needs a total');

select public.update_private_purchase(tests.id('p1'), 25000, '  New store ', now() - interval '2 days');
select is(
  (select price_paise from public.grocery_purchases where item_id = tests.id('p1')), 25000,
  'single purchase price updated');
select is(
  (select store from public.grocery_purchases where item_id = tests.id('p1')), 'New store',
  'store is trimmed');

select public.update_private_purchase(tests.id('p3'), 40000, 'Market', now() - interval '1 day');
select is(
  (select total_paise from public.grocery_purchase_batches
    where id = (select batch_id from public.grocery_purchases where item_id = tests.id('p2'))),
  40000, 'editing one item updates the batch total');
select is(
  (select array_agg(price_paise order by price_paise) from public.grocery_purchases
    where item_id in (tests.id('p2'), tests.id('p3'))),
  array[10000, 20000], 'per-item prices stay');
select is(
  (select count(distinct store) from public.grocery_purchases
    where item_id in (tests.id('p2'), tests.id('p3'))), 1::bigint, 'batch items share the store');

select * from finish();
rollback;
