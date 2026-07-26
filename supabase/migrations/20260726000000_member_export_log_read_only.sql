-- The member export log is now shown on the members page, so everyone with HROS
-- access can see who exported which member data and when. Reading it already works
-- for every HROS user (public.is_exec_user()), but a log is only worth reading if
-- nobody using the app can write to it. The export route inserts with the service
-- role key, which bypasses RLS entirely, so the authenticated insert grant buys
-- nothing and would let a captain or team manager forge or pad entries by calling
-- PostgREST directly. Revoke every write privilege instead.
-- Run this in the Supabase SQL Editor.

drop policy if exists "Team managers can log member exports" on public.member_export_log;

-- truncate and trigger matter as much as the write privileges here. RLS only
-- filters select, insert, update and delete, so a truncate grant is not gated by
-- any policy - it would let a role empty the whole log in one statement, which is
-- the exact failure the log exists to survive. trigger would let one be attached
-- that rewrites rows on the way in. Supabase's default grant on public hands both
-- to anon and authenticated, so they have to be taken back explicitly.
revoke insert, update, delete, truncate, references, trigger
  on public.member_export_log from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.member_export_log from anon;

-- select stays granted and stays gated by the read policy above, which is scoped
-- to authenticated, so the grant anon carries never resolves to a row.

-- The view reads the newest exports first, capped to a page's worth.
create index if not exists member_export_log_exported_at_idx
  on public.member_export_log (exported_at desc);
