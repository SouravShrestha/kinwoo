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

create function tests.payer(p_user text, p_amount int) returns jsonb
language sql as $$ select jsonb_build_object('user_id', tests.id(p_user), 'amount_paise', p_amount) $$;

create function tests.share(p_user text, p_amount int, p_weight int default null) returns jsonb
language sql as $$
  select jsonb_build_object('user_id', tests.id(p_user), 'share_paise', p_amount, 'weight', p_weight)
$$;

create function tests.net(p_user text, p_other text) returns bigint
language sql as $$
  select coalesce((select net_paise from public.expense_pair_balances(tests.id('house'), tests.id(p_user))
                    where other_id = tests.id(p_other)), 0)
$$;

grant execute on all functions in schema tests to public;

select set_config('tests.a', '00000000-0000-4000-8000-0000000000f1', true);
select set_config('tests.b', '00000000-0000-4000-8000-0000000000f2', true);
select set_config('tests.c', '00000000-0000-4000-8000-0000000000f3', true);
select set_config('tests.x', '00000000-0000-4000-8000-0000000000f4', true);
select tests.create_user(tests.id('a'), 'asha@test.local');
select tests.create_user(tests.id('b'), 'rohan@test.local');
select tests.create_user(tests.id('c'), 'meera@test.local');
select tests.create_user(tests.id('x'), 'outsider@test.local');

select tests.as_user(tests.id('a'));
select set_config('tests.house', (public.create_house('Flat')).id::text, true);
select set_config('tests.code',
  (select code from public.house_invites where house_id = tests.id('house')), true);
select set_config('tests.list',
  (select id from public.grocery_lists where house_id = tests.id('house') and is_default)::text,
  true);

select tests.as_user(tests.id('b'));
select public.join_house(current_setting('tests.code'));
select tests.as_user(tests.id('c'));
select public.join_house(current_setting('tests.code'));
select tests.as_user(tests.id('x'));
select public.create_house('Elsewhere');

-- Validation
select tests.as_user(tests.id('a'));
select throws_ok(
  format($$select public.create_expense(%L, 'Gas', 900, 'utilities', null, current_date, 'equal',
            jsonb_build_array(tests.payer('a', 800)),
            jsonb_build_array(tests.share('a', 450), tests.share('b', 450)))$$, tests.id('house')),
  'P0001', 'INVALID_INPUT', 'payers must add up to the amount');
select throws_ok(
  format($$select public.create_expense(%L, 'Gas', 900, 'utilities', null, current_date, 'equal',
            jsonb_build_array(tests.payer('a', 900)),
            jsonb_build_array(tests.share('a', 450), tests.share('b', 400)))$$, tests.id('house')),
  'P0001', 'INVALID_INPUT', 'shares must add up to the amount');
select throws_ok(
  format($$select public.create_expense(%L, 'Gas', 900, 'utilities', null, current_date, 'shares',
            jsonb_build_array(tests.payer('a', 900)),
            jsonb_build_array(tests.share('a', 450), tests.share('b', 450)))$$, tests.id('house')),
  'P0001', 'INVALID_INPUT', 'non-equal splits need weights');
select throws_ok(
  format($$select public.create_expense(%L, 'Gas', 900, 'bogus', null, current_date, 'equal',
            jsonb_build_array(tests.payer('a', 900)),
            jsonb_build_array(tests.share('a', 900)))$$, tests.id('house')),
  'P0001', 'INVALID_INPUT', 'unknown categories are rejected');
select throws_ok(
  format($$select public.create_expense(%L, 'Gas', 900, 'utilities', null, current_date + 5,
            'equal', jsonb_build_array(tests.payer('a', 900)),
            jsonb_build_array(tests.share('a', 900)))$$, tests.id('house')),
  'P0001', 'INVALID_INPUT', 'future dates are rejected');
select throws_ok(
  format($$select public.create_expense(%L, 'Gas', 900, 'utilities', null, current_date, 'equal',
            jsonb_build_array(tests.payer('a', 900)),
            jsonb_build_array(tests.share('a', 450), tests.share('x', 450)))$$, tests.id('house')),
  'P0001', 'NOT_A_MEMBER', 'everyone must be in the house');

select tests.as_user(tests.id('x'));
select throws_ok(
  format($$select public.create_expense(%L, 'Gas', 900, 'utilities', null, current_date, 'equal',
            jsonb_build_array(tests.payer('x', 900)),
            jsonb_build_array(tests.share('x', 900)))$$, tests.id('house')),
  'P0001', 'FORBIDDEN', 'outsiders cannot add expenses');

