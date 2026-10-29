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

select set_config('tests.a', '00000000-0000-4000-8000-0000000000b1', true);
select set_config('tests.b', '00000000-0000-4000-8000-0000000000b2', true);
select set_config('tests.c', '00000000-0000-4000-8000-0000000000b3', true);
select tests.create_user(tests.id('a'), 'asha@test.local');
select tests.create_user(tests.id('b'), 'rohan@test.local');
select tests.create_user(tests.id('c'), 'meera@test.local');

select tests.as_user(tests.id('a'));
select set_config('tests.house', (public.create_house('Flat', '12 Test Street, Bengaluru')).id::text, true);
update public.houses set join_mode = 'anyone' where id = tests.id('house');
select set_config('tests.code',
  (select code from public.house_invites where house_id = tests.id('house')), true);
select set_config('tests.list',
  (select id from public.grocery_lists where house_id = tests.id('house') and is_default)::text,
  true);
select tests.as_user(tests.id('b'));
select public.join_house(current_setting('tests.code'));
select tests.as_user(tests.id('c'));
select public.join_house(current_setting('tests.code'));

-- grocery_items.house_id follows the list
select tests.as_user(tests.id('a'));
select set_config('tests.item', (public.add_grocery_item(tests.id('list'), 'Rice')).id::text, true);
select is((select house_id from public.grocery_items where id = tests.id('item')), tests.id('house'),
  'a new item takes its house from the list');
select set_config('tests.other',
  (public.create_grocery_list(tests.id('house'), 'Party', null, 'shared')).id::text, true);
select public.move_grocery_item(tests.id('item'), tests.id('other'));
select is((select house_id from public.grocery_items where id = tests.id('item')), tests.id('house'),
  'a moved item keeps the house');

-- Deleting an item touches its list so realtime clients refresh it
select tests.as_superuser();
alter table public.grocery_lists disable trigger grocery_lists_set_updated_at;
update public.grocery_lists set updated_at = now() - interval '1 hour' where id = tests.id('other');
alter table public.grocery_lists enable trigger grocery_lists_set_updated_at;
select set_config('tests.before',
  (select updated_at from public.grocery_lists where id = tests.id('other'))::text, true);
select tests.as_user(tests.id('a'));
select public.delete_grocery_item(tests.id('item'));
select ok((select updated_at from public.grocery_lists where id = tests.id('other'))
            > current_setting('tests.before')::timestamptz,
  'deleting an item bumps the list');

-- Private list items stay hidden from other members under the rewritten policies
select tests.as_user(tests.id('b'));
select set_config('tests.private',
  (public.create_grocery_list(tests.id('house'), 'Mine', null, 'private')).id::text, true);
select public.add_grocery_item(tests.id('private'), 'Chocolate');
select is((select count(*) from public.grocery_items where list_id = tests.id('private')), 1::bigint,
  'the owner reads their private items');
select tests.as_user(tests.id('a'));
select is((select count(*) from public.grocery_items where list_id = tests.id('private')), 0::bigint,
  'an admin cannot read another member''s private items');
select is((select count(*) from public.grocery_items where house_id = tests.id('house')), 0::bigint,
  'the shared lists are empty after the delete');

-- Bulk delete applies the single-item rules and reports how many went
select tests.as_user(tests.id('a'));
select set_config('tests.mine', (public.add_grocery_item(tests.id('list'), 'Salt')).id::text, true);
select tests.as_user(tests.id('b'));
select set_config('tests.theirs', (public.add_grocery_item(tests.id('list'), 'Sugar')).id::text, true);
select is(public.delete_grocery_items(tests.id('list'),
            array[tests.id('mine'), tests.id('theirs')]), 1,
  'a member deletes only their own items');
select is((select count(*) from public.grocery_items where id = tests.id('mine')), 1::bigint,
  'someone else''s item is kept');
select tests.as_user(tests.id('a'));
select is(public.delete_grocery_items(tests.id('list'), array[tests.id('mine')]), 1,
  'an admin can delete it');
select throws_ok(
  format('select public.delete_grocery_items(%L, %L)', tests.id('list'), '{}'::uuid[]),
  'P0001', 'INVALID_INPUT', 'an empty selection is refused');

