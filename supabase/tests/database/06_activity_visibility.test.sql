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

select tests.create_user('00000000-0000-4000-8000-0000000000f1', 'admin@test.local');
select tests.create_user('00000000-0000-4000-8000-0000000000f2', 'member@test.local');

select tests.as_user('00000000-0000-4000-8000-0000000000f1');
select set_config('tests.house', (public.create_house('Flat')).id::text, true);
select set_config('tests.code',
  (select code from public.house_invites where house_id = tests.id('house')), true);

select tests.as_user('00000000-0000-4000-8000-0000000000f2');
select public.join_house(current_setting('tests.code'));
select set_config('tests.private',
  (public.create_grocery_list(tests.id('house'), 'Mine', null, 'private')).id::text, true);
select public.add_grocery_item(tests.id('private'), 'Chocolate');

select ok((select count(*) from public.activity_log
            where payload ->> 'list_id' = current_setting('tests.private')) > 0,
  'the owner sees activity on their private list');

-- f1 is the admin, but private lists stay private from admins too.
select tests.as_user('00000000-0000-4000-8000-0000000000f1');
select is((select count(*) from public.activity_log
            where payload ->> 'list_id' = current_setting('tests.private')), 0::bigint,
  'another member does not see activity on a private list');
select ok((select count(*) from public.activity_log where house_id = tests.id('house')) > 0,
  'other house activity is still visible');

-- Outsiders cannot use the helper to probe list ids.
select tests.as_user('00000000-0000-4000-8000-0000000000f3');
select is(public.activity_touches_hidden_list('grocery_list', tests.id('private'), '{}'::jsonb),
  false, 'the helper reveals nothing about another house');
select is(public.activity_touches_hidden_list(null, null,
  jsonb_build_object('list_id', 'not-a-uuid')), false, 'a malformed list id is ignored');

select * from finish();
rollback;
