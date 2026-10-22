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
create function tests.net(p_user text, p_other text) returns bigint
language sql security definer as $$
  select coalesce((select net_paise from public.expense_pair_balances(tests.id('house'), tests.id(p_user))
                    where other_id = tests.id(p_other)), 0)
$$;
create function tests.outstanding(p_user text) returns boolean
language sql security definer as $$
  select public.user_has_outstanding_balance(tests.id('house'), tests.id(p_user))
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
select tests.as_user(tests.id('b'));
select public.join_house(current_setting('tests.code'));
select tests.as_user(tests.id('c'));
select public.join_house(current_setting('tests.code'));

-- Asha paid 300 for everyone, so Rohan and Meera each owe her 100.
select tests.as_user(tests.id('a'));
select public.create_expense(tests.id('house'), 'Rent', 30000, 'rent', null, current_date, 'equal',
  jsonb_build_array(tests.payer('a', 30000)),
  jsonb_build_array(tests.share('a', 10000), tests.share('b', 10000), tests.share('c', 10000)));
select is(tests.net('b', 'a'), -10000::bigint, 'Rohan owes Asha 100 before paying');

select tests.as_user(tests.id('b'));
select set_config('tests.s1',
  public.record_settlement(tests.id('house'), tests.id('b'), tests.id('a'), 4000)::text, true);
select is(tests.net('b', 'a'), -6000::bigint, 'the payer owes less');
select is(tests.net('a', 'b'), 6000::bigint, 'the payee is owed less, and the pair mirrors');
select results_eq(
  format('select net_paise from public.house_balances(%L) where user_id = %L',
         tests.id('house'), tests.id('a')),
  $$ values (-6000::bigint) $$,
  'house_balances reflects the payment');
select is((select sum(net_paise) from public.house_member_nets(tests.id('house'))), 0::numeric,
  'house nets still add to zero');
select is((select net_paise from public.house_member_nets(tests.id('house')) where is_self),
  -6000::bigint, 'Rohan''s net moved by the payment');

-- The receiving side can record it as well.
select tests.as_user(tests.id('a'));
select public.record_settlement(tests.id('house'), tests.id('c'), tests.id('a'), 10000);
select is(tests.net('c', 'a'), 0::bigint, 'Meera is square with Asha');
select is(tests.outstanding('c'), false,
  'a cleared balance is no longer outstanding');

select is((select count(*) from public.activity_log
            where type = 'settlement.recorded' and entity_id = tests.id('s1')), 1::bigint,
  'the payment is logged');
select is((select payload ->> 'amount_paise' from public.activity_log
            where type = 'settlement.recorded' and entity_id = tests.id('s1')), '4000',
  'the log carries the amount');

-- Rules
select tests.as_user(tests.id('b'));
select throws_ok(
  format('select public.record_settlement(%L, %L, %L, 100)',
         tests.id('house'), tests.id('a'), tests.id('c')),
  'P0001', 'FORBIDDEN', 'the caller has to be the payer or the payee');
select throws_ok(
  format('select public.record_settlement(%L, %L, %L, 100)',
         tests.id('house'), tests.id('b'), tests.id('b')),
  'P0001', 'INVALID_INPUT', 'nobody pays themselves');
select throws_ok(
  format('select public.record_settlement(%L, %L, %L, 0)',
         tests.id('house'), tests.id('b'), tests.id('a')),
  'P0001', 'INVALID_INPUT', 'the amount has to be positive');
select throws_ok(
  format('select public.record_settlement(%L, %L, %L, 1000000001)',
         tests.id('house'), tests.id('b'), tests.id('a')),
  'P0001', 'INVALID_INPUT', 'the amount has an upper limit');
select throws_ok(
  format('select public.record_settlement(%L, %L, %L, 100)',
         tests.id('house'), tests.id('b'), tests.id('x')),
  'P0001', 'NOT_A_MEMBER', 'the other side must have belonged to the house');
select throws_ok(
  format('insert into public.settlements (house_id, payer_id, payee_id, amount_paise, created_by)
          values (%L, %L, %L, 100, %L)',
         tests.id('house'), tests.id('b'), tests.id('a'), tests.id('b')),
  '42501', null, 'clients cannot write the table directly');

select tests.as_user(tests.id('x'));
select throws_ok(
  format('select public.record_settlement(%L, %L, %L, 100)',
         tests.id('house'), tests.id('x'), tests.id('a')),
  'P0001', 'FORBIDDEN', 'outsiders cannot record payments');

-- Reading
select tests.as_user(tests.id('c'));
select is((select count(*) from public.settlements), 2::bigint, 'housemates read the payments');
select tests.as_user(tests.id('x'));
select is((select count(*) from public.settlements), 0::bigint, 'outsiders read nothing');

-- A reversed payment stops counting.
reset role;
update public.settlements set reversed_at = now() where id = tests.id('s1');
select tests.as_user(tests.id('b'));
select is(tests.net('b', 'a'), -10000::bigint, 'a reversed payment no longer counts');
select is((select count(*) from public.settlements), 1::bigint, 'and is hidden from the list');

-- Editing and deleting
select tests.as_user(tests.id('b'));
select tests.net('b', 'a') as before \gset
select set_config('tests.s3',
  public.record_settlement(tests.id('house'), tests.id('b'), tests.id('a'), 2000)::text, true);
select is(tests.net('b', 'a'), :before::bigint + 2000, 'the payment moves the balance');
select public.update_settlement(tests.id('s3'), 3000);
select is(tests.net('b', 'a'), :before::bigint + 3000, 'editing it moves the balance again');
select is((select payload ->> 'previous_amount_paise' from public.activity_log
            where type = 'settlement.updated' and entity_id = tests.id('s3')), '2000',
  'the log keeps the old amount');
select public.update_settlement(tests.id('s3'), 3000);
select is((select count(*) from public.activity_log
            where type = 'settlement.updated' and entity_id = tests.id('s3')), 1::bigint,
  'an unchanged amount is not logged again');
select throws_ok(
  format('select public.update_settlement(%L, 0)', tests.id('s3')),
  'P0001', 'INVALID_INPUT', 'the new amount has to be positive');

select tests.as_user(tests.id('c'));
select public.update_settlement(tests.id('s3'), 3500);
select is(tests.net('b', 'a'), :before::bigint + 3500,
  'any housemate can edit a payment they are not part of');
select tests.as_user(tests.id('x'));
select throws_ok(
  format('select public.reverse_settlement(%L)', tests.id('s3')),
  'P0001', 'NOT_FOUND', 'outsiders cannot see it');

select tests.as_user(tests.id('c'));
select public.reverse_settlement(tests.id('s3'));
select is(tests.net('b', 'a'), :before::bigint, 'a deleted payment stops counting');
select is((select count(*) from public.activity_log
            where type = 'settlement.deleted' and entity_id = tests.id('s3')), 1::bigint,
  'the delete is logged');
select throws_ok(
  format('select public.update_settlement(%L, 100)', tests.id('s3')),
  'P0001', 'NOT_FOUND', 'a deleted payment cannot be edited');
select throws_ok(
  format('select public.reverse_settlement(%L)', tests.id('s3')),
  'P0001', 'NOT_FOUND', 'or deleted twice');

select * from finish();
rollback;