-- Deleting a bought item archives it; a batch is archived whole
select set_config('tests.s1', (public.add_grocery_item(tests.id('list'), 'Soap')).id::text, true);
select set_config('tests.s2', (public.add_grocery_item(tests.id('list'), 'Towel')).id::text, true);
select set_config('tests.s3', (public.add_grocery_item(tests.id('list'), 'Brush')).id::text, true);
select public.mark_item_bought(tests.id('s1'), null, null, 100);
select public.mark_items_bought(tests.id('list'), array[tests.id('s2'), tests.id('s3')], 200);
select public.delete_grocery_item(tests.id('s1'));
select ok((select archived_at is not null from public.grocery_items where id = tests.id('s1')),
  'deleting a bought item archives it');
select is((select count(*) from public.grocery_purchases where item_id = tests.id('s1')), 1::bigint,
  'its purchase is kept');
select throws_ok(format('select public.delete_grocery_item(%L)', tests.id('s2')),
  'P0001', 'INVALID_INPUT', 'one item of a batch cannot be archived alone');
select is(public.delete_grocery_items(tests.id('list'), array[tests.id('s2')]), 0,
  'part of a batch is skipped');
select is(public.delete_grocery_items(tests.id('list'), array[tests.id('s2'), tests.id('s3')]), 2,
  'a whole batch is archived');
select is((select count(*) from public.bought_item_page(tests.id('list'), now() + interval '1 hour', 10)),
  0::bigint, 'archived items leave the bought pages');

-- Bought items page newest first without splitting a batch
select tests.as_user(tests.id('a'));
select set_config('tests.hist',
  (public.create_grocery_list(tests.id('house'), 'History', null, 'shared')).id::text, true);
select set_config('tests.h' || n,
  (public.add_grocery_item(tests.id('hist'), 'Old ' || n)).id::text, true)
  from generate_series(1, 3) n;
select public.mark_item_bought(tests.id('h' || n), null, null, 100, null,
                               now() - make_interval(days => n), null)
  from generate_series(1, 3) n;
select set_config('tests.b1', (public.add_grocery_item(tests.id('hist'), 'Batch 1')).id::text, true);
select set_config('tests.b2', (public.add_grocery_item(tests.id('hist'), 'Batch 2')).id::text, true);
select public.mark_items_bought(tests.id('hist'), array[tests.id('b1'), tests.id('b2')], 200);

select is((select count(*) from public.bought_item_page(tests.id('hist'), now() + interval '1 hour', 1)),
  2::bigint, 'a page never splits a batch, even past its limit');
select is(
  (select array_agg(item_id order by bought_at desc)
     from public.bought_item_page(tests.id('hist'), now() - interval '1 minute', 2)),
  array[tests.id('h1'), tests.id('h2')], 'older pages continue newest first');
select is((select count(*) from public.bought_item_page(tests.id('hist'), now() - interval '3 days', 5)),
  0::bigint, 'nothing before the oldest purchase');

-- house_member_nets matches the per-member pairwise sums it replaced
select public.create_expense(tests.id('house'), 'Rent', 1000, 'rent', null, current_date, 'exact',
  jsonb_build_array(tests.payer('a', 600), tests.payer('b', 400)),
  jsonb_build_array(tests.share('a', 333, 333), tests.share('b', 333, 333), tests.share('c', 334, 334)));
select public.create_expense(tests.id('house'), 'Gas', 701, 'utilities', null, current_date, 'exact',
  jsonb_build_array(tests.payer('c', 701)),
  jsonb_build_array(tests.share('a', 234, 234), tests.share('b', 233, 233), tests.share('c', 234, 234)));
select public.create_expense(tests.id('house'), 'Snacks', 99, 'groceries', null, current_date, 'exact',
  jsonb_build_array(tests.payer('b', 50), tests.payer('c', 49)),
  jsonb_build_array(tests.share('a', 33, 33), tests.share('b', 33, 33), tests.share('c', 33, 33)));

select set_config('tests.nets',
  (select array_agg(n.net_paise order by n.user_id)
     from public.house_member_nets(tests.id('house')) n)::text, true);
select tests.as_superuser();
select is(
  current_setting('tests.nets')::bigint[],
  (select array_agg(
            (select coalesce(sum(b.net_paise), 0)::bigint
               from public.expense_pair_balances(tests.id('house'), m.user_id) b)
            order by m.user_id)
     from public.house_members m where m.house_id = tests.id('house')),
  'one-pass nets equal the per-member sums');
select is((select sum(v) from unnest(current_setting('tests.nets')::bigint[]) v), 0::numeric,
  'nets balance to zero');

select * from finish();
rollback;
