-- Keep newly-created public objects closed by default. Each migration must grant the
-- exact access its client roles need.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;

-- Hosted migrations run as supabase_admin. Local migrations run as postgres, which
-- cannot alter another role's defaults, so apply this branch only where permitted.
DO $$
BEGIN
  IF current_user = 'supabase_admin' OR pg_has_role(current_user, 'supabase_admin', 'member') THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
      REVOKE ALL ON TABLES FROM anon, authenticated, service_role';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
      REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
      REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role';
  END IF;
END
$$;

-- This internal rate-limit sequence is used by security-definer database code only.
REVOKE ALL ON SEQUENCE public.invite_attempts_id_seq FROM anon, authenticated;