-- Create: Asha pays 300 split three ways; Rohan and Meera pay 90 together, split by Asha and Rohan
select tests.as_user(tests.id('a'));
select set_config('tests.e1', public.create_expense(
  tests.id('house'), '  Electricity  bill ', 30000, 'utilities', ' ', current_date, 'equal',
  jsonb_build_array(tests.payer('a', 30000)),
  jsonb_build_array(tests.share('a', 10000), tests.share('b', 10000), tests.share('c', 10000))
)::text, true);
select is((select title from public.expenses where id = tests.id('e1')), 'Electricity bill',
  'titles are collapsed');
select is((select note from public.expenses where id = tests.id('e1')), null,
  'a blank note is stored as null');

select tests.as_user(tests.id('b'));
select set_config('tests.e2', public.create_expense(
  tests.id('house'), 'Snacks', 9000, 'food_dining', null, current_date, 'shares',
  jsonb_build_array(tests.payer('b', 6000), tests.payer('c', 3000)),
  jsonb_build_array(tests.share('a', 6000, 200), tests.share('b', 3000, 100))
)::text, true);

select tests.as_superuser();
-- e1: b and c each owe a 100. e2: a owes b 40 and c 20; b owes c 10.
select is(tests.net('a', 'b'), 6000::bigint, 'Rohan owes Asha 100 - 40');
select is(tests.net('b', 'a'), -6000::bigint, 'the pair mirrors exactly');
select is(tests.net('a', 'c'), 8000::bigint, 'Meera owes Asha 100 - 20');
select is(tests.net('b', 'c'), -1000::bigint, 'Rohan owes Meera 10');
select is(public.user_has_outstanding_balance(tests.id('house'), tests.id('a')), true,
  'Asha has an outstanding balance');

select tests.as_user(tests.id('a'));
select results_eq(
  format('select user_id, net_paise from public.house_balances(%L) order by net_paise',
    tests.id('house')),
  format('values (%L::uuid, 6000::bigint), (%L::uuid, 8000::bigint)', tests.id('b'), tests.id('c')),
  'house_balances lists the caller''s pairs');

select tests.as_user(tests.id('x'));
select throws_ok(format('select * from public.house_balances(%L)', tests.id('house')),
  'P0001', 'FORBIDDEN', 'outsiders cannot read balances');
select is((select count(*) from public.expenses), 0::bigint, 'outsiders cannot see expenses');
select is((select count(*) from public.expense_shares), 0::bigint, 'or their shares');

-- Remainders round once per pair
select tests.as_user(tests.id('a'));
select set_config('tests.e3', public.create_expense(
  tests.id('house'), 'Tea', 100, 'other', null, current_date, 'equal',
  jsonb_build_array(tests.payer('a', 100)),
  jsonb_build_array(tests.share('a', 34), tests.share('b', 33), tests.share('c', 33))
)::text, true);
select tests.as_superuser();
select is(tests.net('a', 'b'), 6033::bigint, 'the remainder stays with whoever kept it');

-- Leave and remove are blocked while a balance is open
select tests.as_user(tests.id('c'));
select throws_ok(format('select public.leave_house(%L, true)', tests.id('house')),
  'P0001', 'OUTSTANDING_BALANCE', 'acknowledging no longer bypasses the balance check');
select tests.as_user(tests.id('a'));
select throws_ok(format('select public.remove_member(%L, %L, true)', tests.id('house'), tests.id('c')),
  'P0001', 'OUTSTANDING_BALANCE', 'keep_debt no longer bypasses the balance check');

-- Edit and delete permissions
select tests.as_user(tests.id('c'));
select throws_ok(
  format($$select public.update_expense(%L, 'Tea', 100, 'other', null, current_date, 'equal',
            jsonb_build_array(tests.payer('a', 100)), jsonb_build_array(tests.share('a', 90)))$$,
    tests.id('e2')),
  'P0001', 'INVALID_INPUT', 'a participant can edit, but the new parts are still validated');
select lives_ok(
  format($$select public.update_expense(%L, 'Tea run', 100, 'food_dining', 'Chai', current_date,
            'equal', jsonb_build_array(tests.payer('a', 100)),
            jsonb_build_array(tests.share('a', 50), tests.share('b', 50)))$$, tests.id('e3')),
  'a participant can edit someone else''s expense');
select tests.as_superuser();
select is((select count(*) from public.expense_shares where expense_id = tests.id('e3')),
  2::bigint, 'shares are fully replaced');

select tests.as_user(tests.id('c'));
select set_config('tests.e4', public.create_expense(
  tests.id('house'), 'Own thing', 500, 'other', null, current_date, 'equal',
  jsonb_build_array(tests.payer('c', 500)), jsonb_build_array(tests.share('c', 500))
)::text, true);
select tests.as_user(tests.id('b'));
select throws_ok(format('select public.delete_expense(%L)', tests.id('e4')),
  'P0001', 'FORBIDDEN', 'a non-participant member cannot delete');
select tests.as_user(tests.id('a'));
select lives_ok(format('select public.delete_expense(%L)', tests.id('e4')),
  'an admin can delete any expense');
