-- Baseline schema. Later changes go in new migrations after this one.

set check_function_bodies = false;

-- Supabase grants new objects to anon/authenticated by default. Switch that off while the
-- baseline creates them so the grants below are the only ones, then restore it at the end.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;

create extension if not exists pg_cron;

CREATE TYPE public.house_role AS ENUM (
    'admin',
    'member'
);

CREATE TYPE public.item_status AS ENUM (
    'pending',
    'claimed',
    'assigned',
    'bought',
    'cancelled'
);

CREATE TYPE public.item_urgency AS ENUM (
    'now',
    'soon',
    'today',
    'tomorrow',
    'this_week',
    'whenever'
);

CREATE TYPE public.list_visibility AS ENUM (
    'shared',
    'private'
);

CREATE TYPE public.member_status AS ENUM (
    'active',
    'pending',
    'left',
    'removed',
    'rejected'
);

CREATE FUNCTION public.activity_touches_hidden_list(p_entity_type text, p_entity_id uuid, p_payload jsonb) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  select exists (
    select 1 from public.grocery_lists l
    where l.id = any (array(
            select v::uuid
              from unnest(array[
                     case when p_entity_type = 'grocery_list' then p_entity_id::text end,
                     p_payload ->> 'list_id',
                     p_payload ->> 'from_list_id',
                     p_payload ->> 'to_list_id'
                   ]) as v
             where v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
      and l.visibility = 'private'
      and l.created_by is distinct from (select auth.uid())
      and public.is_house_member(l.house_id)
  );
$_$;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.grocery_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid,
    name text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT grocery_categories_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 40)))
);

CREATE FUNCTION public.add_grocery_category(p_house_id uuid, p_name text) RETURNS public.grocery_categories
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_pos int;
  v_cat public.grocery_categories;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if not public.is_house_member(p_house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 40 then
    raise exception 'INVALID_NAME';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_categories
   where house_id = p_house_id;

  insert into public.grocery_categories (house_id, name, position)
  values (p_house_id, btrim(p_name), v_pos)
  returning * into v_cat;

  return v_cat;
end $$;

CREATE TABLE public.grocery_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    name text NOT NULL,
    quantity numeric(10,2),
    unit text,
    category_id uuid,
    urgency public.item_urgency DEFAULT 'whenever'::public.item_urgency NOT NULL,
    status public.item_status DEFAULT 'pending'::public.item_status NOT NULL,
    claimed_by uuid,
    claimed_at timestamp with time zone,
    assigned_by uuid,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    assignment_response text,
    note text,
    idempotency_key text,
    "position" integer DEFAULT 0 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    house_id uuid NOT NULL,
    archived_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT grocery_items_assignment_response_check CHECK (((assignment_response IS NULL) OR (assignment_response = ANY (ARRAY['accepted'::text, 'declined'::text])))),
    CONSTRAINT grocery_items_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 100))),
    CONSTRAINT grocery_items_note_check CHECK (((note IS NULL) OR (char_length(note) <= 500))),
    CONSTRAINT grocery_items_unit_check CHECK (((unit IS NULL) OR (char_length(unit) <= 20)))
);

CREATE FUNCTION public.add_grocery_item(p_list_id uuid, p_name text, p_quantity numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_urgency text DEFAULT 'whenever'::text, p_note text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text) RETURNS public.grocery_items
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_list public.grocery_lists;
  v_item public.grocery_items;
  v_pos int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_list from public.grocery_lists where id = p_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if p_idempotency_key is not null then
    select * into v_item
      from public.grocery_items
     where list_id = p_list_id and idempotency_key = p_idempotency_key;
    if found then
      return v_item;
    end if;
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'INVALID_NAME';
  end if;

  if p_urgency not in ('now', 'soon', 'today', 'tomorrow', 'this_week', 'whenever') then
    raise exception 'INVALID_INPUT';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_category_id is not null then
    if not exists (
      select 1 from public.grocery_categories
       where id = p_category_id and (house_id is null or house_id = v_list.house_id)
    ) then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_items
   where list_id = p_list_id;

  insert into public.grocery_items (
    list_id, name, quantity, unit, category_id, urgency, note, idempotency_key, position, created_by
  ) values (
    p_list_id,
    btrim(p_name),
    p_quantity,
    nullif(btrim(p_unit), ''),
    p_category_id,
    p_urgency::public.item_urgency,
    nullif(p_note, ''),
    nullif(btrim(p_idempotency_key), ''),
    v_pos,
    v_uid
  ) returning * into v_item;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_item.added', 'grocery_item', v_item.id,
    jsonb_build_object('list_id', p_list_id, 'list_name', v_list.name, 'name', v_item.name)
  );

  return v_item;
end $$;

CREATE TABLE public.house_invited_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    email text NOT NULL,
    invited_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT house_invited_emails_email_check CHECK (((email = lower(btrim(email))) AND ((char_length(email) >= 3) AND (char_length(email) <= 254))))
);

CREATE FUNCTION public.add_invited_email(p_house_id uuid, p_email text) RETURNS public.house_invited_emails
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_row public.house_invited_emails;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'INVALID_EMAIL';
  end if;

  insert into public.house_invited_emails (house_id, email, invited_by)
  values (p_house_id, v_email, v_uid)
  on conflict (house_id, email) do update set email = excluded.email
  returning * into v_row;

  -- The address stays out of the payload: every member can read the activity log.
  perform public.log_activity(p_house_id, v_uid, 'email_invited', 'invited_email', v_row.id);
  return v_row;
end $_$;

CREATE FUNCTION public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
  v_assignee_name text;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, i.status, l.house_id, l.name as list_name
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id
     for update of i;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.status <> 'pending'
     and not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'ALREADY_CLAIMED';
  end if;

  if not exists (
    select 1 from public.house_members
     where house_id = v_item_rec.house_id and user_id = p_assigned_to and status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set assigned_by = v_uid,
         assigned_to = p_assigned_to,
         assigned_at = now(),
         status = 'assigned',
         assignment_response = null
   where id = p_item_id;

  select display_name into v_assignee_name from public.profiles where id = p_assigned_to;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.assigned', 'grocery_item', p_item_id,
    jsonb_build_object(
      'assigned_to', p_assigned_to,
      'assigned_to_name', v_assignee_name,
      'list_id', v_item_rec.list_id,
      'list_name', v_item_rec.list_name,
      'name', v_item_rec.name
    )
  );
end $$;

CREATE FUNCTION public.assign_grocery_items(p_list_id uuid, p_item_ids uuid[], p_assigned_to uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_assignee_name text;
  v_found int;
  v_count int := 0;
  v_item record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 or cardinality(p_item_ids) > 200 then
    raise exception 'INVALID_INPUT';
  end if;

  select l.house_id, l.name into v_house_id, v_list_name
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not exists (
    select 1 from public.house_members
     where house_id = v_house_id and user_id = p_assigned_to and status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select display_name into v_assignee_name from public.profiles where id = p_assigned_to;

  -- Lock the rows so a concurrent claim cannot slip in between the check and the update.
  perform 1 from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id
     for update;

  select count(*) into v_found
    from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id;

  if v_found <> cardinality(array(select distinct unnest(p_item_ids))) then
    raise exception 'NOT_FOUND';
  end if;

  for v_item in
    update public.grocery_items
       set assigned_by = v_uid,
           assigned_to = p_assigned_to,
           assigned_at = now(),
           status = 'assigned',
           assignment_response = null
     where id = any(p_item_ids) and list_id = p_list_id and status = 'pending'
    returning id, name
  loop
    v_count := v_count + 1;
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.assigned', 'grocery_item', v_item.id,
      jsonb_build_object(
        'assigned_to', p_assigned_to,
        'assigned_to_name', v_assignee_name,
        'list_id', p_list_id,
        'list_name', v_list_name,
        'name', v_item.name
      )
    );
  end loop;

  return v_count;
end $$;

CREATE FUNCTION public.bought_item_page(p_list_id uuid, p_before timestamp with time zone, p_limit integer) RETURNS TABLE(item_id uuid, bought_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with latest as (
    select p.item_id, max(p.bought_at) as bought_at
      from public.grocery_purchases p
      join public.grocery_items i on i.id = p.item_id
     where i.list_id = p_list_id
       and i.status = 'bought'
       and i.archived_at is null
     group by p.item_id
  ),
  page as (
    select l.item_id, l.bought_at
      from latest l
     where l.bought_at < p_before
     order by l.bought_at desc, l.item_id
     limit greatest(1, least(p_limit, 200))
  ),
  edge as (select min(bought_at) as bought_at from page)
  select l.item_id, l.bought_at
    from latest l, edge
   where l.bought_at < p_before
     and l.bought_at >= edge.bought_at
   order by l.bought_at desc, l.item_id;
$$;

CREATE FUNCTION public.can_manage_expense(p_expense_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.expenses e
     where e.id = p_expense_id
       and e.deleted_at is null
       and public.is_house_member(e.house_id)
  );
$$;

CREATE FUNCTION public.can_read_list(p_list_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.grocery_lists l
    where l.id = p_list_id
      and public.is_house_member(l.house_id)
      and (l.visibility = 'shared' or l.created_by = (select auth.uid()))
      and l.deleted_at is null
  );
$$;

CREATE FUNCTION public.cancel_grocery_item(p_item_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.created_by, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set status = 'cancelled'
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.cancelled', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );
end $$;

CREATE FUNCTION public.check_expense_fields(p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text) RETURNS void
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
begin
  if p_title is null or char_length(p_title) > 80 then raise exception 'INVALID_INPUT'; end if;
  if p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 1000000000 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_category is null or p_category not in (
    'rent', 'utilities', 'groceries', 'internet', 'household', 'food_dining', 'transport', 'other'
  ) then
    raise exception 'INVALID_INPUT';
  end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'INVALID_INPUT'; end if;
  if p_split_method is null or p_split_method not in ('equal', 'exact', 'percent', 'shares') then
    raise exception 'INVALID_INPUT';
  end if;
  -- One day of slack, so a client ahead of the server's UTC date can still record "today".
  if p_spent_on is null or p_spent_on > current_date + 1 or p_spent_on < date '2000-01-01' then
    raise exception 'INVALID_INPUT';
  end if;
end $$;

CREATE FUNCTION public.check_invite_rate_limit() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  select count(*) into v_n from public.invite_attempts
   where user_id = v_uid and created_at > now() - interval '10 minutes';
  if v_n >= 30 then raise exception 'RATE_LIMITED'; end if;
  insert into public.invite_attempts (user_id) values (v_uid);
end $$;

CREATE FUNCTION public.check_profile_avatar() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if not public.is_allowed_avatar(new.avatar_url) then
    raise exception 'INVALID_AVATAR' using errcode = '23514';
  end if;
  return new;
end $$;

CREATE FUNCTION public.claim_grocery_item(p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
  v_rows_affected int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, l.house_id, l.name as list_name
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set claimed_by = v_uid,
         claimed_at = now(),
         status = 'claimed'
   where id = p_item_id and status = 'pending';

  get diagnostics v_rows_affected = row_count;

  if v_rows_affected = 0 then
    return jsonb_build_object(
      'claimed', false,
      'claimed_by_name', (
        select p.display_name
          from public.grocery_items i
          left join public.profiles p on p.id = i.claimed_by
         where i.id = p_item_id
      )
    );
  end if;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.claimed', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'list_name', v_item_rec.list_name,
      'name', v_item_rec.name
    )
  );

  return jsonb_build_object('claimed', true);
end $$;

CREATE FUNCTION public.claim_grocery_items(p_list_id uuid, p_item_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_found int;
  v_count int := 0;
  v_item record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 or cardinality(p_item_ids) > 200 then
    raise exception 'INVALID_INPUT';
  end if;

  select l.house_id, l.name into v_house_id, v_list_name
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  perform 1 from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id
     for update;

  select count(*) into v_found
    from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id;

  if v_found <> cardinality(array(select distinct unnest(p_item_ids))) then
    raise exception 'NOT_FOUND';
  end if;

  for v_item in
    update public.grocery_items
       set claimed_by = v_uid,
           claimed_at = now(),
           status = 'claimed'
     where id = any(p_item_ids) and list_id = p_list_id and status = 'pending'
    returning id, name
  loop
    v_count := v_count + 1;
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.claimed', 'grocery_item', v_item.id,
      jsonb_build_object('list_id', p_list_id, 'list_name', v_list_name, 'name', v_item.name)
    );
  end loop;

  return v_count;
end $$;

CREATE FUNCTION public.create_expense(p_house_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;

  return public.insert_expense(
    p_house_id, v_uid, p_title, p_amount_paise, p_category, p_note, p_spent_on,
    p_split_method, p_payers, p_shares
  );
end $$;

CREATE TABLE public.grocery_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    name text NOT NULL,
    icon text DEFAULT '🛒'::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    visibility public.list_visibility DEFAULT 'shared'::public.list_visibility NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT grocery_lists_default_is_shared CHECK (((NOT is_default) OR (visibility = 'shared'::public.list_visibility))),
    CONSTRAINT grocery_lists_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 60)))
);

