-- Schedule drive-sync Edge Function via pg_cron + pg_net.
-- Secrets live in Supabase Vault (encrypted); cron SQL never embeds the secret.
--
-- @see https://supabase.com/docs/guides/functions/schedule-functions
-- @see https://supabase.com/docs/guides/database/vault
--
-- ONE-TIME SETUP (run in SQL Editor BEFORE this migration takes effect, or
-- immediately after if the job is already scheduled):
--
--   select vault.create_secret(
--     'https://pstaxtbqfxuzfhcodfoe.supabase.co',
--     'drive_sync_project_url',
--     'Supabase project URL for drive-sync cron'
--   );
--
--   select vault.create_secret(
--     '<same value as DRIVE_SYNC_SECRET edge function secret>',
--     'drive_sync_secret',
--     'Shared secret for x-drive-sync-secret header'
--   );
--
-- To rotate the secret later, update the vault row (Dashboard → Vault) or:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'drive_sync_secret'),
--     '<new secret>'
--   );
-- Then update the matching Supabase Edge Function secret.

-- ---------------------------------------------------------------------------
-- Extensions (pg_cron is already enabled on this project; statements are idempotent)
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant usage on schema net to postgres;

-- ---------------------------------------------------------------------------
-- Invoke helper — reads URL + secret from Vault at runtime
-- ---------------------------------------------------------------------------

create or replace function public.invoke_drive_sync()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net, vault
as $$
declare
  request_id bigint;
  project_url text;
  sync_secret text;
begin
  select decrypted_secret
  into project_url
  from vault.decrypted_secrets
  where name = 'drive_sync_project_url';

  select decrypted_secret
  into sync_secret
  from vault.decrypted_secrets
  where name = 'drive_sync_secret';

  if project_url is null then
    raise exception
      'Vault secret "drive_sync_project_url" is missing. Run vault.create_secret(...) first.';
  end if;

  if sync_secret is null then
    raise exception
      'Vault secret "drive_sync_secret" is missing. Run vault.create_secret(...) first.';
  end if;

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/drive-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-drive-sync-secret', sync_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  )
  into request_id;

  return request_id;
end;
$$;

comment on function public.invoke_drive_sync() is
  'Queues an async POST to the drive-sync Edge Function. Called by pg_cron.';

revoke all on function public.invoke_drive_sync() from public;
grant execute on function public.invoke_drive_sync() to postgres;

-- ---------------------------------------------------------------------------
-- Cron job — hourly at minute 0 (UTC). Change via cron.alter_job (see below).
-- ---------------------------------------------------------------------------

do $outer$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'drive-sync-hourly'
  ) then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'drive-sync-hourly';
  end if;

  perform cron.schedule(
    'drive-sync-hourly',
    '0 * * * *', -- hourly at :00 UTC — e.g. 0 */6 * * * = every 6 hours
    $$select public.invoke_drive_sync();$$
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
--   where jobname = 'drive-sync-hourly';
--
-- VIEW recent cron runs:
--   select *
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'drive-sync-hourly')
--   order by start_time desc
--   limit 20;
--
-- VIEW recent pg_net HTTP responses (async; may lag slightly):
--   select id, status_code, timed_out, error_msg, created
--   from net._http_response
--   order by created desc
--   limit 20;
--
-- CHANGE schedule (examples):
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'drive-sync-hourly'),
--     schedule := '0 */6 * * *'  -- every 6 hours
--   );
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'drive-sync-hourly'),
--     schedule := '30 * * * *'   -- hourly at :30
--   );
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'drive-sync-hourly'),
--     schedule := '0 6 * * *'    -- daily at 06:00 UTC
--   );
--
-- PAUSE / RESUME:
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'drive-sync-hourly'),
--     active := false
--   );
--   select cron.alter_job(
--     (select jobid from cron.job where jobname = 'drive-sync-hourly'),
--     active := true
--   );
--
-- UNSCHEDULE (delete the job):
--   select cron.unschedule(
--     (select jobid from cron.job where jobname = 'drive-sync-hourly')
--   );
--
-- MANUAL test (does not wait for HTTP response):
--   select public.invoke_drive_sync();
