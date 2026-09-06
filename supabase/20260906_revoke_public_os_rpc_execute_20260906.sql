-- Red Point Church OS — remove inherited PUBLIC execution as well as explicit anon execution.
-- Applied to production Supabase on 2026-09-06.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'os_%'
  LOOP
    EXECUTE format('revoke execute on function %s from public', r.fn);
    EXECUTE format('revoke execute on function %s from anon', r.fn);
  END LOOP;
END $$;