CREATE FUNCTION public.create_grocery_list(p_house_id uuid, p_name text, p_icon text DEFAULT '🛒'::text, p_visibility text DEFAULT 'shared'::text) RETURNS public.grocery_lists
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_pos int;
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if not public.is_house_member(p_house_id) then
    raise exception 'FORBIDDEN';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  if p_visibility not in ('shared', 'private') then
    raise exception 'INVALID_INPUT';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_lists
   where house_id = p_house_id;

  insert into public.grocery_lists (
    house_id, name, icon, position, visibility, is_default, created_by
  ) values (
    p_house_id,
    btrim(p_name),
    coalesce(nullif(btrim(p_icon), ''), '🛒'),
    v_pos,
    p_visibility::public.list_visibility,
    false,
    v_uid
  ) returning * into v_list;

  perform public.log_activity(
    p_house_id, v_uid, 'grocery_list.created', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name)
  );

  return v_list;
end $$;

CREATE TABLE public.houses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    default_split text DEFAULT 'equal'::text NOT NULL,
    require_approval boolean DEFAULT false NOT NULL,
    member_limit integer DEFAULT 15 NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    join_mode text DEFAULT 'anyone'::text NOT NULL,
    simplify_debts boolean DEFAULT false NOT NULL,
    CONSTRAINT houses_address_check CHECK (((address IS NULL) OR (char_length(address) <= 200))),
    CONSTRAINT houses_join_mode_check CHECK ((join_mode = ANY (ARRAY['anyone'::text, 'invited'::text]))),
    CONSTRAINT houses_member_limit_check CHECK (((member_limit >= 1) AND (member_limit <= 50))),
    CONSTRAINT houses_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 60)))
);

CREATE FUNCTION public.create_house(p_name text, p_address text DEFAULT NULL::text) RETURNS public.houses
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house public.houses;
  v_n int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  select count(*) into v_n from public.house_members
   where user_id = v_uid and status = 'active';
  if v_n >= public.max_houses_per_user() then raise exception 'HOUSE_LIMIT_REACHED'; end if;

  insert into public.houses (name, address, created_by)
  values (btrim(p_name), nullif(btrim(p_address), ''), v_uid)
  returning * into v_house;

  insert into public.house_members (house_id, user_id, role, status, joined_at)
  values (v_house.id, v_uid, 'admin', 'active', now());

  insert into public.house_invites (house_id, code, created_by)
  values (v_house.id, public.generate_invite_code(), v_uid);

  insert into public.grocery_lists (house_id, name, icon, position, visibility, is_default, created_by)
  values (v_house.id, 'Groceries', '🛒', 0, 'shared', true, v_uid);

  perform public.log_activity(v_house.id, v_uid, 'house_created', 'house', v_house.id,
                              jsonb_build_object('name', v_house.name));

  return v_house;
end $$;

CREATE FUNCTION public.delete_expense(p_expense_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_expense record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id, title, amount_paise, category into v_expense
    from public.expenses
   where id = p_expense_id and deleted_at is null
     for update;

  if not found or not public.is_house_member(v_expense.house_id) then
    raise exception 'NOT_FOUND';
  end if;
  if not public.can_manage_expense(p_expense_id) then raise exception 'FORBIDDEN'; end if;

  update public.expenses set deleted_at = now() where id = p_expense_id;

  update public.grocery_items
     set deleted_at = now()
   where id in (
     select p.item_id
       from public.expenses e
       join public.grocery_purchases p on p.id = e.purchase_id or p.batch_id = e.batch_id
      where e.id = p_expense_id
   );

  perform public.log_activity(
    v_expense.house_id, v_uid, 'expense.deleted', 'expense', p_expense_id,
    jsonb_build_object(
      'title', v_expense.title,
      'amount_paise', v_expense.amount_paise,
      'category', v_expense.category
    ) || public.expense_parts_snapshot(p_expense_id)
  );
end $$;

CREATE FUNCTION public.delete_grocery_item(p_item_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid      uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.status, i.created_by, i.archived_at, l.house_id
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id
     and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_item_rec.house_id) or v_item_rec.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.status = 'bought' then
    if v_item_rec.archived_at is not null then return; end if;

    -- A batch total covers all its items, so a batch is archived whole (delete_grocery_items).
    if exists (
      select 1 from public.grocery_purchases p
       where p.item_id = p_item_id and p.batch_id is not null
    ) then
      raise exception 'INVALID_INPUT';
    end if;

    update public.grocery_items set archived_at = now() where id = p_item_id;

    perform public.log_activity(
      v_item_rec.house_id, v_uid, 'grocery_item.archived', 'grocery_item', p_item_id,
      jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
    );
    return;
  end if;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.deleted', 'grocery_item', p_item_id,
    jsonb_build_object('list_id', v_item_rec.list_id, 'name', v_item_rec.name)
  );

  delete from public.grocery_items where id = p_item_id;
end $$;

CREATE FUNCTION public.delete_grocery_items(p_list_id uuid, p_item_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_is_admin boolean;
  v_count int := 0;
  v_item record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 or cardinality(p_item_ids) > 200 then
    raise exception 'INVALID_INPUT';
  end if;

  select l.house_id into v_house_id
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_is_admin := public.is_house_admin(v_house_id);

  for v_item in
    delete from public.grocery_items i
     where i.id = any(p_item_ids)
       and i.list_id = p_list_id
       and i.status <> 'bought'
       and (v_is_admin or i.created_by = v_uid)
    returning i.id, i.name
  loop
    v_count := v_count + 1;
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.deleted', 'grocery_item', v_item.id,
      jsonb_build_object('list_id', p_list_id, 'name', v_item.name)
    );
  end loop;

  for v_item in
    update public.grocery_items i
       set archived_at = now()
     where i.id = any(p_item_ids)
       and i.list_id = p_list_id
       and i.status = 'bought'
       and i.archived_at is null
       and (v_is_admin or i.created_by = v_uid)
       -- A batch is archived whole: skip it unless every live member is in the selection.
       and not exists (
         select 1
           from public.grocery_purchases mine
           join public.grocery_purchases sibling on sibling.batch_id = mine.batch_id
           join public.grocery_items other on other.id = sibling.item_id
          where mine.item_id = i.id
            and mine.batch_id is not null
            and other.archived_at is null
            and not (other.id = any(p_item_ids))
       )
    returning i.id, i.name
  loop
    v_count := v_count + 1;
    perform public.log_activity(
      v_house_id, v_uid, 'grocery_item.archived', 'grocery_item', v_item.id,
      jsonb_build_object('list_id', p_list_id, 'name', v_item.name)
    );
  end loop;

  return v_count;
end $$;

CREATE FUNCTION public.delete_grocery_list(p_list_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid  uuid := auth.uid();
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists
   where id = p_list_id and deleted_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_list.id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_list.is_default then
    raise exception 'FORBIDDEN';
  end if;

  if not (public.is_house_admin(v_list.house_id) or v_list.created_by = v_uid) then
    raise exception 'FORBIDDEN';
  end if;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.deleted', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name, 'visibility', v_list.visibility)
  );

  update public.grocery_lists
     set deleted_at = now()
   where id = p_list_id;
end $$;

CREATE FUNCTION public.expense_pair_balances(p_house_id uuid, p_user_id uuid) RETURNS TABLE(other_id uuid, net_paise bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  with owed as (
    select s.user_id as debtor,
           p.user_id as creditor,
           s.share_paise::numeric * p.amount_paise / e.amount_paise as amount
      from public.expenses e
      join public.expense_shares s on s.expense_id = e.id
      join public.expense_payers p on p.expense_id = e.id
     where e.house_id = p_house_id
       and e.deleted_at is null
       and s.user_id <> p.user_id
       and (s.user_id = p_user_id or p.user_id = p_user_id)
    union all
    select t.payee_id, t.payer_id, t.amount_paise::numeric
      from public.settlements t
     where t.house_id = p_house_id
       and t.reversed_at is null
       and (t.payer_id = p_user_id or t.payee_id = p_user_id)
  )
  select other_id, round(sum(signed))::bigint as net_paise
    from (
      select creditor as other_id, -amount as signed from owed where debtor = p_user_id
      union all
      select debtor as other_id, amount as signed from owed where creditor = p_user_id
    ) x
   group by other_id;
$$;

CREATE FUNCTION public.expense_parts_snapshot(p_expense_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select jsonb_build_object(
    'payers', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'amount_paise', p.amount_paise))
        from public.expense_payers p where p.expense_id = p_expense_id
    ), '[]'::jsonb),
    'shares', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'share_paise', s.share_paise))
        from public.expense_shares s where s.expense_id = p_expense_id
    ), '[]'::jsonb)
  );
$$;

CREATE FUNCTION public.generate_invite_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  c_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  i int;
begin
  loop
    -- Bytes 0..5 of a v4 uuid are fully random.
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(c_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.house_invites where code = v_code);
  end loop;
  return v_code;
end $$;

