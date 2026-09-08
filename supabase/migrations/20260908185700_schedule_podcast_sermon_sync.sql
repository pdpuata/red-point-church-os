select cron.schedule(
  'sync-podcast-sermons-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://gvyqluwtzujefernhvfd.supabase.co/functions/v1/sync-podcast-sermons-public',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000
    );
  $$
);
