-- Per-event push settings: the activity types a person has switched off. Empty means every type is
-- on, so a type added later reaches people until they mute it. Keep the list in step with
-- PUSH_TYPES in packages/core/src/push/events.ts.
ALTER TABLE public.profiles
    ADD COLUMN muted_push_types text[] DEFAULT '{}'::text[] NOT NULL,
    ADD CONSTRAINT profiles_muted_push_types_valid CHECK (
        muted_push_types <@ ARRAY['expense.created', 'expense.updated', 'settlement.recorded',
                                  'grocery_item.assigned', 'join_requested']::text[]
    );

GRANT UPDATE(muted_push_types) ON TABLE public.profiles TO authenticated;
