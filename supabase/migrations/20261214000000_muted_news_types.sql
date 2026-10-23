-- News & updates and Tips & ideas can be muted too. Nothing sends them yet. Keep the list in step
-- with PUSH_EVENTS and NEWS_EVENTS in packages/core/src/push/events.ts.
ALTER TABLE public.profiles
    DROP CONSTRAINT profiles_muted_push_types_valid,
    ADD CONSTRAINT profiles_muted_push_types_valid CHECK (
        muted_push_types <@ ARRAY['expense.created', 'expense.updated', 'settlement.recorded',
                                  'grocery_item.assigned', 'join_requested', 'news', 'tips']::text[]
    );
