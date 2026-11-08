-- Expands expense categories from 8 to 25 and renames 'other' -> 'others' and
-- 'food_dining' -> 'food'. Existing rows are renamed first so the tightened CHECK
-- constraint below doesn't reject them.

update public.expenses set category = 'others' where category = 'other';
update public.expenses set category = 'food' where category = 'food_dining';

alter table public.expenses
  drop constraint expenses_category_check,
  add constraint expenses_category_check check (
    category = any (array['others'::text, 'rent'::text, 'groceries'::text, 'utilities'::text, 'food'::text, 'transport'::text, 'household'::text, 'shopping'::text, 'entertainment'::text, 'subscriptions'::text, 'travel'::text, 'health'::text, 'personal_care'::text, 'clothing'::text, 'maintenance'::text, 'internet'::text, 'insurance'::text, 'loan_emi'::text, 'education'::text, 'fitness'::text, 'pets'::text, 'childcare'::text, 'furniture'::text, 'gifts'::text, 'taxes'::text])
  );

create or replace function public.check_expense_fields(p_title text, p_amount_paise integer, p_category text, p_note text, p_spent_on date, p_split_method text) returns void
    language plpgsql immutable
    set search_path to ''
    as $$
begin
  if p_title is null or char_length(p_title) > 80 then raise exception 'INVALID_INPUT'; end if;
  if p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 1000000000 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_category is null or p_category not in (
    'others', 'rent', 'groceries', 'utilities', 'food', 'transport', 'household', 'shopping', 'entertainment', 'subscriptions', 'travel', 'health', 'personal_care', 'clothing', 'maintenance', 'internet', 'insurance', 'loan_emi', 'education', 'fitness', 'pets', 'childcare', 'furniture', 'gifts', 'taxes'
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
