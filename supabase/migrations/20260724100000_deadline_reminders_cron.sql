-- Schedule the deadline-reminders API route via pg_cron + pg_net, mirroring
-- 20260710000000_drive_sync_cron.sql. Secrets live in Supabase Vault (encrypted);
-- cron SQL never embeds the secret.
--
-- ONE-TIME SETUP (run in SQL Editor BEFORE this migration takes effect, or
-- immediately after if the job is already scheduled):
--
--   select vault.create_secret(
--     'https://pstaxtbqfxuzfhcodfoe.supabase.co',
--     'drive_sync_project_url',
--     'Supabase project URL for drive-sync cron'
--   );
--   -- (reused here too — same project URL, so skip if it already exists)
--
--   select vault.create_secret(
--     'https://<your-app-domain>',
--     'app_base_url',
--     'Base URL of the Next.js app, for calling /api/reminders/send'
--   );
--
--   select vault.create_secret(
--     '<same value as REMINDER_CRON_SECRET app env var>',
--     'reminder_cron_secret',
--     'Shared secret for x-reminder-secret header'
--   );
--
-- To rotate the secret later, update the vault row (Dashboard → Vault) or:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'reminder_cron_secret'),
--     '<new secret>'
--   );
-- Then update the matching REMINDER_CRON_SECRET app env var.

-- ---------------------------------------------------------------------------
-- Extensions (already enabled by 20260710000000_drive_sync_cron.sql; idempotent)
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant usage on schema net to postgres;

-- ---------------------------------------------------------------------------
-- Invoke helper — reads base URL + secret from Vault at runtime
-- ---------------------------------------------------------------------------

create or replace function public.invoke_deadline_reminders()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net, vault
as $$
declare
  request_id bigint;
  app_base_url text;
  cron_secret text;
begin
  select decrypted_secret
  into app_base_url
  from vault.decrypted_secrets
  where name = 'app_base_url';

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'reminder_cron_secret';

  if app_base_url is null then
    raise exception
      'Vault secret "app_base_url" is missing. Run vault.create_secret(...) first.';
  end if;

  if cron_secret is null then
    raise exception
      'Vault secret "reminder_cron_secret" is missing. Run vault.create_secret(...) first.';
  end if;

  select net.http_post(
    url := rtrim(app_base_url, '/') || '/api/reminders/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  )
  into request_id;

  return request_id;
end;
$$;

comment on function public.invoke_deadline_reminders() is
  'Queues an async POST to /api/reminders/send. Called by pg_cron.';

revoke all on function public.invoke_deadline_reminders() from public;
grant execute on function public.invoke_deadline_reminders() to postgres;

-- ---------------------------------------------------------------------------
-- Cron job — daily at 13:00 UTC (~8/9am ET). Change via cron.alter_job (see below).
-- ---------------------------------------------------------------------------

do $outer$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'deadline-reminders-daily'
  ) then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'deadline-reminders-daily';
  end if;

  perform cron.schedule(
    'deadline-reminders-daily',
    '0 13 * * *', -- daily at 13:00 UTC
    $$select public.invoke_deadline_reminders();$$
  );
end;
$outer$;

-- ---------------------------------------------------------------------------
-- Admin queries (run manually in SQL Editor)
-- ---------------------------------------------------------------------------
--
-- VIEW the job:
--   select jobid, jobname, schedule, command, active
--   from cron.job
--   where jobname = 'deadline-reminders-daily';
--
-- VIEW recent cron runs:
--   select *
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'deadline-reminders-daily')
--   order by start_time desc
--   limit 20;
--
-- VIEW recent pg_net HTTP responses (async; may lag slightly):
--   select id, status_code, timed_out, error_msg, created
--   from net._http_response
--   order by created desc
--   limit 20;
--
-- CHANGE schedule (example — daily at 06:00 UTC instead):
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'deadline-reminders-daily'),
--     schedule := '0 6 * * *'
--   );
--
-- PAUSE / RESUME:
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'deadline-reminders-daily'),
--     active := false
--   );
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'deadline-reminders-daily'),
--     active := true
--   );
--
-- UNSCHEDULE (delete the job):
--   select cron.unschedule(
--     (select jobid from cron.job where jobname = 'deadline-reminders-daily')
--   );
--
-- MANUAL test (does not wait for HTTP response):
--   select public.invoke_deadline_reminders();
