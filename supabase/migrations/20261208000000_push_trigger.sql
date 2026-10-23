-- Announces a few activity entries as push notifications. The trigger only queues an HTTP call
-- to the send-push Edge Function, which decides who hears about it. A push problem must never
-- fail the write that caused it, so every error is swallowed with a warning.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE FUNCTION public.notify_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_function_secret';

  if v_url is not null and v_secret is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
      body := jsonb_build_object('activity_id', new.id),
      timeout_milliseconds := 5000
    );
  end if;

  return null;
exception when others then
  raise warning 'notify_push failed: %', sqlerrm;
  return null;
end $$;

REVOKE ALL ON FUNCTION public.notify_push() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.notify_push() TO service_role;

CREATE TRIGGER activity_log_notify_push
    AFTER INSERT ON public.activity_log
    FOR EACH ROW
    WHEN (new.type IN ('expense.created', 'settlement.recorded', 'grocery_item.assigned', 'join_requested'))
    EXECUTE FUNCTION public.notify_push();
