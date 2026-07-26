-- The member export log is now shown on the members page, so everyone with HROS
-- access can see who exported which member data and when. Reading it already works
-- for every HROS user (public.is_exec_user()), but a log is only worth reading if
-- nobody using the app can write to it. The export route inserts with the service
-- role key, which bypasses RLS entirely, so the authenticated insert grant buys
-- nothing and would let a captain or team manager forge or pad entries by calling
-- PostgREST directly. Revoke every write privilege instead.
-- Run this in the Supabase SQL Editor.

drop policy if exists "Team managers can log member exports" on public.member_export_log;

revoke insert, update, delete on public.member_export_log from authenticated;
revoke insert, update, delete on public.member_export_log from anon;

-- The view reads the newest exports first, capped to a page's worth.
create index if not exists member_export_log_exported_at_idx
  on public.member_export_log (exported_at desc);
