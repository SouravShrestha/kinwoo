-- Needed-by dates. The urgency picked ("Tomorrow") is stored as the day it means, so items move
-- from tomorrow to today to overdue as days pass instead of keeping a stale label forever.
-- ponytail: every house runs on India time (house_today); add houses.time_zone when one doesn't.

CREATE FUNCTION public.house_today() RETURNS date
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- Mirrors neededByFor in packages/core/src/grocery/needed-by.ts.
CREATE FUNCTION public.urgency_needed_by(p_urgency public.item_urgency, p_today date DEFAULT public.house_today()) RETURNS date
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select case p_urgency
    when 'now' then p_today
    when 'today' then p_today
    when 'tomorrow' then p_today + 1
    when 'this_week' then p_today + 6
  end
$$;

REVOKE ALL ON FUNCTION public.house_today() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.house_today() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.urgency_needed_by(public.item_urgency, date) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.urgency_needed_by(public.item_urgency, date) TO authenticated, service_role;

ALTER TABLE public.grocery_items ADD COLUMN needed_by date;

UPDATE public.grocery_items
   SET needed_by = public.urgency_needed_by(urgency, (created_at at time zone 'Asia/Kolkata')::date)
 WHERE status IN ('pending', 'claimed', 'assigned');

CREATE INDEX grocery_items_house_needed_by_idx ON public.grocery_items USING btree (house_id, needed_by)
    WHERE needed_by IS NOT NULL;

-- Every insert path (the RPC, moves, seeds) gets its date without each one setting it.
CREATE FUNCTION public.set_grocery_item_needed_by() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.needed_by is null then
    new.needed_by := public.urgency_needed_by(new.urgency);
  end if;
  return new;
end $$;

CREATE TRIGGER grocery_items_set_needed_by BEFORE INSERT ON public.grocery_items
    FOR EACH ROW EXECUTE FUNCTION public.set_grocery_item_needed_by();

-- Same as before, plus: sending an urgency always restarts its date, even the same one, so
-- "Need it tomorrow" on an overdue item moves it on.
CREATE OR REPLACE FUNCTION public.update_grocery_item(p_item_id uuid, p_name text DEFAULT NULL::text, p_quantity numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_urgency text DEFAULT NULL::text, p_note text DEFAULT NULL::text) RETURNS public.grocery_items
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
         needed_by = case
           when p_urgency is not null then public.urgency_needed_by(p_urgency::public.item_urgency)
           else needed_by
         end,
         note = case when p_note is not null then nullif(p_note, '') else note end
   where id = p_item_id
  returning * into v_item;

  perform public.log_activity(
    v_list.house_id, v_uid, 'grocery_item.updated', 'grocery_item', v_item.id,
    jsonb_build_object('list_id', v_item.list_id, 'list_name', v_list.name, 'name', v_item.name)
  );

  return v_item;
end $$;

-- Same as before, plus the urgency in the activity payload, so a "Now" item can be pushed.
CREATE OR REPLACE FUNCTION public.add_grocery_item(p_list_id uuid, p_name text, p_quantity numeric DEFAULT NULL::numeric, p_unit text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_urgency text DEFAULT 'whenever'::text, p_note text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text) RETURNS public.grocery_items
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
    jsonb_build_object(
      'list_id', p_list_id, 'list_name', v_list.name, 'name', v_item.name, 'urgency', p_urgency
    )
  );

  return v_item;
end $$;

-- "Couldn't get": the holder tried and failed, so the item goes back to pending for anyone else
-- and whoever added it hears why.
CREATE FUNCTION public.mark_item_missed(p_item_id uuid, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_item_rec record;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if v_reason is not null and char_length(v_reason) > 80 then
    raise exception 'INVALID_INPUT';
  end if;

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
  if not coalesce(v_uid = v_item_rec.claimed_by or v_uid = v_item_rec.assigned_to, false) then
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
    v_item_rec.house_id, v_uid, 'grocery_item.missed', 'grocery_item', p_item_id,
    jsonb_build_object(
      'list_id', v_item_rec.list_id,
      'list_name', v_item_rec.list_name,
      'name', v_item_rec.name,
      'created_by', v_item_rec.created_by,
      'reason', v_reason
    )
  );
end $$;

REVOKE ALL ON FUNCTION public.mark_item_missed(uuid, text) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.mark_item_missed(uuid, text) TO authenticated, service_role;

-- One morning entry per house with something due or overdue on a shared list; send-push turns it
-- into a single notification per member. Private lists stay out: only their creator sees them.
CREATE FUNCTION public.queue_grocery_digest() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_today date := public.house_today();
  v_row record;
begin
  for v_row in
    select i.house_id,
           count(*)::int as total,
           count(*) filter (where i.needed_by < v_today)::int as overdue,
           (array_agg(i.name order by i.needed_by, i.created_at))[1:3] as names
      from public.grocery_items i
      join public.grocery_lists l on l.id = i.list_id
      join public.houses h on h.id = i.house_id
     where i.needed_by <= v_today
       and i.status in ('pending', 'claimed', 'assigned')
       and i.deleted_at is null
       and l.deleted_at is null
       and l.visibility = 'shared'
       and h.deleted_at is null
     group by i.house_id
  loop
    perform public.log_activity(
      v_row.house_id, null, 'grocery.digest', null, null,
      jsonb_build_object(
        'total', v_row.total, 'overdue', v_row.overdue, 'names', to_jsonb(v_row.names), 'day', v_today
      )
    );
  end loop;
end $$;

REVOKE ALL ON FUNCTION public.queue_grocery_digest() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.queue_grocery_digest() TO service_role;

-- 02:30 UTC is 08:00 in India.
SELECT cron.schedule('grocery-digest', '30 2 * * *', $$select public.queue_grocery_digest()$$);

DROP TRIGGER activity_log_notify_push ON public.activity_log;

CREATE TRIGGER activity_log_notify_push
    AFTER INSERT ON public.activity_log
    FOR EACH ROW
    WHEN (
      new.type IN ('expense.created', 'expense.updated', 'settlement.recorded',
                   'grocery_item.assigned', 'join_requested', 'grocery_item.missed', 'grocery.digest')
      OR (new.type = 'grocery_item.added' AND new.payload ->> 'urgency' = 'now')
    )
    EXECUTE FUNCTION public.notify_push();

-- Keep in step with PUSH_EVENTS and NEWS_EVENTS in packages/core/src/push/events.ts.
ALTER TABLE public.profiles
    DROP CONSTRAINT profiles_muted_push_types_valid,
    ADD CONSTRAINT profiles_muted_push_types_valid CHECK (
        muted_push_types <@ ARRAY['expense.created', 'expense.updated', 'settlement.recorded',
                                  'grocery_item.assigned', 'grocery_item.added',
                                  'grocery_item.missed', 'grocery.digest', 'join_requested',
                                  'news', 'tips']::text[]
    );
