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
create function tests.payer(p_user text, p_amount int) returns jsonb
language sql as $$ select jsonb_build_object('user_id', tests.id(p_user), 'amount_paise', p_amount) $$;
create function tests.share(p_user text, p_amount int) returns jsonb
language sql as $$
  select jsonb_build_object('user_id', tests.id(p_user), 'share_paise', p_amount, 'weight', null)
$$;
grant execute on all functions in schema tests to public;
select set_config('tests.a', '00000000-0000-4000-8000-0000000000f1', true);
select set_config('tests.b', '00000000-0000-4000-8000-0000000000f2', true);
select set_config('tests.x', '00000000-0000-4000-8000-0000000000f4', true);
select tests.create_user(tests.id('a'), 'asha@test.local');
select tests.create_user(tests.id('b'), 'rohan@test.local');
select tests.create_user(tests.id('x'), 'outsider@test.local');
select tests.as_user(tests.id('a'));
select set_config('tests.house', (public.create_house('Flat', '12 Test Street, Bengaluru')).id::text, true);
update public.houses set join_mode = 'anyone' where id = tests.id('house');
select set_config('tests.code',
  (select code from public.house_invites where house_id = tests.id('house')), true);
select tests.as_user(tests.id('b'));
select public.join_house(current_setting('tests.code'));
select tests.as_user(tests.id('a'));

select set_config('tests.e1',
  public.create_expense(tests.id('house'), 'Rent', 30000, 'rent', null, date '2026-09-30', 'equal',
    jsonb_build_array(tests.payer('a', 30000)),
    jsonb_build_array(tests.share('a', 10000), tests.share('b', 20000)))::text, true);
select public.create_expense(tests.id('house'), 'Wifi', 9000, 'internet', null, date '2026-10-01',
  'equal', jsonb_build_array(tests.payer('b', 9000)), jsonb_build_array(tests.share('b', 9000)));
select public.create_expense(tests.id('house'), 'Gas', 6000, 'utilities', null, date '2026-10-15',
  'equal', jsonb_build_array(tests.payer('a', 6000)),
  jsonb_build_array(tests.share('a', 3000), tests.share('b', 3000)));

select results_eq(
  format('select month, total_paise, share_paise from public.house_expense_totals(%L)',
         tests.id('house')),
  $$ values (date '2026-09-01', 30000::bigint, 10000::bigint),
            (date '2026-10-01', 15000::bigint, 3000::bigint) $$,
  'totals and the caller''s share per month');

select tests.as_user(tests.id('b'));
select results_eq(
  format('select month, share_paise from public.house_expense_totals(%L)', tests.id('house')),
  $$ values (date '2026-09-01', 20000::bigint), (date '2026-10-01', 12000::bigint) $$,
  'the share is the caller''s own');

select tests.as_user(tests.id('a'));
select public.delete_expense(tests.id('e1'));
select results_eq(
  format('select month from public.house_expense_totals(%L)', tests.id('house')),
  $$ values (date '2026-10-01') $$,
  'deleted expenses are left out');

select tests.as_user(tests.id('x'));
select throws_ok(format('select * from public.house_expense_totals(%L)', tests.id('house')),
  'P0001', 'FORBIDDEN', 'a non-member is refused');

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);
select throws_ok(format('select * from public.house_expense_totals(%L)', tests.id('house')),
  'P0001', 'NOT_AUTHENTICATED', 'the caller must be signed in');

select * from finish();
rollback;
