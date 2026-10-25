-- New houses start with simplify debts on. Existing houses keep their current setting.
ALTER TABLE public.houses ALTER COLUMN simplify_debts SET DEFAULT true;