select is((select count(*) from public.expenses where id = tests.id('e4')), 0::bigint,
  'deleted expenses are hidden');
select throws_ok(format('select public.delete_expense(%L)', tests.id('e4')),
  'P0001', 'NOT_FOUND', 'a deleted expense cannot be deleted again');

select lives_ok(format('select public.delete_expense(%L)', tests.id('e1')), 'delete e1');
select lives_ok(format('select public.delete_expense(%L)', tests.id('e2')), 'delete e2');
select tests.as_superuser();
select is(tests.net('a', 'b'), 50::bigint, 'deleted expenses drop out of balances');
select is(tests.net('a', 'c'), 0::bigint, 'Meera is settled with Asha');
select is(public.user_has_outstanding_balance(tests.id('house'), tests.id('c')), false,
  'Meera has nothing outstanding');
select tests.as_user(tests.id('c'));
select lives_ok(format('select public.leave_house(%L)', tests.id('house')),
  'a settled member can leave');

select tests.as_superuser();
select is((select count(*) from public.activity_log
            where house_id = tests.id('house') and type like 'expense.%'),
  8::bigint, 'creates, edits and deletes are logged');

-- Grocery link
select tests.as_user(tests.id('a'));
select set_config('tests.i1', (public.add_grocery_item(tests.id('list'), 'Milk')).id::text, true);
select set_config('tests.i2', (public.add_grocery_item(tests.id('list'), 'Bread')).id::text, true);
select set_config('tests.i3', (public.add_grocery_item(tests.id('list'), 'Eggs')).id::text, true);

select throws_ok(
  format($$select public.mark_item_bought(%L, null, null, null, null, null,
            jsonb_build_object('split_method', 'equal',
              'payers', jsonb_build_array(tests.payer('a', 6000)),
              'shares', jsonb_build_array(tests.share('a', 6000))))$$, tests.id('i1')),
  'P0001', 'INVALID_INPUT', 'a split purchase needs a price');
select lives_ok(
  format($$select public.mark_item_bought(%L, null, null, 6000, null, null,
            jsonb_build_object('split_method', 'equal', 'spent_on', current_date::text,
              'payers', jsonb_build_array(tests.payer('a', 6000)),
              'shares', jsonb_build_array(tests.share('a', 3000), tests.share('b', 3000))))$$,
    tests.id('i1')),
  'marking bought with a split records an expense');
select tests.as_superuser();
select results_eq(
  format($$select e.title, e.amount_paise, e.category
             from public.expenses e
             join public.grocery_purchases p on p.id = e.purchase_id
            where p.item_id = %L$$, tests.id('i1')),
  $$values ('Milk'::text, 6000, 'groceries'::text)$$,
  'the expense is linked to the purchase');

select tests.as_user(tests.id('a'));
select isnt(public.mark_items_bought(
  tests.id('list'), array[tests.id('i2'), tests.id('i3')], 8000, null, null, null,
  jsonb_build_object('split_method', 'exact',
    'payers', jsonb_build_array(tests.payer('a', 8000)),
    'shares', jsonb_build_array(tests.share('a', 2000, 2000), tests.share('b', 6000, 6000)))),
  null, 'a batch with a split records an expense');
select tests.as_superuser();
select is((select title from public.expenses
            where batch_id is not null and house_id = tests.id('house')),
  'Bread + 1 other', 'the batch expense takes the batch label');

select tests.as_superuser();
select set_config('tests.e_milk',
  (select e.id from public.expenses e join public.grocery_purchases p on p.id = e.purchase_id
    where p.item_id = tests.id('i1'))::text, true);
update public.grocery_lists set deleted_at = now() where id = tests.id('list');
select tests.as_user(tests.id('b'));
select is((select count(*) from public.expenses where id = tests.id('e_milk')), 1::bigint,
  'deleting the list keeps the expense visible');
select tests.as_superuser();
update public.grocery_lists set deleted_at = null where id = tests.id('list');

select tests.as_user(tests.id('a'));
select set_config('tests.private',
  (public.create_grocery_list(tests.id('house'), 'Mine', '🔒', 'private')).id::text, true);
select set_config('tests.p1', (public.add_grocery_item(tests.id('private'), 'Gift')).id::text, true);
select throws_ok(
  format($$select public.mark_item_bought(%L, null, null, 6000, null, null,
            jsonb_build_object('split_method', 'equal',
              'payers', jsonb_build_array(tests.payer('a', 6000)),
              'shares', jsonb_build_array(tests.share('a', 6000))))$$, tests.id('p1')),
  'P0001', 'PRIVATE_LIST', 'private lists never produce expenses');
select lives_ok(format('select public.mark_item_bought(%L, null, null, 6000)', tests.id('p1')),
  'private purchases still work without a split');

select * from finish();
rollback;
