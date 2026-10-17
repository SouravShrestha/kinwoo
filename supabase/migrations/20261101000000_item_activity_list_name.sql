create or replace function public.add_grocery_item(
  p_list_id uuid,
  p_name text,
  p_quantity numeric default null,
  p_unit text default null,
  p_category_id uuid default null,
  p_urgency text default 'whenever',
  p_note text default null,
  p_idempotency_key text default null
) returns public.grocery_items
language plpgsql security definer set search_path = '' as $$
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

create or replace function public.update_grocery_item(
  p_item_id uuid,
  p_name text default null,
  p_quantity numeric default null,
  p_unit text default null,
  p_category_id uuid default null,
  p_urgency text default null,
  p_note text default null
) returns public.grocery_items
language plpgsql security definer set search_path = '' as $$
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

update public.activity_log as a
   set payload = a.payload || jsonb_build_object('list_name', l.name)
  from public.grocery_lists as l
 where a.type in ('grocery_item.added', 'grocery_item.updated')
   and a.payload ? 'list_id'
   and l.id = (a.payload ->> 'list_id')::uuid
   and not a.payload ? 'list_name';
