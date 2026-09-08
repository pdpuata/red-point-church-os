do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'sync-podcast-sermons-every-minute'
  limit 1;

  if existing_job is null then
    perform cron.schedule(
      'sync-podcast-sermons-every-minute',
      '* * * * *',
      $cron$
        select net.http_post(
          url := 'https://gvyqluwtzujefernhvfd.supabase.co/functions/v1/sync-podcast-sermons-public',
          headers := '{"Content-Type":"application/json"}'::jsonb,
          timeout_milliseconds := 20000
        );
      $cron$
    );
  end if;
end $$;
