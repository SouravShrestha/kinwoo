create or replace function public.delete_expense(p_expense_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
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

  perform public.log_activity(
    v_expense.house_id, v_uid, 'expense.deleted', 'expense', p_expense_id,
    jsonb_build_object(
      'title', v_expense.title,
      'amount_paise', v_expense.amount_paise,
      'category', v_expense.category
    ) || public.expense_parts_snapshot(p_expense_id)
  );
end $$;

-- Soft-deleted expenses keep their payers and shares, so earlier deletions can be filled in.
update public.activity_log a
   set payload = a.payload || public.expense_parts_snapshot(a.entity_id)
  from public.expenses e
 where a.type = 'expense.deleted'
   and e.id = a.entity_id
   and not (a.payload ? 'payers');
