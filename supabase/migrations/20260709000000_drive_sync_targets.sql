-- Tracks Google Drive file IDs for the Supabase → Drive projection pipeline.
-- The sync job reads/writes this table to overwrite the same files each run.
-- No secrets are stored here (OAuth tokens live in edge function secrets).

create table if not exists public.drive_sync_targets (
  key text primary key,
  drive_file_id text,
  drive_folder_id text,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text
);

grant select, insert, update, delete on public.drive_sync_targets to service_role;

alter table public.drive_sync_targets enable row level security;

insert into public.drive_sync_targets (key)
values
  ('finance_workbook'),
  ('member_workbook')
on conflict (key) do nothing;
