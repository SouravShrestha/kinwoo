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
create function tests.as_superuser() returns void
language plpgsql as $$
begin
  reset role;
end $$;
create function tests.id(p_key text) returns uuid
language sql as $$ select current_setting('tests.' || p_key)::uuid $$;
grant execute on all functions in schema tests to public;

select tests.create_user('00000000-0000-4000-8000-0000000000e1', 'admin@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000e2', 'buyer@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000e3', 'other@test.local');

select tests.as_user('00000000-0000-4000-8000-0000000000e1');
select set_config('tests.house', (public.create_house('Flat')).id::text, true);
select set_config('tests.code',
  (select code from public.house_invites where house_id = tests.id('house')), true);
select set_config('tests.list',
  (select id from public.grocery_lists where house_id = tests.id('house') and is_default)::text,
  true);
select set_config('tests.i1', (public.add_grocery_item(tests.id('list'), 'Tomato')).id::text, true);
select set_config('tests.i2', (public.add_grocery_item(tests.id('list'), 'Onion')).id::text, true);
select set_config('tests.i3', (public.add_grocery_item(tests.id('list'), 'Milk')).id::text, true);
select set_config('tests.i4', (public.add_grocery_item(tests.id('list'), 'Bread')).id::text, true);
select set_config('tests.i5', (public.add_grocery_item(tests.id('list'), 'Eggs')).id::text, true);

select tests.as_user('00000000-0000-4000-8000-0000000000e2');
select is(public.join_house(current_setting('tests.code'))->>'status', 'joined', 'buyer joins');
select public.claim_grocery_item(tests.id('i1'));
select public.claim_grocery_item(tests.id('i2'));

select tests.as_user('00000000-0000-4000-8000-0000000000e3');
select is(public.join_house(current_setting('tests.code'))->>'status', 'joined', 'other joins');
select public.claim_grocery_item(tests.id('i3'));

-- Validation and all-or-nothing failures
select tests.as_user('00000000-0000-4000-8000-0000000000e2');
select throws_ok(
  format('select public.mark_items_bought(%L, array[%L]::uuid[], 100)',
    tests.id('list'), tests.id('i1')),
  'P0001', 'INVALID_INPUT', 'a batch needs at least two items');
select throws_ok(
  format('select public.mark_items_bought(%L, array[%L, %L]::uuid[], 100)',
    tests.id('list'), tests.id('i1'), tests.id('i1')),
  'P0001', 'INVALID_INPUT', 'duplicate ids are rejected');
select throws_ok(
  format('select public.mark_items_bought(%L, array[%L, %L]::uuid[], 100, null, null, array[5])',
    tests.id('list'), tests.id('i1'), tests.id('i2')),
  'P0001', 'INVALID_INPUT', 'prices must line up with items');
select throws_ok(
  format('select public.mark_items_bought(%L, array[%L, %L]::uuid[], -1)',
    tests.id('list'), tests.id('i1'), tests.id('i2')),
  'P0001', 'INVALID_INPUT', 'a negative total is rejected');
select throws_ok(
  format('select public.mark_items_bought(%L, array[%L, gen_random_uuid()]::uuid[], 100)',
    tests.id('list'), tests.id('i1')),
  'P0001', 'NOT_FOUND', 'an unknown item fails the batch');
select throws_ok(
  format('select public.mark_items_bought(%L, array[%L, %L]::uuid[], 100)',
    tests.id('list'), tests.id('i1'), tests.id('i3')),
  'P0001', 'FORBIDDEN', 'a member cannot buy an item claimed by someone else');

select tests.as_superuser();
select is((select count(*) from public.grocery_purchase_batches where house_id = tests.id('house')),
  0::bigint, 'failed batches write no batch');
select is((select count(*) from public.grocery_purchases p
             join public.grocery_items i on i.id = p.item_id
            where i.list_id = tests.id('list')),
  0::bigint, 'failed batches write no purchases');
select is((select status::text from public.grocery_items where id = tests.id('i1')), 'claimed',
  'failed batches leave items untouched');

-- Success
select tests.as_user('00000000-0000-4000-8000-0000000000e2');
select set_config('tests.batch', public.mark_items_bought(
  tests.id('list'), array[tests.id('i1'), tests.id('i2')], 45000, null, '  Market ',
  array[12000, null])::text, true);

select is((select count(*) from public.grocery_purchase_batches where id = tests.id('batch')),
  1::bigint, 'the buyer can read the batch');

select tests.as_superuser();
select results_eq(
  format('select total_paise, store, name from public.grocery_purchase_batches where id = %L',
    tests.id('batch')),
  $$values (45000, 'Market'::text, null::text)$$,
  'the batch keeps the total and trimmed store');
select results_eq(
  format('select item_id, batch_position, price_paise, store from public.grocery_purchases
           where batch_id = %L order by batch_position', tests.id('batch')),
  format($$values (%L::uuid, 0, 12000, 'Market'::text), (%L::uuid, 1, null::int, 'Market'::text)$$,
    tests.id('i1'), tests.id('i2')),
  'purchases record order, optional prices and store');
select is((select count(*) from public.grocery_items
            where id in (tests.id('i1'), tests.id('i2')) and status = 'bought'),
  2::bigint, 'every item is bought');
select results_eq(
  format($$select payload->>'label', (payload->>'item_count')::int, (payload->>'total_paise')::int,
                  payload->'item_ids' ? %L
             from public.activity_log
            where type = 'grocery_batch.bought' and entity_id = %L$$,
    tests.id('i1'), tests.id('batch')),
  $$values ('Tomato + 1 other'::text, 2, 45000, true)$$,
  'one activity entry describes the batch');
select is((select count(*) from public.activity_log
            where type = 'grocery_item.bought' and house_id = tests.id('house')),
  0::bigint, 'a batch does not log per-item bought entries');

-- Already bought
select tests.as_user('00000000-0000-4000-8000-0000000000e1');
select throws_ok(
  format('select public.mark_items_bought(%L, array[%L, %L]::uuid[], 100)',
    tests.id('list'), tests.id('i4'), tests.id('i1')),
  'P0001', 'ALREADY_BOUGHT', 'a batch with a bought item fails');
select tests.as_superuser();
select is((select status::text from public.grocery_items where id = tests.id('i4')), 'pending',
  'the other items stay unbought');
select is((select count(*) from public.grocery_purchase_batches where house_id = tests.id('house')),
  1::bigint, 'no extra batch is written');

-- Admins can batch-buy items claimed by others, with a custom name
select tests.as_user('00000000-0000-4000-8000-0000000000e1');
select isnt(public.mark_items_bought(
  tests.id('list'), array[tests.id('i3'), tests.id('i5')], 9900, ' Weekly veg '), null,
  'an admin can buy items claimed by someone else');
select tests.as_superuser();
select is((select payload->>'label' from public.activity_log
            where type = 'grocery_batch.bought' and house_id = tests.id('house')
              and payload->'item_ids' ? tests.id('i3')::text),
  'Weekly veg', 'a custom name becomes the label');

-- Single buys gain a status guard
select tests.as_user('00000000-0000-4000-8000-0000000000e1');
select lives_ok(format('select public.mark_item_bought(%L)', tests.id('i4')),
  'a single buy still works');
select throws_ok(format('select public.mark_item_bought(%L)', tests.id('i4')),
  'P0001', 'ALREADY_BOUGHT', 'buying the same item twice fails');
select tests.as_superuser();
select is((select count(*) from public.grocery_purchases where item_id = tests.id('i4')),
  1::bigint, 'a repeat single buy writes no second purchase');

select * from finish();
rollback;
