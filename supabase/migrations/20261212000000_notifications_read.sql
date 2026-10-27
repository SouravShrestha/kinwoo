-- Notifications are kept and marked read instead of deleted.
ALTER TABLE public.notifications ADD COLUMN read_at timestamp with time zone;

DROP FUNCTION public.dismiss_notification(p_id uuid);
DROP FUNCTION public.clear_notifications();

CREATE FUNCTION public.mark_notification_read(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  update public.notifications set read_at = now()
    where id = p_id and user_id = v_uid and read_at is null;
end $$;

CREATE FUNCTION public.mark_notifications_read() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  update public.notifications set read_at = now()
    where user_id = v_uid and read_at is null;
end $$;

REVOKE ALL ON FUNCTION public.mark_notification_read(p_id uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.mark_notification_read(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_notification_read(p_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mark_notifications_read() FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.mark_notifications_read() TO authenticated;
GRANT ALL ON FUNCTION public.mark_notifications_read() TO service_role;
