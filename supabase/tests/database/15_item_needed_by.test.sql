begin;
select * from no_plan();

create function pg_temp.as_user(p_id uuid) returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function pg_temp.milk() returns uuid
language sql security definer as $$ select id from public.grocery_items where name = 'Milk' $$;
grant execute on all functions in schema pg_temp to public;

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated',
        'asha@test.local', now(), jsonb_build_object('full_name', 'Asha')),
       ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated',
        'ravi@test.local', now(), jsonb_build_object('full_name', 'Ravi'));

select pg_temp.as_user('00000000-0000-4000-8000-0000000000f1');
select set_config('tests.house', (public.create_house('Needed House', '12 Test Street, Bengaluru')).id::text, true);
select set_config('tests.list',
  (select id from public.grocery_lists
    where house_id = current_setting('tests.house')::uuid and is_default)::text, true);

select is(
  (public.add_grocery_item(current_setting('tests.list')::uuid, 'Milk', p_urgency := 'tomorrow')).needed_by,
  public.house_today() + 1,
  'tomorrow becomes a date one day out');
select is(
  (public.add_grocery_item(current_setting('tests.list')::uuid, 'Foil', p_urgency := 'whenever')).needed_by,
  null::date,
  'anytime has no date');

-- An overdue item asked for again tomorrow gets a fresh date, even with the same urgency.
reset role;
update public.grocery_items set needed_by = public.house_today() - 3 where id = pg_temp.milk();
select pg_temp.as_user('00000000-0000-4000-8000-0000000000f1');
select is(
  (public.update_grocery_item(pg_temp.milk(), p_urgency := 'tomorrow')).needed_by,
  public.house_today() + 1,
  'sending the urgency again restarts its date');
select is(
  (public.update_grocery_item(pg_temp.milk(), p_note := 'toned')).needed_by,
  public.house_today() + 1,
  'other edits leave the date alone');

-- Only the holder can say they couldn't get it, and it goes back for anyone.
reset role;
insert into public.house_members (house_id, user_id, role, status, joined_at)
values (current_setting('tests.house')::uuid, '00000000-0000-4000-8000-0000000000f2',
        'member', 'active', now());
select pg_temp.as_user('00000000-0000-4000-8000-0000000000f1');
select public.assign_grocery_item(pg_temp.milk(), '00000000-0000-4000-8000-0000000000f2');

select throws_ok(
  $$select public.mark_item_missed(pg_temp.milk())$$,
  'FORBIDDEN', 'someone who does not hold it cannot mark it missed');

select pg_temp.as_user('00000000-0000-4000-8000-0000000000f2');
select lives_ok(
  $$select public.mark_item_missed(pg_temp.milk(), 'Out of stock')$$,
  'the assignee can mark it missed');

reset role;
select is(
  (select status::text || ':' || coalesce(assigned_to::text, '-')
     from public.grocery_items where id = pg_temp.milk()),
  'pending:-', 'a missed item is back in pending with nobody on it');
select is(
  (select payload ->> 'reason' from public.activity_log
    where type = 'grocery_item.missed' and entity_id = pg_temp.milk()),
  'Out of stock', 'the reason is logged');

-- The digest counts what is due or overdue, once per house.
delete from public.activity_log where type = 'grocery.digest';
update public.grocery_items set needed_by = public.house_today() - 1 where id = pg_temp.milk();
select lives_ok('select public.queue_grocery_digest()', 'the digest runs');
select is(
  (select payload - 'day' from public.activity_log
    where type = 'grocery.digest' and house_id = current_setting('tests.house')::uuid),
  '{"total": 1, "overdue": 1, "names": ["Milk"]}'::jsonb,
  'one digest for the house, with counts and names');

select * from finish();
rollback;
