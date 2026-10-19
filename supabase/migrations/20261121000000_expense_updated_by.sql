-- Null means the expense has never been edited.
alter table public.expenses add column updated_by uuid references public.profiles (id);

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
         split_method = p_split_method,
         updated_by = v_uid
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
