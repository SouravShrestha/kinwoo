create or replace function public.claim_grocery_item(p_item_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
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

create or replace function public.unclaim_grocery_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
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

create or replace function public.claim_grocery_items(p_list_id uuid, p_item_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
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

update public.activity_log as a
   set payload = a.payload || jsonb_build_object('list_name', l.name)
  from public.grocery_lists as l
 where a.type in ('grocery_item.claimed', 'grocery_item.unclaimed')
   and a.payload ? 'list_id'
   and l.id = (a.payload ->> 'list_id')::uuid
   and not a.payload ? 'list_name';
