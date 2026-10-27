-- In-app inbox: one row per person the send-push function told about an activity entry. Rows are
-- written by that function only, and deleted when the person opens or clears them.
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_user_activity_key UNIQUE (user_id, activity_id),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT notifications_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activity_log(id) ON DELETE CASCADE
);

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC, id DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

CREATE FUNCTION public.dismiss_notification(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  delete from public.notifications where id = p_id and user_id = v_uid;
end $$;

CREATE FUNCTION public.clear_notifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  delete from public.notifications where user_id = v_uid;
end $$;

REVOKE ALL ON FUNCTION public.dismiss_notification(p_id uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.dismiss_notification(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.dismiss_notification(p_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.clear_notifications() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.clear_notifications() TO authenticated;
GRANT ALL ON FUNCTION public.clear_notifications() TO service_role;
