-- Expense activity records who paid and who owes what, so a feed can show each viewer's own
-- stake without reading the expense again (it may since have changed).
create function public.expense_parts_snapshot(p_expense_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
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

revoke all on function public.expense_parts_snapshot(uuid) from public, anon, authenticated;

create or replace function public.insert_expense(
  p_house_id uuid,
  p_actor uuid,
  p_title text,
  p_amount_paise int,
  p_category text,
  p_note text,
  p_spent_on date,
  p_split_method text,
  p_payers jsonb,
  p_shares jsonb,
  p_purchase_id uuid default null,
  p_batch_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
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

create or replace function public.update_expense(
  p_expense_id uuid,
  p_title text,
  p_amount_paise int,
  p_category text,
  p_note text,
  p_spent_on date,
  p_split_method text,
  p_payers jsonb,
  p_shares jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
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
         split_method = p_split_method
   where id = p_expense_id;

  perform public.write_expense_parts(
    p_expense_id, v_house_id, p_amount_paise, p_split_method, p_payers, p_shares
  );

  perform public.log_activity(
    v_house_id, v_uid, 'expense.updated', 'expense', p_expense_id,
    jsonb_build_object('title', v_title, 'amount_paise', p_amount_paise, 'category', p_category)
      || public.expense_parts_snapshot(p_expense_id)
  );
end $$;

-- Entries logged before this migration carry no parts or purchase link. Created entries are
-- filled from the expense's current rows, so an expense edited since then shows its latest split.
update public.activity_log a
   set payload = a.payload
     || public.expense_parts_snapshot(a.entity_id)
     || jsonb_build_object(
          'batch_id', e.batch_id,
          'item_id', (select gp.item_id from public.grocery_purchases gp where gp.id = e.purchase_id)
        )
  from public.expenses e
 where a.type = 'expense.created'
   and e.id = a.entity_id
   and not (a.payload ? 'payers');
