-- New houses start private (invited emails only). Existing houses keep their current setting.
ALTER TABLE public.houses ALTER COLUMN join_mode SET DEFAULT 'invited';