CREATE FUNCTION public.get_invite_preview(p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_inv public.house_invites;
  v_house public.houses;
  v_count int;
  v_status text;
  v_inviter text;
  v_inviter_avatar text;
  v_members jsonb;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  perform public.check_invite_rate_limit();

  select * into v_inv from public.house_invites where code = v_code;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  select * into v_house from public.houses
   where id = v_inv.house_id and deleted_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  select count(*) into v_count from public.house_members
   where house_id = v_house.id and status = 'active';

  if exists (select 1 from public.house_members
              where house_id = v_house.id and user_id = v_uid and status = 'active') then
    v_status := 'already_member';
  elsif v_house.join_mode = 'invited' and not public.is_invited_to_house(v_house.id, v_uid) then
    v_status := 'not_invited';
  elsif v_count >= v_house.member_limit then v_status := 'full';
  elsif (select count(*) from public.house_members
          where user_id = v_uid and status = 'active') >= public.max_houses_per_user() then
    v_status := 'house_limit';
  else v_status := 'valid';
  end if;

  -- Only reveal house details when the invite is usable.
  if v_status not in ('valid', 'already_member') then
    return jsonb_build_object('status', v_status);
  end if;

  select display_name, avatar_url into v_inviter, v_inviter_avatar
    from public.profiles where id = v_inv.created_by;

  select coalesce(jsonb_agg(jsonb_build_object('name', s.display_name, 'avatar_url', s.avatar_url)),
                  '[]'::jsonb)
    into v_members
    from (select p.display_name, p.avatar_url
            from public.house_members m
            join public.profiles p on p.id = m.user_id
           where m.house_id = v_house.id and m.status = 'active'
           order by m.joined_at
           limit 5) s;

  return jsonb_build_object(
    'status', v_status,
    'house_id', v_house.id,
    'name', v_house.name,
    'address', v_house.address,
    'member_count', v_count,
    'members', v_members,
    'invited_by', v_inviter,
    'invited_by_avatar_url', v_inviter_avatar,
    'requires_approval', v_house.require_approval
  );
end $$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_name text := left(
    nullif(
      btrim(
        regexp_replace(
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
          '[\u0001-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]', '', 'g'
        )
      ),
      ''
    ),
    40
  );
  v_avatar text := btrim(
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    v_name,
    case when v_avatar like 'https://lh3.googleusercontent.com/%' then v_avatar end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

CREATE FUNCTION public.house_balances(p_house_id uuid) RETURNS TABLE(user_id uuid, display_name text, avatar_url text, net_paise bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;

  return query
  with balances as (
    select b.other_id, b.net_paise from public.expense_pair_balances(p_house_id, v_uid) b
  ),
  people as (
    select m.user_id from public.house_members m
     where m.house_id = p_house_id and m.status = 'active' and m.user_id <> v_uid
    union
    select b.other_id from balances b where b.net_paise <> 0
  )
  select people.user_id, pr.display_name, pr.avatar_url, coalesce(b.net_paise, 0)::bigint
    from people
    left join balances b on b.other_id = people.user_id
    left join public.profiles pr on pr.id = people.user_id
   order by abs(coalesce(b.net_paise, 0)) desc, pr.display_name nulls last;
end $$;

CREATE FUNCTION public.house_expense_totals(p_house_id uuid) RETURNS TABLE(month date, total_paise bigint, share_paise bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;
  return query
  select date_trunc('month', e.spent_on)::date,
         sum(e.amount_paise)::bigint,
         coalesce(sum(s.share_paise), 0)::bigint
    from public.expenses e
    left join public.expense_shares s on s.expense_id = e.id and s.user_id = v_uid
   where e.house_id = p_house_id
     and e.deleted_at is null
   group by 1
   order by 1;
end $$;

CREATE FUNCTION public.house_member_nets(p_house_id uuid) RETURNS TABLE(user_id uuid, display_name text, avatar_url text, net_paise bigint, is_self boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;
  return query
  with people as (
    select m.user_id, bool_or(m.status = 'active') as active
      from public.house_members m
     where m.house_id = p_house_id
     group by m.user_id
  ),
  owed as (
    select s.user_id as debtor,
           p.user_id as creditor,
           s.share_paise::numeric * p.amount_paise / e.amount_paise as amount
      from public.expenses e
      join public.expense_shares s on s.expense_id = e.id
      join public.expense_payers p on p.expense_id = e.id
     where e.house_id = p_house_id
       and e.deleted_at is null
       and s.user_id <> p.user_id
    union all
    select t.payee_id, t.payer_id, t.amount_paise::numeric
      from public.settlements t
     where t.house_id = p_house_id
       and t.reversed_at is null
  ),
  pairs as (
    select x.member, round(sum(x.signed))::bigint as net
      from (
        select o.debtor as member, o.creditor as other, -o.amount as signed from owed o
        union all
        select o.creditor, o.debtor, o.amount from owed o
      ) x
     group by x.member, x.other
  ),
  nets as (
    select people.user_id, people.active,
           coalesce((select sum(pairs.net) from pairs where pairs.member = people.user_id), 0)::bigint
             as net_paise
      from people
  )
  select nets.user_id, pr.display_name, pr.avatar_url, nets.net_paise, nets.user_id = v_uid
    from nets
    left join public.profiles pr on pr.id = nets.user_id
   where nets.active or nets.net_paise <> 0
   order by nets.user_id;
end $$;

CREATE FUNCTION public.insert_expense(p_house_id uuid, p_actor uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb, p_purchase_id uuid DEFAULT NULL::uuid, p_batch_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_title text := public.normalize_expense_title(p_title);
  v_note text := nullif(btrim(p_note), '');
  v_id uuid;
begin
  perform public.check_expense_fields(
    v_title, p_amount_paise, p_category, v_note, p_spent_on, p_split_method
  );

  insert into public.expenses (
    house_id, title, amount_paise, category, note, spent_on, split_method,
    purchase_id, batch_id, created_by
  ) values (
    p_house_id, v_title, p_amount_paise, p_category, v_note, p_spent_on, p_split_method,
    p_purchase_id, p_batch_id, p_actor
  ) returning id into v_id;

  perform public.write_expense_parts(
    v_id, p_house_id, p_amount_paise, p_split_method, p_payers, p_shares
  );

  perform public.log_activity(
    p_house_id, p_actor, 'expense.created', 'expense', v_id,
    jsonb_build_object(
      'title', v_title,
      'amount_paise', p_amount_paise,
      'category', p_category,
      'source', case when p_purchase_id is not null then 'purchase'
                     when p_batch_id is not null then 'batch' end,
      'batch_id', p_batch_id,
      'item_id', (select gp.item_id from public.grocery_purchases gp where gp.id = p_purchase_id)
    ) || public.expense_parts_snapshot(v_id)
  );

  return v_id;
end $$;

CREATE FUNCTION public.insert_linked_expense(p_house_id uuid, p_actor uuid, p_title text, p_amount_paise integer, p_fallback_spent_on date, p_expense jsonb, p_purchase_id uuid, p_batch_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_spent_on date;
begin
  if jsonb_typeof(p_expense) is distinct from 'object' then raise exception 'INVALID_INPUT'; end if;

  begin
    v_spent_on := coalesce((p_expense->>'spent_on')::date, p_fallback_spent_on);
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'INVALID_INPUT';
  end;

  return public.insert_expense(
    p_house_id, p_actor, left(p_title, 80), p_amount_paise, 'groceries', null, v_spent_on,
    p_expense->>'split_method', p_expense->'payers', p_expense->'shares',
    p_purchase_id, p_batch_id
  );
end $$;

CREATE FUNCTION public.is_allowed_avatar(p_value text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select p_value is null
      or p_value like 'https://lh3.googleusercontent.com/%'
      or exists (select 1 from storage.objects o
                  where o.bucket_id = 'avatars' and o.name = p_value);
$$;

CREATE FUNCTION public.is_house_admin(p_house_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.house_members m
    join public.houses h on h.id = m.house_id
    where m.house_id = p_house_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'admin'
      and h.deleted_at is null
  );
$$;

CREATE FUNCTION public.is_house_member(p_house_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.house_members m
    join public.houses h on h.id = m.house_id
    where m.house_id = p_house_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and h.deleted_at is null
  );
$$;

CREATE FUNCTION public.is_invited_to_house(p_house_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from auth.users u
    join public.house_invited_emails e on e.email = lower(u.email)
    where u.id = p_user_id
      and u.email_confirmed_at is not null
      and e.house_id = p_house_id
  );
$$;

CREATE FUNCTION public.join_house(p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_inv public.house_invites;
  v_house public.houses;
  v_member public.house_members;
  v_count int;
  v_status public.member_status;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  perform public.check_invite_rate_limit();

  select * into v_inv from public.house_invites where code = v_code for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  -- Lock the house row so concurrent joins cannot exceed member_limit.
  select * into v_house from public.houses
   where id = v_inv.house_id and deleted_at is null for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  select * into v_member from public.house_members
   where house_id = v_house.id and user_id = v_uid;

  if found and v_member.status = 'active' then
    return jsonb_build_object('status', 'already_member', 'house_id', v_house.id);
  elsif found and v_member.status = 'pending' then
    return jsonb_build_object('status', 'pending', 'house_id', v_house.id);
  end if;

  if v_house.join_mode = 'invited' and not public.is_invited_to_house(v_house.id, v_uid) then
    return jsonb_build_object('status', 'not_invited');
  end if;

  select count(*) into v_count from public.house_members
   where house_id = v_house.id and status = 'active';
  if v_count >= v_house.member_limit then return jsonb_build_object('status', 'full'); end if;

  select count(*) into v_count from public.house_members
   where user_id = v_uid and status = 'active';
  if v_count >= public.max_houses_per_user() then
    return jsonb_build_object('status', 'house_limit');
  end if;

  -- An admin removed or turned this person away, so only an admin brings them back: either by
  -- approving the request or by inviting their email again.
  v_status := case
    when v_house.require_approval then 'pending'
    when v_member.status in ('removed', 'rejected')
         and not public.is_invited_to_house(v_house.id, v_uid) then 'pending'
    else 'active'
  end;

  -- Re-joining after leave/removal reactivates the old row as a plain member.
  insert into public.house_members (house_id, user_id, role, status, invited_by, joined_at)
  values (v_house.id, v_uid, 'member', v_status, v_inv.created_by,
          case when v_status = 'active' then now() end)
  on conflict (house_id, user_id) do update
     set status = excluded.status,
         role = 'member',
         invited_by = excluded.invited_by,
         joined_at = excluded.joined_at,
         left_at = null,
         removed_by = null;

  -- The invitation is used up: the person now shows as a member, not a pending email. Someone who
  -- is removed or leaves a restricted house has to be invited again.
  delete from public.house_invited_emails e
   using auth.users u
   where u.id = v_uid and e.house_id = v_house.id and e.email = lower(u.email);

  update public.house_invites set uses = uses + 1 where id = v_inv.id;

  perform public.log_activity(
    v_house.id, v_uid,
    case when v_status = 'active' then 'member_joined' else 'join_requested' end,
    'member', v_uid, jsonb_build_object('invite_id', v_inv.id));

  return jsonb_build_object(
    'status', case when v_status = 'active' then 'joined' else 'pending' end,
    'house_id', v_house.id);
end $$;

CREATE FUNCTION public.leave_house(p_house_id uuid, p_acknowledge_debt boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_me public.house_members;
  v_other_admins int;
  v_others int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  perform 1 from public.houses where id = p_house_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_me from public.house_members
   where house_id = p_house_id and user_id = v_uid and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  select count(*) filter (where role = 'admin'), count(*)
    into v_other_admins, v_others
    from public.house_members
   where house_id = p_house_id and status = 'active' and user_id <> v_uid;

  if v_others > 0 and v_me.role = 'admin' and v_other_admins = 0 then
    raise exception 'LAST_ADMIN';
  end if;

  if public.user_has_outstanding_balance(p_house_id, v_uid) then
    raise exception 'OUTSTANDING_BALANCE';
  end if;

  update public.house_members set status = 'left', left_at = now() where id = v_me.id;

  if v_others = 0 then
    update public.houses set deleted_at = now() where id = p_house_id;
  end if;

  perform public.log_activity(p_house_id, v_uid, 'member_left', 'member', v_uid);
end $$;

CREATE FUNCTION public.list_member_emails(p_house_id uuid) RETURNS TABLE(user_id uuid, email text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select m.user_id, u.email::text
    from public.house_members m
    join auth.users u on u.id = m.user_id
   where m.house_id = p_house_id
     and m.status = 'active'
     and public.is_house_member(p_house_id);
$$;

CREATE FUNCTION public.log_activity(p_house_id uuid, p_actor uuid, p_type text, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_payload jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.activity_log (house_id, actor_id, type, entity_type, entity_id, payload)
  values (p_house_id, p_actor, p_type, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb));
$$;

CREATE FUNCTION public.mark_item_bought(p_item_id uuid, p_quantity numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text, p_price_paise integer DEFAULT NULL::integer, p_store text DEFAULT NULL::text, p_bought_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expense jsonb DEFAULT NULL::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
  v_purchase_id uuid;
  v_bought_at timestamptz := coalesce(p_bought_at, now());
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.quantity, i.unit, i.status, i.claimed_by, i.assigned_to,
         l.house_id, l.visibility
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id
     for update of i;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.status = 'bought' then raise exception 'ALREADY_BOUGHT'; end if;

  if not (
    public.is_house_admin(v_item_rec.house_id)
    or (v_item_rec.claimed_by is not null and v_item_rec.claimed_by = v_uid)
    or (v_item_rec.assigned_to is not null and v_item_rec.assigned_to = v_uid)
    or (v_item_rec.claimed_by is null and v_item_rec.assigned_to is null)
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_price_paise is not null and p_price_paise < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_store is not null and char_length(btrim(p_store)) > 100 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_bought_at is not null and p_bought_at > now() then
    raise exception 'INVALID_INPUT';
  end if;

  if p_expense is not null then
    if v_item_rec.visibility = 'private' then raise exception 'PRIVATE_LIST'; end if;
    if p_price_paise is null or p_price_paise = 0 then raise exception 'INVALID_INPUT'; end if;
  end if;

  insert into public.grocery_purchases (
    item_id, bought_by, quantity, unit, price_paise, store, bought_at
  ) values (
    p_item_id,
    v_uid,
    coalesce(p_quantity, v_item_rec.quantity),
    coalesce(nullif(btrim(p_unit), ''), v_item_rec.unit),
    p_price_paise,
    nullif(btrim(p_store), ''),
    v_bought_at
  ) returning id into v_purchase_id;

  update public.grocery_items
     set status = 'bought'
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.bought', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'name', v_item_rec.name,
      'price_paise', p_price_paise,
      'store', nullif(btrim(p_store), '')
    )
  );

  if p_expense is not null then
    perform public.insert_linked_expense(
      v_item_rec.house_id, v_uid, v_item_rec.name, p_price_paise, v_bought_at::date,
      p_expense, v_purchase_id, null
    );
  end if;
end $$;

CREATE FUNCTION public.mark_items_bought(p_list_id uuid, p_item_ids uuid[], p_total_paise integer, p_name text DEFAULT NULL::text, p_store text DEFAULT NULL::text, p_item_prices integer[] DEFAULT NULL::integer[], p_expense jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_list_name text;
  v_visibility public.list_visibility;
  v_is_admin boolean;
  v_count int;
  v_found int;
  v_name text := nullif(btrim(p_name), '');
  v_store text := nullif(btrim(p_store), '');
  v_batch_id uuid;
  v_first_name text;
  v_label text;
  v_item record;
  v_price int;
  i int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  v_count := coalesce(cardinality(p_item_ids), 0);
  if v_count < 2 or v_count > 200 then raise exception 'INVALID_INPUT'; end if;

  if (select count(distinct x) from unnest(p_item_ids) as x) <> v_count
     or array_position(p_item_ids, null) is not null then
    raise exception 'INVALID_INPUT';
  end if;

  if p_item_prices is not null then
    if coalesce(cardinality(p_item_prices), 0) <> v_count then
      raise exception 'INVALID_INPUT';
    end if;
    if exists (select 1 from unnest(p_item_prices) as p where p < 0) then
      raise exception 'INVALID_INPUT';
    end if;
  end if;

  if p_total_paise is null or p_total_paise < 0 then raise exception 'INVALID_INPUT'; end if;
  if v_name is not null and char_length(v_name) > 60 then raise exception 'INVALID_INPUT'; end if;
  if v_store is not null and char_length(v_store) > 100 then raise exception 'INVALID_INPUT'; end if;

  select l.house_id, l.name, l.visibility into v_house_id, v_list_name, v_visibility
    from public.grocery_lists l
   where l.id = p_list_id and l.deleted_at is null;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(p_list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_expense is not null then
    if v_visibility = 'private' then raise exception 'PRIVATE_LIST'; end if;
    if p_total_paise = 0 then raise exception 'INVALID_INPUT'; end if;
  end if;

  -- Lock the rows so a concurrent single buy cannot slip in between the checks and the writes.
  perform 1 from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id
     for update;

  select count(*) into v_found
    from public.grocery_items
   where id = any(p_item_ids) and list_id = p_list_id and status <> 'cancelled';

  if v_found <> v_count then raise exception 'NOT_FOUND'; end if;

  if exists (
    select 1 from public.grocery_items
     where id = any(p_item_ids) and status = 'bought'
  ) then
    raise exception 'ALREADY_BOUGHT';
  end if;

  v_is_admin := public.is_house_admin(v_house_id);

  if not v_is_admin and exists (
    select 1 from public.grocery_items
     where id = any(p_item_ids)
       and not (
         (claimed_by is not null and claimed_by = v_uid)
         or (assigned_to is not null and assigned_to = v_uid)
         or (claimed_by is null and assigned_to is null)
       )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.grocery_purchase_batches (
    house_id, list_id, bought_by, name, total_paise, store
  ) values (
    v_house_id, p_list_id, v_uid, v_name, p_total_paise, v_store
  ) returning id into v_batch_id;

  for i in 1 .. v_count loop
    select id, name, quantity, unit into v_item
      from public.grocery_items
     where id = p_item_ids[i];

    v_price := case when p_item_prices is null then null else p_item_prices[i] end;
    if i = 1 then v_first_name := v_item.name; end if;

    insert into public.grocery_purchases (
      item_id, bought_by, quantity, unit, price_paise, store, bought_at, batch_id, batch_position
    ) values (
      v_item.id, v_uid, v_item.quantity, v_item.unit, v_price, v_store, now(), v_batch_id, i - 1
    );
  end loop;

  update public.grocery_items
     set status = 'bought'
   where id = any(p_item_ids);

  v_label := coalesce(
    v_name,
    v_first_name || ' + ' || (v_count - 1)::text
      || case when v_count - 1 = 1 then ' other' else ' others' end
  );

  perform public.log_activity(
    v_house_id, v_uid, 'grocery_batch.bought', 'grocery_purchase_batch', v_batch_id,
    jsonb_build_object(
      'list_id', p_list_id,
      'list_name', v_list_name,
      'label', v_label,
      'item_ids', to_jsonb(p_item_ids),
      'item_count', v_count,
      'total_paise', p_total_paise,
      'store', v_store
    )
  );

  if p_expense is not null then
    perform public.insert_linked_expense(
      v_house_id, v_uid, v_label, p_total_paise, now()::date, p_expense, null, v_batch_id
    );
  end if;

  return v_batch_id;
end $$;

CREATE FUNCTION public.max_houses_per_user() RETURNS integer
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select 1;
$$;

CREATE FUNCTION public.move_grocery_item(p_item_id uuid, p_target_list_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item public.grocery_items;
  v_src_list public.grocery_lists;
  v_target_list public.grocery_lists;
  v_pos int;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_item from public.grocery_items where id = p_item_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_src_list from public.grocery_lists where id = v_item.list_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into v_target_list from public.grocery_lists where id = p_target_list_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_src_list.house_id <> v_target_list.house_id then
    raise exception 'WRONG_HOUSE';
  end if;
  if not (public.can_read_list(v_src_list.id) and public.can_read_list(v_target_list.id)) then
    raise exception 'FORBIDDEN';
  end if;
  select coalesce(max(position), 0) + 1 into v_pos
    from public.grocery_items
   where list_id = p_target_list_id;
  update public.grocery_items
     set list_id = p_target_list_id,
         position = v_pos
   where id = p_item_id;
  perform public.log_activity(
    v_src_list.house_id, v_uid, 'grocery_item.moved', 'grocery_item', p_item_id,
    jsonb_build_object(
      'from_list_id', v_src_list.id,
      'to_list_id', p_target_list_id,
      'list_name', v_target_list.name,
      'name', v_item.name
    )
  );
end $$;

CREATE FUNCTION public.my_hidden_list_keys() RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce(array_agg(l.id::text), '{}')
    from public.grocery_lists l
   where l.house_id = any (public.my_house_ids())
     and l.visibility = 'private'
     and l.created_by is distinct from (select auth.uid());
$$;

CREATE FUNCTION public.my_house_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce(array_agg(m.house_id), '{}')
    from public.house_members m
    join public.houses h on h.id = m.house_id
   where m.user_id = (select auth.uid())
     and m.status = 'active'
     and h.deleted_at is null;
$$;

CREATE FUNCTION public.my_readable_list_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce(array_agg(l.id), '{}')
    from public.grocery_lists l
   where l.house_id = any (public.my_house_ids())
     and (l.visibility = 'shared' or l.created_by = (select auth.uid()))
     and l.deleted_at is null;
$$;

CREATE FUNCTION public.normalize_expense_title(p_title text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select nullif(btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g')), '');
$$;

CREATE FUNCTION public.record_settlement(p_house_id uuid, p_payer_id uuid, p_payee_id uuid, p_amount_paise integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_other uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;

  if p_payer_id is null or p_payee_id is null or p_payer_id = p_payee_id
     or p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 1000000000 then
    raise exception 'INVALID_INPUT';
  end if;
  if v_uid <> p_payer_id and v_uid <> p_payee_id then raise exception 'FORBIDDEN'; end if;

  v_other := case when v_uid = p_payer_id then p_payee_id else p_payer_id end;
  if not exists (
    select 1 from public.house_members m where m.house_id = p_house_id and m.user_id = v_other
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  insert into public.settlements (house_id, payer_id, payee_id, amount_paise, created_by)
  values (p_house_id, p_payer_id, p_payee_id, p_amount_paise, v_uid)
  returning id into v_id;

  perform public.log_activity(
    p_house_id, v_uid, 'settlement.recorded', 'settlement', v_id,
    jsonb_build_object(
      'payer_id', p_payer_id,
      'payee_id', p_payee_id,
      'payer_name', (select pr.display_name from public.profiles pr where pr.id = p_payer_id),
      'payee_name', (select pr.display_name from public.profiles pr where pr.id = p_payee_id),
      'amount_paise', p_amount_paise
    )
  );

  return v_id;
end $$;

CREATE FUNCTION public.remove_invited_email(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_house uuid;
begin
  select house_id into v_house from public.house_invited_emails where id = p_id;
  if v_house is null or not public.is_house_admin(v_house) then raise exception 'FORBIDDEN'; end if;

  delete from public.house_invited_emails where id = p_id;
  perform public.log_activity(v_house, auth.uid(), 'email_uninvited', 'invited_email', p_id);
end $$;

CREATE FUNCTION public.remove_member(p_house_id uuid, p_user_id uuid, p_keep_debt boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_target public.house_members;
  v_member_name text;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if p_user_id = v_uid then raise exception 'USE_LEAVE_HOUSE'; end if;

  perform 1 from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  if public.user_has_outstanding_balance(p_house_id, p_user_id) then
    raise exception 'OUTSTANDING_BALANCE';
  end if;

  update public.house_members
     set status = 'removed', left_at = now(), removed_by = v_uid
   where id = v_target.id;

  select display_name into v_member_name from public.profiles where id = p_user_id;

  perform public.log_activity(p_house_id, v_uid, 'member_removed', 'member', p_user_id,
                              jsonb_build_object('keep_debt', false,
                                                 'member_name', v_member_name));
end $$;

CREATE FUNCTION public.resolve_join_request(p_house_id uuid, p_user_id uuid, p_approve boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_house public.houses; v_target public.house_members; v_count int;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  select * into v_house from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'NO_PENDING_REQUEST'; end if;

  if p_approve then
    select count(*) into v_count from public.house_members
     where house_id = p_house_id and status = 'active';
    if v_count >= v_house.member_limit then raise exception 'HOUSE_FULL'; end if;

    update public.house_members set status = 'active', joined_at = now() where id = v_target.id;
    perform public.log_activity(p_house_id, auth.uid(), 'member_joined', 'member', p_user_id,
                                jsonb_build_object('approved', true));
  else
    update public.house_members set status = 'rejected' where id = v_target.id;
    perform public.log_activity(p_house_id, auth.uid(), 'join_rejected', 'member', p_user_id);
  end if;
end $$;

CREATE FUNCTION public.respond_to_assignment(p_item_id uuid, p_accept boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.assigned_to, l.house_id, l.name as list_name
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.assigned_to is distinct from v_uid then
    raise exception 'NOT_ASSIGNEE';
  end if;

  if p_accept then
    update public.grocery_items
       set assignment_response = 'accepted'
     where id = p_item_id;

    perform public.log_activity(
      v_item_rec.house_id, v_uid, 'grocery_item.assignment_accepted', 'grocery_item', p_item_id,
      jsonb_build_object(
        'list_id', v_item_rec.list_id,
        'list_name', v_item_rec.list_name,
        'name', v_item_rec.name
      )
    );
  else
    update public.grocery_items
       set assignment_response = 'declined',
           status = 'pending',
           assigned_to = null,
           assigned_by = null,
           assigned_at = null
     where id = p_item_id;

    perform public.log_activity(
      v_item_rec.house_id, v_uid, 'grocery_item.assignment_declined', 'grocery_item', p_item_id,
      jsonb_build_object(
        'list_id', v_item_rec.list_id,
        'list_name', v_item_rec.list_name,
        'name', v_item_rec.name
      )
    );
  end if;
end $$;

CREATE FUNCTION public.reverse_settlement(p_settlement_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_s record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id, payer_id, payee_id, amount_paise into v_s
    from public.settlements
   where id = p_settlement_id and reversed_at is null
     for update;

  if not found or not public.is_house_member(v_s.house_id) then raise exception 'NOT_FOUND'; end if;
  if v_uid <> v_s.payer_id and v_uid <> v_s.payee_id then raise exception 'FORBIDDEN'; end if;

  update public.settlements
     set reversed_at = now(), reversed_by = v_uid
   where id = p_settlement_id;

  perform public.log_activity(
    v_s.house_id, v_uid, 'settlement.deleted', 'settlement', p_settlement_id,
    jsonb_build_object(
      'payer_id', v_s.payer_id,
      'payee_id', v_s.payee_id,
      'payer_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payer_id),
      'payee_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payee_id),
      'amount_paise', v_s.amount_paise
    )
  );
end $$;

CREATE FUNCTION public.rotate_invite_code(p_house_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_invite public.house_invites;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  update public.house_invites
     set code = public.generate_invite_code(), uses = 0, created_by = v_uid, created_at = now()
   where house_id = p_house_id
  returning * into v_invite;
  if not found then raise exception 'NOT_FOUND'; end if;

  perform public.log_activity(
    p_house_id, v_uid, 'invite_created', 'invite', v_invite.id,
    jsonb_build_object('regenerated', true));

  return v_invite.code;
end $$;

CREATE FUNCTION public.set_grocery_item_house() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  select l.house_id into new.house_id from public.grocery_lists l where l.id = new.list_id;
  return new;
end $$;

CREATE FUNCTION public.set_member_role(p_house_id uuid, p_user_id uuid, p_role public.house_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare v_target public.house_members; v_member_name text;
begin
  if not public.is_house_admin(p_house_id) then raise exception 'FORBIDDEN'; end if;

  -- Serialises admin changes so two demotions cannot both pass the last-admin check.
  perform 1 from public.houses where id = p_house_id for update;

  select * into v_target from public.house_members
   where house_id = p_house_id and user_id = p_user_id and status = 'active';
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  if v_target.role = p_role then return; end if;

  if v_target.role = 'admin' and p_role = 'member' then
    if not exists (select 1 from public.house_members
                    where house_id = p_house_id and status = 'active'
                      and role = 'admin' and user_id <> p_user_id) then
      raise exception 'LAST_ADMIN';
    end if;
  end if;

  update public.house_members set role = p_role where id = v_target.id;

  select display_name into v_member_name from public.profiles where id = p_user_id;

  perform public.log_activity(p_house_id, auth.uid(), 'role_changed', 'member', p_user_id,
                              jsonb_build_object('from', v_target.role, 'to', p_role,
                                                 'member_name', v_member_name));
end $$;

CREATE FUNCTION public.set_simplify_debts(p_house_id uuid, p_enabled boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_current boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.is_house_member(p_house_id) then raise exception 'FORBIDDEN'; end if;
  if p_enabled is null then raise exception 'INVALID_INPUT'; end if;

  -- The row lock serialises concurrent calls, so the count below cannot be raced past.
  select simplify_debts into v_current
    from public.houses where id = p_house_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_current = p_enabled then return; end if;

  if (select count(*) from public.activity_log
       where house_id = p_house_id and actor_id = v_uid
         and type = 'simplify_debts_changed'
         and created_at > now() - interval '30 minutes') >= 2 then
    raise exception 'RATE_LIMITED';
  end if;

  update public.houses set simplify_debts = p_enabled where id = p_house_id;
  perform public.log_activity(p_house_id, v_uid, 'simplify_debts_changed', 'house', p_house_id,
                              jsonb_build_object('enabled', p_enabled));
end $$;

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE FUNCTION public.shares_house_with(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.house_members me
    join public.house_members them on them.house_id = me.house_id
    where me.user_id = (select auth.uid())
      and me.status = 'active'
      and them.user_id = p_user_id
  );
$$;

CREATE FUNCTION public.touch_lists_of_deleted_items() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  update public.grocery_lists l
     set updated_at = now()
   where l.id in (select distinct d.list_id from deleted d)
     and l.deleted_at is null;
  return null;
end $$;

CREATE FUNCTION public.unassign_grocery_item(p_item_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.status, i.created_by, i.claimed_by, i.assigned_to,
         i.assigned_by, l.house_id, l.name as list_name
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id
     for update of i;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.status = 'bought' then raise exception 'ALREADY_BOUGHT'; end if;
  if v_item_rec.status not in ('claimed', 'assigned') then raise exception 'INVALID_INPUT'; end if;

  -- coalesce: the holder columns are often null, and a null here would skip the check.
  if not coalesce(
    v_uid = v_item_rec.claimed_by
    or v_uid = v_item_rec.assigned_to
    or v_uid = v_item_rec.assigned_by
    or v_uid = v_item_rec.created_by
    or public.is_house_admin(v_item_rec.house_id),
    false
  ) then
    raise exception 'FORBIDDEN';
  end if;

  update public.grocery_items
     set status = 'pending',
         claimed_by = null,
         claimed_at = null,
         assigned_to = null,
         assigned_by = null,
         assigned_at = null,
         assignment_response = null
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.unassigned', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'list_name', v_item_rec.list_name,
      'name', v_item_rec.name
    )
  );
end $$;

CREATE FUNCTION public.unclaim_grocery_item(p_item_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select i.id, i.list_id, i.name, i.claimed_by, l.house_id, l.name as list_name
    into v_item_rec
    from public.grocery_items i
    join public.grocery_lists l on l.id = i.list_id
   where i.id = p_item_id;

  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_item_rec.list_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_item_rec.claimed_by is distinct from v_uid then
    raise exception 'NOT_CLAIMER';
  end if;

  update public.grocery_items
     set status = 'pending',
         claimed_by = null,
         claimed_at = null
   where id = p_item_id;

  perform public.log_activity(
    v_item_rec.house_id, v_uid, 'grocery_item.unclaimed', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'list_name', v_item_rec.list_name,
      'name', v_item_rec.name
    )
  );
end $$;

CREATE FUNCTION public.update_expense(p_expense_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_house_id uuid;
  v_title text := public.normalize_expense_title(p_title);
  v_note text := nullif(btrim(p_note), '');
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id into v_house_id
    from public.expenses
   where id = p_expense_id and deleted_at is null
     for update;

  if not found or not public.is_house_member(v_house_id) then raise exception 'NOT_FOUND'; end if;
  if not public.can_manage_expense(p_expense_id) then raise exception 'FORBIDDEN'; end if;

  perform public.check_expense_fields(
    v_title, p_amount_paise, p_category, v_note, p_spent_on, p_split_method
  );

  update public.expenses
     set title = v_title,
         amount_paise = p_amount_paise,
         category = p_category,
         note = v_note,
         spent_on = p_spent_on,
         split_method = p_split_method,
         updated_by = v_uid
   where id = p_expense_id;

  update public.grocery_purchases p
     set price_paise = p_amount_paise
    from public.expenses e
   where e.id = p_expense_id and p.id = e.purchase_id;

  update public.grocery_purchase_batches b
     set total_paise = p_amount_paise
    from public.expenses e
   where e.id = p_expense_id and b.id = e.batch_id;

  perform public.write_expense_parts(
    p_expense_id, v_house_id, p_amount_paise, p_split_method, p_payers, p_shares
  );

  perform public.log_activity(
    v_house_id, v_uid, 'expense.updated', 'expense', p_expense_id,
    jsonb_build_object('title', v_title, 'amount_paise', p_amount_paise, 'category', p_category)
      || public.expense_parts_snapshot(p_expense_id)
  );
end $$;

CREATE FUNCTION public.update_grocery_item(p_item_id uuid, p_name text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_urgency text DEFAULT NULL::text, p_note text DEFAULT NULL::text) RETURNS public.grocery_items
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item public.grocery_items;
  v_list public.grocery_lists;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_item from public.grocery_items where id = p_item_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into v_list from public.grocery_lists where id = v_item.list_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_list.id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (v_item.created_by = v_uid or v_item.claimed_by = v_uid or public.is_house_admin(v_list.house_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is not null and char_length(btrim(p_name)) not between 1 and 100 then
    raise exception 'INVALID_NAME';
  end if;

  if p_urgency is not null
     and p_urgency not in ('now', 'soon', 'today', 'tomorrow', 'this_week', 'whenever') then
    raise exception 'INVALID_INPUT';
  end if;

  if p_unit is not null and char_length(btrim(p_unit)) > 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_category_id is not null then
    if not exists (
      select 1 from public.grocery_categories
       where id = p_category_id and (house_id is null or house_id = v_list.house_id)
    ) then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  update public.grocery_items
     set name = case when p_name is not null then btrim(p_name) else name end,
         quantity = case when p_quantity is not null then p_quantity else quantity end,
         unit = case when p_unit is not null then nullif(btrim(p_unit), '') else unit end,
         category_id = case when p_category_id is not null then p_category_id else category_id end,
         urgency = case when p_urgency is not null then p_urgency::public.item_urgency else urgency end,
         note = case when p_note is not null then nullif(p_note, '') else note end
   where id = p_item_id
  returning * into v_item;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_item.updated', 'grocery_item', v_item.id,
    jsonb_build_object('list_id', v_item.list_id, 'list_name', v_list.name, 'name', v_item.name)
  );

  return v_item;
end $$;

CREATE FUNCTION public.update_grocery_list(p_list_id uuid, p_name text DEFAULT NULL::text, p_icon text DEFAULT NULL::text, p_visibility public.list_visibility DEFAULT NULL::public.list_visibility, p_position integer DEFAULT NULL::integer, p_is_default boolean DEFAULT NULL::boolean) RETURNS public.grocery_lists
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid  uuid := auth.uid();
  v_list public.grocery_lists;
  v_is_admin boolean;
  v_is_creator boolean;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_list from public.grocery_lists
   where id = p_list_id and deleted_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not public.can_read_list(v_list.id) then
    raise exception 'FORBIDDEN';
  end if;

  v_is_admin   := public.is_house_admin(v_list.house_id);
  v_is_creator := v_list.created_by = v_uid;

  if (p_name is not null or p_icon is not null or p_visibility is not null) then
    if not (v_is_admin or v_is_creator) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  if p_visibility is not null and not v_is_creator then
    raise exception 'FORBIDDEN';
  end if;

  if p_is_default = true and not v_is_admin then
    raise exception 'FORBIDDEN';
  end if;

  if (p_position is not null or p_is_default is not null) then
    if not (v_is_admin or v_list.visibility = 'shared' or v_is_creator) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  if p_name is not null and char_length(btrim(p_name)) not between 1 and 60 then
    raise exception 'INVALID_NAME';
  end if;

  if p_visibility = 'private' and v_list.is_default then
    raise exception 'DEFAULT_LIST_MUST_BE_PUBLIC';
  end if;

  if p_visibility = 'private' and v_list.visibility <> 'private' then
    if exists (
      select 1 from public.grocery_items i
       where i.list_id = v_list.id
         and i.status = 'assigned'
         and i.assigned_to is not null
         and i.assigned_to <> v_list.created_by
    ) then
      raise exception 'LIST_HAS_ASSIGNED_ITEMS';
    end if;
  end if;

  if p_is_default is not null then
    if p_is_default = false and v_list.is_default then
      raise exception 'FORBIDDEN';
    end if;
    if p_is_default = true then
      if coalesce(p_visibility, v_list.visibility) = 'private' then
        raise exception 'FORBIDDEN';
      end if;
    end if;
  end if;

  if coalesce(p_is_default, false) = true and not v_list.is_default then
    update public.grocery_lists
       set is_default = false
     where house_id = v_list.house_id and is_default = true;
  end if;

  update public.grocery_lists
     set name       = case when p_name       is not null then btrim(p_name) else name end,
         icon       = case when p_icon       is not null
                           then coalesce(nullif(btrim(p_icon), ''), icon)
                           else icon end,
         visibility = case when p_visibility is not null then p_visibility else visibility end,
         position   = case when p_position   is not null then p_position   else position end,
         is_default = case when p_is_default is not null then p_is_default else is_default end
   where id = p_list_id
  returning * into v_list;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_list.updated', 'grocery_list', v_list.id,
    jsonb_build_object('name', v_list.name, 'visibility', v_list.visibility)
  );

  return v_list;
end $$;

CREATE FUNCTION public.update_settlement(p_settlement_id uuid, p_amount_paise integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_s record;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select house_id, payer_id, payee_id, amount_paise into v_s
    from public.settlements
   where id = p_settlement_id and reversed_at is null
     for update;

  if not found or not public.is_house_member(v_s.house_id) then raise exception 'NOT_FOUND'; end if;
  if v_uid <> v_s.payer_id and v_uid <> v_s.payee_id then raise exception 'FORBIDDEN'; end if;
  if p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 1000000000 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_amount_paise = v_s.amount_paise then return; end if;

  update public.settlements set amount_paise = p_amount_paise where id = p_settlement_id;

  perform public.log_activity(
    v_s.house_id, v_uid, 'settlement.updated', 'settlement', p_settlement_id,
    jsonb_build_object(
      'payer_id', v_s.payer_id,
      'payee_id', v_s.payee_id,
      'payer_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payer_id),
      'payee_name', (select pr.display_name from public.profiles pr where pr.id = v_s.payee_id),
      'amount_paise', p_amount_paise,
      'previous_amount_paise', v_s.amount_paise
    )
  );
end $$;

CREATE FUNCTION public.user_has_outstanding_balance(p_house_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.expense_pair_balances(p_house_id, p_user_id) where net_paise <> 0
  );
$$;

CREATE FUNCTION public.write_expense_parts(p_expense_id uuid, p_house_id uuid, p_amount_paise integer, p_split_method text, p_payers jsonb, p_shares jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_payer_count int;
  v_share_count int;
  v_ok boolean;
begin
  if jsonb_typeof(p_payers) is distinct from 'array'
     or jsonb_typeof(p_shares) is distinct from 'array' then
    raise exception 'INVALID_INPUT';
  end if;

  v_payer_count := jsonb_array_length(p_payers);
  v_share_count := jsonb_array_length(p_shares);
  if v_payer_count < 1 or v_payer_count > 100 or v_share_count < 1 or v_share_count > 100 then
    raise exception 'INVALID_INPUT';
  end if;

  begin
    select count(user_id) = v_payer_count
           and count(distinct user_id) = v_payer_count
           and coalesce(bool_and(amount_paise > 0), false)
           and coalesce(sum(amount_paise), 0) = p_amount_paise
      into v_ok
      from jsonb_to_recordset(p_payers) as x(user_id uuid, amount_paise int);
    if not v_ok then raise exception 'INVALID_INPUT'; end if;

    select count(user_id) = v_share_count
           and count(distinct user_id) = v_share_count
           and coalesce(bool_and(share_paise >= 0), false)
           and coalesce(bool_or(share_paise > 0), false)
           and coalesce(sum(share_paise), 0) = p_amount_paise
           and case when p_split_method = 'equal'
                    then bool_and(weight is null)
                    else coalesce(bool_and(weight > 0), false) end
      into v_ok
      from jsonb_to_recordset(p_shares) as x(user_id uuid, share_paise int, weight int);
    if not v_ok then raise exception 'INVALID_INPUT'; end if;
  exception
    when invalid_text_representation or numeric_value_out_of_range or datatype_mismatch then
      raise exception 'INVALID_INPUT';
  end;

  if exists (
    select 1
      from (
        select x.user_id from jsonb_to_recordset(p_payers) as x(user_id uuid)
        union
        select x.user_id from jsonb_to_recordset(p_shares) as x(user_id uuid)
      ) u
     where not exists (
         select 1 from public.house_members m
          where m.house_id = p_house_id and m.user_id = u.user_id and m.status = 'active'
       )
       and not exists (
         select 1 from public.expense_payers p
          where p.expense_id = p_expense_id and p.user_id = u.user_id
       )
       and not exists (
         select 1 from public.expense_shares s
          where s.expense_id = p_expense_id and s.user_id = u.user_id
       )
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  delete from public.expense_payers where expense_id = p_expense_id;
  delete from public.expense_shares where expense_id = p_expense_id;

  insert into public.expense_payers (expense_id, user_id, amount_paise)
  select p_expense_id, x.user_id, x.amount_paise
    from jsonb_to_recordset(p_payers) as x(user_id uuid, amount_paise int);

  insert into public.expense_shares (expense_id, user_id, share_paise, weight)
  select p_expense_id, x.user_id, x.share_paise, x.weight
    from jsonb_to_recordset(p_shares) as x(user_id uuid, share_paise int, weight int);
end $$;

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    actor_id uuid,
    type text NOT NULL,
    entity_type text,
    entity_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.expense_payers (
    expense_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount_paise integer NOT NULL,
    CONSTRAINT expense_payers_amount_paise_check CHECK ((amount_paise > 0))
);

CREATE TABLE public.expense_shares (
    expense_id uuid NOT NULL,
    user_id uuid NOT NULL,
    share_paise integer NOT NULL,
    weight integer,
    CONSTRAINT expense_shares_share_paise_check CHECK ((share_paise >= 0)),
    CONSTRAINT expense_shares_weight_check CHECK (((weight IS NULL) OR (weight > 0)))
);

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    title text NOT NULL,
    amount_paise integer NOT NULL,
    category text NOT NULL,
    note text,
    spent_on date NOT NULL,
    split_method text NOT NULL,
    purchase_id uuid,
    batch_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    updated_by uuid,
    CONSTRAINT expenses_amount_paise_check CHECK (((amount_paise > 0) AND (amount_paise <= 1000000000))),
    CONSTRAINT expenses_category_check CHECK ((category = ANY (ARRAY['rent'::text, 'utilities'::text, 'groceries'::text, 'internet'::text, 'household'::text, 'food_dining'::text, 'transport'::text, 'other'::text]))),
    CONSTRAINT expenses_check CHECK (((purchase_id IS NULL) OR (batch_id IS NULL))),
    CONSTRAINT expenses_note_check CHECK (((note IS NULL) OR ((char_length(note) >= 1) AND (char_length(note) <= 500)))),
    CONSTRAINT expenses_split_method_check CHECK ((split_method = ANY (ARRAY['equal'::text, 'exact'::text, 'percent'::text, 'shares'::text]))),
    CONSTRAINT expenses_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 80)))
);

CREATE TABLE public.grocery_purchase_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    list_id uuid NOT NULL,
    bought_by uuid NOT NULL,
    name text,
    total_paise integer NOT NULL,
    store text,
    bought_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT grocery_purchase_batches_name_check CHECK (((name IS NULL) OR ((char_length(name) >= 1) AND (char_length(name) <= 60)))),
    CONSTRAINT grocery_purchase_batches_store_check CHECK (((store IS NULL) OR (char_length(store) <= 100))),
    CONSTRAINT grocery_purchase_batches_total_paise_check CHECK ((total_paise >= 0))
);

CREATE TABLE public.grocery_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    bought_by uuid NOT NULL,
    quantity numeric(10,2),
    unit text,
    price_paise integer,
    store text,
    bought_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    batch_id uuid,
    batch_position integer,
    CONSTRAINT grocery_purchases_batch_position_check CHECK (((batch_position IS NULL) OR (batch_position >= 0))),
    CONSTRAINT grocery_purchases_price_paise_check CHECK (((price_paise IS NULL) OR (price_paise >= 0))),
    CONSTRAINT grocery_purchases_store_check CHECK (((store IS NULL) OR (char_length(store) <= 100))),
    CONSTRAINT grocery_purchases_unit_check CHECK (((unit IS NULL) OR (char_length(unit) <= 20)))
);

CREATE TABLE public.house_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    code text NOT NULL,
    created_by uuid NOT NULL,
    uses integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT house_invites_code_check CHECK ((code ~ '^[A-HJKMNP-Z2-9]{6}$'::text))
);

CREATE TABLE public.house_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.house_role DEFAULT 'member'::public.house_role NOT NULL,
    status public.member_status DEFAULT 'active'::public.member_status NOT NULL,
    invited_by uuid,
    joined_at timestamp with time zone,
    left_at timestamp with time zone,
    removed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.invite_attempts (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.invite_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.invite_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    avatar_url text,
    locale text DEFAULT 'en'::text NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_display_name_chars CHECK ((display_name !~ '[\u0001-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]'::text)),
    CONSTRAINT profiles_display_name_length CHECK (((display_name IS NULL) OR ((char_length(btrim(display_name)) >= 1) AND (char_length(btrim(display_name)) <= 40)))),
    CONSTRAINT profiles_locale_format CHECK ((locale ~ '^[a-z]{2}(-[A-Za-z0-9]{2,8})?$'::text)),
    CONSTRAINT profiles_locale_length CHECK (((char_length(locale) >= 2) AND (char_length(locale) <= 10))),
    CONSTRAINT profiles_theme_valid CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])))
);

COMMENT ON TABLE public.profiles IS 'Per-user profile. Rows are created by the handle_new_user trigger, never by clients.';

CREATE TABLE public.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    payer_id uuid NOT NULL,
    payee_id uuid NOT NULL,
    amount_paise integer NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reversed_at timestamp with time zone,
    reversed_by uuid,
    CONSTRAINT settlements_amount_paise_check CHECK (((amount_paise > 0) AND (amount_paise <= 1000000000))),
    CONSTRAINT settlements_check CHECK ((payer_id <> payee_id))
);

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expense_payers
    ADD CONSTRAINT expense_payers_pkey PRIMARY KEY (expense_id, user_id);

ALTER TABLE ONLY public.expense_shares
    ADD CONSTRAINT expense_shares_pkey PRIMARY KEY (expense_id, user_id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_batch_id_key UNIQUE (batch_id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_purchase_id_key UNIQUE (purchase_id);

ALTER TABLE ONLY public.grocery_categories
    ADD CONSTRAINT grocery_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.grocery_lists
    ADD CONSTRAINT grocery_lists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.grocery_purchase_batches
    ADD CONSTRAINT grocery_purchase_batches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.grocery_purchases
    ADD CONSTRAINT grocery_purchases_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.house_invited_emails
    ADD CONSTRAINT house_invited_emails_house_id_email_key UNIQUE (house_id, email);

ALTER TABLE ONLY public.house_invited_emails
    ADD CONSTRAINT house_invited_emails_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.house_invites
    ADD CONSTRAINT house_invites_code_key UNIQUE (code);

ALTER TABLE ONLY public.house_invites
    ADD CONSTRAINT house_invites_house_id_key UNIQUE (house_id);

ALTER TABLE ONLY public.house_invites
    ADD CONSTRAINT house_invites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_house_id_user_id_key UNIQUE (house_id, user_id);

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invite_attempts
    ADD CONSTRAINT invite_attempts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);

CREATE INDEX activity_log_actor_idx ON public.activity_log USING btree (actor_id);

CREATE INDEX activity_log_entity_idx ON public.activity_log USING btree (entity_type, entity_id);

CREATE INDEX activity_log_house_idx ON public.activity_log USING btree (house_id, created_at DESC);

CREATE INDEX expense_payers_user_idx ON public.expense_payers USING btree (user_id);

CREATE INDEX expense_shares_user_idx ON public.expense_shares USING btree (user_id);

CREATE INDEX expenses_created_by_idx ON public.expenses USING btree (created_by);

CREATE INDEX expenses_house_spent_idx ON public.expenses USING btree (house_id, spent_on DESC, created_at DESC) WHERE (deleted_at IS NULL);

CREATE INDEX expenses_updated_by_idx ON public.expenses USING btree (updated_by);

CREATE INDEX grocery_categories_house_idx ON public.grocery_categories USING btree (house_id);

CREATE UNIQUE INDEX grocery_categories_house_name_idx ON public.grocery_categories USING btree (COALESCE(house_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

CREATE INDEX grocery_items_assigned_to_idx ON public.grocery_items USING btree (assigned_to);

CREATE INDEX grocery_items_category_idx ON public.grocery_items USING btree (category_id);

CREATE INDEX grocery_items_claimed_by_idx ON public.grocery_items USING btree (claimed_by);

CREATE INDEX grocery_items_house_idx ON public.grocery_items USING btree (house_id);

CREATE UNIQUE INDEX grocery_items_list_idempotency_idx ON public.grocery_items USING btree (list_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE INDEX grocery_items_list_status_idx ON public.grocery_items USING btree (list_id, status);

CREATE UNIQUE INDEX grocery_lists_house_name_active_idx ON public.grocery_lists USING btree (house_id, name) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX grocery_lists_one_default_idx ON public.grocery_lists USING btree (house_id) WHERE (is_default = true);

CREATE INDEX grocery_purchase_batches_house_idx ON public.grocery_purchase_batches USING btree (house_id);

CREATE INDEX grocery_purchase_batches_list_idx ON public.grocery_purchase_batches USING btree (list_id, bought_at DESC);

CREATE INDEX grocery_purchases_batch_idx ON public.grocery_purchases USING btree (batch_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX grocery_purchases_item_idx ON public.grocery_purchases USING btree (item_id);

CREATE INDEX house_members_house_active_idx ON public.house_members USING btree (house_id) WHERE (status = 'active'::public.member_status);

CREATE INDEX house_members_user_active_idx ON public.house_members USING btree (user_id) WHERE (status = 'active'::public.member_status);

CREATE INDEX invite_attempts_user_idx ON public.invite_attempts USING btree (user_id, created_at DESC);

CREATE INDEX settlements_house_idx ON public.settlements USING btree (house_id) WHERE (reversed_at IS NULL);

CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER grocery_items_set_house BEFORE INSERT OR UPDATE OF list_id, house_id ON public.grocery_items FOR EACH ROW EXECUTE FUNCTION public.set_grocery_item_house();

CREATE TRIGGER grocery_items_set_updated_at BEFORE UPDATE ON public.grocery_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER grocery_items_touch_list_on_delete AFTER DELETE ON public.grocery_items REFERENCING OLD TABLE AS deleted FOR EACH STATEMENT EXECUTE FUNCTION public.touch_lists_of_deleted_items();

CREATE TRIGGER grocery_lists_set_updated_at BEFORE UPDATE ON public.grocery_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER house_members_set_updated_at BEFORE UPDATE ON public.house_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER houses_set_updated_at BEFORE UPDATE ON public.houses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_check_avatar BEFORE INSERT OR UPDATE OF avatar_url ON public.profiles FOR EACH ROW WHEN ((new.avatar_url IS NOT NULL)) EXECUTE FUNCTION public.check_profile_avatar();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expense_payers
    ADD CONSTRAINT expense_payers_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expense_payers
    ADD CONSTRAINT expense_payers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.expense_shares
    ADD CONSTRAINT expense_shares_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expense_shares
    ADD CONSTRAINT expense_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.grocery_purchase_batches(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.grocery_purchases(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.grocery_categories
    ADD CONSTRAINT grocery_categories_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.grocery_categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.grocery_items
    ADD CONSTRAINT grocery_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.grocery_lists(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.grocery_lists
    ADD CONSTRAINT grocery_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.grocery_lists
    ADD CONSTRAINT grocery_lists_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.grocery_purchase_batches
    ADD CONSTRAINT grocery_purchase_batches_bought_by_fkey FOREIGN KEY (bought_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.grocery_purchase_batches
    ADD CONSTRAINT grocery_purchase_batches_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.grocery_purchase_batches
    ADD CONSTRAINT grocery_purchase_batches_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.grocery_lists(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.grocery_purchases
    ADD CONSTRAINT grocery_purchases_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.grocery_purchase_batches(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.grocery_purchases
    ADD CONSTRAINT grocery_purchases_bought_by_fkey FOREIGN KEY (bought_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.grocery_purchases
    ADD CONSTRAINT grocery_purchases_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.grocery_items(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.house_invited_emails
    ADD CONSTRAINT house_invited_emails_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.house_invited_emails
    ADD CONSTRAINT house_invited_emails_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.house_invites
    ADD CONSTRAINT house_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.house_invites
    ADD CONSTRAINT house_invites_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_payee_id_fkey FOREIGN KEY (payee_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.profiles(id);

CREATE POLICY "Owners can read their profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));

CREATE POLICY "Owners can update their profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_log_select ON public.activity_log FOR SELECT TO authenticated USING (((house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[])) AND (NOT (ARRAY[
CASE
    WHEN (entity_type = 'grocery_list'::text) THEN (entity_id)::text
    ELSE NULL::text
END, (payload ->> 'list_id'::text), (payload ->> 'from_list_id'::text), (payload ->> 'to_list_id'::text)] && ( SELECT public.my_hidden_list_keys() AS my_hidden_list_keys)))));

ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;

CREATE POLICY expense_payers_select ON public.expense_payers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_payers.expense_id) AND (e.deleted_at IS NULL) AND (e.house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[]))))));

ALTER TABLE public.expense_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY expense_shares_select ON public.expense_shares FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expenses e
  WHERE ((e.id = expense_shares.expense_id) AND (e.deleted_at IS NULL) AND (e.house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[]))))));

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[]))));

ALTER TABLE public.grocery_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY grocery_categories_select ON public.grocery_categories FOR SELECT TO authenticated USING (((house_id IS NULL) OR (house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[]))));

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY grocery_items_select ON public.grocery_items FOR SELECT TO authenticated USING (((list_id = ANY (( SELECT public.my_readable_list_ids() AS my_readable_list_ids)::uuid[])) AND (deleted_at IS NULL)));

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY grocery_lists_select ON public.grocery_lists FOR SELECT TO authenticated USING (((house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[])) AND ((visibility = 'shared'::public.list_visibility) OR (created_by = ( SELECT auth.uid() AS uid))) AND (deleted_at IS NULL)));

ALTER TABLE public.grocery_purchase_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY grocery_purchase_batches_select ON public.grocery_purchase_batches FOR SELECT TO authenticated USING ((list_id = ANY (( SELECT public.my_readable_list_ids() AS my_readable_list_ids)::uuid[])));

ALTER TABLE public.grocery_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY grocery_purchases_select ON public.grocery_purchases FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.grocery_items i
  WHERE ((i.id = grocery_purchases.item_id) AND (i.list_id = ANY (( SELECT public.my_readable_list_ids() AS my_readable_list_ids)::uuid[]))))));

ALTER TABLE public.house_invited_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY house_invited_emails_select_admin ON public.house_invited_emails FOR SELECT TO authenticated USING (public.is_house_admin(house_id));

ALTER TABLE public.house_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY house_invites_select_admin ON public.house_invites FOR SELECT TO authenticated USING (public.is_house_admin(house_id));

ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY house_members_select ON public.house_members FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[]))));

ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY houses_select ON public.houses FOR SELECT TO authenticated USING ((id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[])));

CREATE POLICY houses_update_admin ON public.houses FOR UPDATE TO authenticated USING (public.is_house_admin(id)) WITH CHECK (public.is_house_admin(id));

ALTER TABLE public.invite_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_housemates ON public.profiles FOR SELECT TO authenticated USING (public.shares_house_with(id));

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY settlements_select ON public.settlements FOR SELECT TO authenticated USING (((reversed_at IS NULL) AND (house_id = ANY (( SELECT public.my_house_ids() AS my_house_ids)::uuid[]))));

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.activity_touches_hidden_list(p_entity_type text, p_entity_id uuid, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.activity_touches_hidden_list(p_entity_type text, p_entity_id uuid, p_payload jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.activity_touches_hidden_list(p_entity_type text, p_entity_id uuid, p_payload jsonb) TO service_role;

GRANT ALL ON TABLE public.grocery_categories TO service_role;
GRANT SELECT ON TABLE public.grocery_categories TO authenticated;

REVOKE ALL ON FUNCTION public.add_grocery_category(p_house_id uuid, p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_grocery_category(p_house_id uuid, p_name text) TO authenticated;
GRANT ALL ON FUNCTION public.add_grocery_category(p_house_id uuid, p_name text) TO service_role;

GRANT ALL ON TABLE public.grocery_items TO service_role;
GRANT SELECT ON TABLE public.grocery_items TO authenticated;

REVOKE ALL ON FUNCTION public.add_grocery_item(p_list_id uuid, p_name text, p_quantity numeric, p_unit text, p_category_id uuid, p_urgency text, p_note text, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_grocery_item(p_list_id uuid, p_name text, p_quantity numeric, p_unit text, p_category_id uuid, p_urgency text, p_note text, p_idempotency_key text) TO authenticated;
GRANT ALL ON FUNCTION public.add_grocery_item(p_list_id uuid, p_name text, p_quantity numeric, p_unit text, p_category_id uuid, p_urgency text, p_note text, p_idempotency_key text) TO service_role;

GRANT ALL ON TABLE public.house_invited_emails TO service_role;
GRANT SELECT ON TABLE public.house_invited_emails TO authenticated;

REVOKE ALL ON FUNCTION public.add_invited_email(p_house_id uuid, p_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_invited_email(p_house_id uuid, p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.add_invited_email(p_house_id uuid, p_email text) TO service_role;

REVOKE ALL ON FUNCTION public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) TO authenticated;
GRANT ALL ON FUNCTION public.assign_grocery_item(p_item_id uuid, p_assigned_to uuid) TO service_role;

REVOKE ALL ON FUNCTION public.assign_grocery_items(p_list_id uuid, p_item_ids uuid[], p_assigned_to uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.assign_grocery_items(p_list_id uuid, p_item_ids uuid[], p_assigned_to uuid) TO authenticated;
GRANT ALL ON FUNCTION public.assign_grocery_items(p_list_id uuid, p_item_ids uuid[], p_assigned_to uuid) TO service_role;

REVOKE ALL ON FUNCTION public.bought_item_page(p_list_id uuid, p_before timestamp with time zone, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bought_item_page(p_list_id uuid, p_before timestamp with time zone, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.bought_item_page(p_list_id uuid, p_before timestamp with time zone, p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.can_manage_expense(p_expense_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_manage_expense(p_expense_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.can_read_list(p_list_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_read_list(p_list_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_read_list(p_list_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_grocery_item(p_item_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancel_grocery_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cancel_grocery_item(p_item_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.check_expense_fields(p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_expense_fields(p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text) TO service_role;

REVOKE ALL ON FUNCTION public.check_invite_rate_limit() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_invite_rate_limit() TO service_role;

REVOKE ALL ON FUNCTION public.check_profile_avatar() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_profile_avatar() TO service_role;

REVOKE ALL ON FUNCTION public.claim_grocery_item(p_item_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_grocery_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.claim_grocery_item(p_item_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.claim_grocery_items(p_list_id uuid, p_item_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_grocery_items(p_list_id uuid, p_item_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.claim_grocery_items(p_list_id uuid, p_item_ids uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.create_expense(p_house_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_expense(p_house_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_expense(p_house_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) TO service_role;

GRANT ALL ON TABLE public.grocery_lists TO service_role;
GRANT SELECT ON TABLE public.grocery_lists TO authenticated;

REVOKE ALL ON FUNCTION public.create_grocery_list(p_house_id uuid, p_name text, p_icon text, p_visibility text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_grocery_list(p_house_id uuid, p_name text, p_icon text, p_visibility text) TO authenticated;
GRANT ALL ON FUNCTION public.create_grocery_list(p_house_id uuid, p_name text, p_icon text, p_visibility text) TO service_role;

GRANT ALL ON TABLE public.houses TO service_role;
GRANT SELECT ON TABLE public.houses TO authenticated;

GRANT UPDATE(name) ON TABLE public.houses TO authenticated;

GRANT UPDATE(address) ON TABLE public.houses TO authenticated;

GRANT UPDATE(default_split) ON TABLE public.houses TO authenticated;

GRANT UPDATE(require_approval) ON TABLE public.houses TO authenticated;

GRANT UPDATE(settings) ON TABLE public.houses TO authenticated;

GRANT UPDATE(join_mode) ON TABLE public.houses TO authenticated;

REVOKE ALL ON FUNCTION public.create_house(p_name text, p_address text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_house(p_name text, p_address text) TO authenticated;
GRANT ALL ON FUNCTION public.create_house(p_name text, p_address text) TO service_role;

REVOKE ALL ON FUNCTION public.delete_expense(p_expense_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_expense(p_expense_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_expense(p_expense_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.delete_grocery_item(p_item_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_grocery_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_grocery_item(p_item_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.delete_grocery_items(p_list_id uuid, p_item_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_grocery_items(p_list_id uuid, p_item_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.delete_grocery_items(p_list_id uuid, p_item_ids uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.delete_grocery_list(p_list_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_grocery_list(p_list_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_grocery_list(p_list_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.expense_pair_balances(p_house_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.expense_pair_balances(p_house_id uuid, p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.expense_parts_snapshot(p_expense_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.expense_parts_snapshot(p_expense_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_invite_code() TO service_role;

REVOKE ALL ON FUNCTION public.get_invite_preview(p_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_invite_preview(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.get_invite_preview(p_code text) TO service_role;

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.house_balances(p_house_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.house_balances(p_house_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.house_balances(p_house_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.house_expense_totals(p_house_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.house_expense_totals(p_house_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.house_expense_totals(p_house_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.house_member_nets(p_house_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.house_member_nets(p_house_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.house_member_nets(p_house_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_expense(p_house_id uuid, p_actor uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb, p_purchase_id uuid, p_batch_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.insert_expense(p_house_id uuid, p_actor uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb, p_purchase_id uuid, p_batch_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.insert_linked_expense(p_house_id uuid, p_actor uuid, p_title text, p_amount_paise integer, p_fallback_spent_on date, p_expense jsonb, p_purchase_id uuid, p_batch_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.insert_linked_expense(p_house_id uuid, p_actor uuid, p_title text, p_amount_paise integer, p_fallback_spent_on date, p_expense jsonb, p_purchase_id uuid, p_batch_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_allowed_avatar(p_value text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_allowed_avatar(p_value text) TO service_role;

REVOKE ALL ON FUNCTION public.is_house_admin(p_house_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_house_admin(p_house_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_house_admin(p_house_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_house_member(p_house_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_house_member(p_house_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_house_member(p_house_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_invited_to_house(p_house_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_invited_to_house(p_house_id uuid, p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.join_house(p_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.join_house(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.join_house(p_code text) TO service_role;

REVOKE ALL ON FUNCTION public.leave_house(p_house_id uuid, p_acknowledge_debt boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.leave_house(p_house_id uuid, p_acknowledge_debt boolean) TO authenticated;
GRANT ALL ON FUNCTION public.leave_house(p_house_id uuid, p_acknowledge_debt boolean) TO service_role;

REVOKE ALL ON FUNCTION public.list_member_emails(p_house_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_member_emails(p_house_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.list_member_emails(p_house_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.log_activity(p_house_id uuid, p_actor uuid, p_type text, p_entity_type text, p_entity_id uuid, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_activity(p_house_id uuid, p_actor uuid, p_type text, p_entity_type text, p_entity_id uuid, p_payload jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.mark_item_bought(p_item_id uuid, p_quantity numeric, p_unit text, p_price_paise integer, p_store text, p_bought_at timestamp with time zone, p_expense jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_item_bought(p_item_id uuid, p_quantity numeric, p_unit text, p_price_paise integer, p_store text, p_bought_at timestamp with time zone, p_expense jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.mark_item_bought(p_item_id uuid, p_quantity numeric, p_unit text, p_price_paise integer, p_store text, p_bought_at timestamp with time zone, p_expense jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.mark_items_bought(p_list_id uuid, p_item_ids uuid[], p_total_paise integer, p_name text, p_store text, p_item_prices integer[], p_expense jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_items_bought(p_list_id uuid, p_item_ids uuid[], p_total_paise integer, p_name text, p_store text, p_item_prices integer[], p_expense jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.mark_items_bought(p_list_id uuid, p_item_ids uuid[], p_total_paise integer, p_name text, p_store text, p_item_prices integer[], p_expense jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.max_houses_per_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.max_houses_per_user() TO service_role;

REVOKE ALL ON FUNCTION public.move_grocery_item(p_item_id uuid, p_target_list_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.move_grocery_item(p_item_id uuid, p_target_list_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.move_grocery_item(p_item_id uuid, p_target_list_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.my_hidden_list_keys() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_hidden_list_keys() TO authenticated;
GRANT ALL ON FUNCTION public.my_hidden_list_keys() TO service_role;

REVOKE ALL ON FUNCTION public.my_house_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_house_ids() TO authenticated;
GRANT ALL ON FUNCTION public.my_house_ids() TO service_role;

REVOKE ALL ON FUNCTION public.my_readable_list_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_readable_list_ids() TO authenticated;
GRANT ALL ON FUNCTION public.my_readable_list_ids() TO service_role;

REVOKE ALL ON FUNCTION public.normalize_expense_title(p_title text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.normalize_expense_title(p_title text) TO service_role;

REVOKE ALL ON FUNCTION public.record_settlement(p_house_id uuid, p_payer_id uuid, p_payee_id uuid, p_amount_paise integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_settlement(p_house_id uuid, p_payer_id uuid, p_payee_id uuid, p_amount_paise integer) TO authenticated;
GRANT ALL ON FUNCTION public.record_settlement(p_house_id uuid, p_payer_id uuid, p_payee_id uuid, p_amount_paise integer) TO service_role;

REVOKE ALL ON FUNCTION public.remove_invited_email(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.remove_invited_email(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.remove_invited_email(p_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.remove_member(p_house_id uuid, p_user_id uuid, p_keep_debt boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.remove_member(p_house_id uuid, p_user_id uuid, p_keep_debt boolean) TO authenticated;
GRANT ALL ON FUNCTION public.remove_member(p_house_id uuid, p_user_id uuid, p_keep_debt boolean) TO service_role;

REVOKE ALL ON FUNCTION public.resolve_join_request(p_house_id uuid, p_user_id uuid, p_approve boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_join_request(p_house_id uuid, p_user_id uuid, p_approve boolean) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_join_request(p_house_id uuid, p_user_id uuid, p_approve boolean) TO service_role;

REVOKE ALL ON FUNCTION public.respond_to_assignment(p_item_id uuid, p_accept boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.respond_to_assignment(p_item_id uuid, p_accept boolean) TO authenticated;
GRANT ALL ON FUNCTION public.respond_to_assignment(p_item_id uuid, p_accept boolean) TO service_role;

REVOKE ALL ON FUNCTION public.reverse_settlement(p_settlement_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reverse_settlement(p_settlement_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reverse_settlement(p_settlement_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.rotate_invite_code(p_house_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.rotate_invite_code(p_house_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.rotate_invite_code(p_house_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.set_grocery_item_house() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_grocery_item_house() TO service_role;

REVOKE ALL ON FUNCTION public.set_member_role(p_house_id uuid, p_user_id uuid, p_role public.house_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_member_role(p_house_id uuid, p_user_id uuid, p_role public.house_role) TO authenticated;
GRANT ALL ON FUNCTION public.set_member_role(p_house_id uuid, p_user_id uuid, p_role public.house_role) TO service_role;

REVOKE ALL ON FUNCTION public.set_simplify_debts(p_house_id uuid, p_enabled boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_simplify_debts(p_house_id uuid, p_enabled boolean) TO authenticated;
GRANT ALL ON FUNCTION public.set_simplify_debts(p_house_id uuid, p_enabled boolean) TO service_role;

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.shares_house_with(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.shares_house_with(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.shares_house_with(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.touch_lists_of_deleted_items() FROM PUBLIC;
GRANT ALL ON FUNCTION public.touch_lists_of_deleted_items() TO service_role;

REVOKE ALL ON FUNCTION public.unassign_grocery_item(p_item_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unassign_grocery_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unassign_grocery_item(p_item_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.unclaim_grocery_item(p_item_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unclaim_grocery_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unclaim_grocery_item(p_item_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.update_expense(p_expense_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_expense(p_expense_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_expense(p_expense_id uuid, p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text, p_payers jsonb, p_shares jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.update_grocery_item(p_item_id uuid, p_name text, p_quantity numeric, p_unit text, p_category_id uuid, p_urgency text, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_grocery_item(p_item_id uuid, p_name text, p_quantity numeric, p_unit text, p_category_id uuid, p_urgency text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.update_grocery_item(p_item_id uuid, p_name text, p_quantity numeric, p_unit text, p_category_id uuid, p_urgency text, p_note text) TO service_role;

REVOKE ALL ON FUNCTION public.update_grocery_list(p_list_id uuid, p_name text, p_icon text, p_visibility public.list_visibility, p_position integer, p_is_default boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_grocery_list(p_list_id uuid, p_name text, p_icon text, p_visibility public.list_visibility, p_position integer, p_is_default boolean) TO authenticated;
GRANT ALL ON FUNCTION public.update_grocery_list(p_list_id uuid, p_name text, p_icon text, p_visibility public.list_visibility, p_position integer, p_is_default boolean) TO service_role;

REVOKE ALL ON FUNCTION public.update_settlement(p_settlement_id uuid, p_amount_paise integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_settlement(p_settlement_id uuid, p_amount_paise integer) TO authenticated;
GRANT ALL ON FUNCTION public.update_settlement(p_settlement_id uuid, p_amount_paise integer) TO service_role;

REVOKE ALL ON FUNCTION public.user_has_outstanding_balance(p_house_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.user_has_outstanding_balance(p_house_id uuid, p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.write_expense_parts(p_expense_id uuid, p_house_id uuid, p_amount_paise integer, p_split_method text, p_payers jsonb, p_shares jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.write_expense_parts(p_expense_id uuid, p_house_id uuid, p_amount_paise integer, p_split_method text, p_payers jsonb, p_shares jsonb) TO service_role;

GRANT ALL ON TABLE public.activity_log TO service_role;
GRANT SELECT ON TABLE public.activity_log TO authenticated;

GRANT ALL ON TABLE public.expense_payers TO service_role;
GRANT SELECT ON TABLE public.expense_payers TO authenticated;

GRANT ALL ON TABLE public.expense_shares TO service_role;
GRANT SELECT ON TABLE public.expense_shares TO authenticated;

GRANT ALL ON TABLE public.expenses TO service_role;
GRANT SELECT ON TABLE public.expenses TO authenticated;

GRANT ALL ON TABLE public.grocery_purchase_batches TO service_role;
GRANT SELECT ON TABLE public.grocery_purchase_batches TO authenticated;

GRANT ALL ON TABLE public.grocery_purchases TO service_role;
GRANT SELECT ON TABLE public.grocery_purchases TO authenticated;

GRANT ALL ON TABLE public.house_invites TO service_role;
GRANT SELECT ON TABLE public.house_invites TO authenticated;

GRANT ALL ON TABLE public.house_members TO service_role;
GRANT SELECT ON TABLE public.house_members TO authenticated;

GRANT ALL ON TABLE public.invite_attempts TO service_role;

GRANT ALL ON SEQUENCE public.invite_attempts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.invite_attempts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.invite_attempts_id_seq TO service_role;

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO authenticated;

GRANT UPDATE(display_name) ON TABLE public.profiles TO authenticated;

GRANT UPDATE(avatar_url) ON TABLE public.profiles TO authenticated;

GRANT UPDATE(locale) ON TABLE public.profiles TO authenticated;

GRANT UPDATE(theme) ON TABLE public.profiles TO authenticated;

GRANT UPDATE(notifications_enabled) ON TABLE public.profiles TO authenticated;

GRANT ALL ON TABLE public.settlements TO service_role;
GRANT SELECT ON TABLE public.settlements TO authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create policy "Signed-in users can list avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.houses, public.house_members, public.grocery_lists, public.grocery_items;
  end if;
end $$;

select cron.schedule(
  'prune-invite-attempts',
  '17 3 * * *',
  $$delete from public.invite_attempts where created_at < now() - interval '1 day'$$
);

insert into public.grocery_categories (house_id, name, position) values
  (null, 'Fruits', 1),
  (null, 'Vegetables', 2),
  (null, 'Staples', 3),
  (null, 'Spices', 4),
  (null, 'Dairy', 5),
  (null, 'Meat & Fish', 6),
  (null, 'Bakery', 7),
  (null, 'Snacks', 8),
  (null, 'Beverages', 9),
  (null, 'Household', 10),
  (null, 'Personal Care', 11),
  (null, 'Other', 12)
;

alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;

reset check_function_bodies;
