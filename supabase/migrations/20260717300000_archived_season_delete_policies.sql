-- The archived-season read-only safety net (is_season_archived / restrictive
-- insert+update policies) never got a matching DELETE policy for every
-- season-scoped table. None of these tables currently have a permissive DELETE
-- policy either, so RLS's default-deny already blocks deletion today — but that
-- means the guard is silently missing rather than deliberately enforced: if a
-- future migration ever adds a delete policy to one of these tables without
-- remembering the archived-season check, deletes from an archived season would
-- slip through unnoticed. Add the restrictive delete policies now so the safety
-- net is already in place before that permissive policy ever exists.
-- Run this in the Supabase SQL Editor.

-- practice_sessions
drop policy if exists "Reject deletes from archived seasons" on public.practice_sessions;
create policy "Reject deletes from archived seasons"
on public.practice_sessions
as restrictive
for delete
using (not public.is_season_archived(season));

-- competitions
drop policy if exists "Reject deletes from archived seasons" on public.competitions;
create policy "Reject deletes from archived seasons"
on public.competitions
as restrictive
for delete
using (not public.is_season_archived(season));

-- expense_requests
drop policy if exists "Reject deletes from archived seasons" on public.expense_requests;
create policy "Reject deletes from archived seasons"
on public.expense_requests
as restrictive
for delete
using (not public.is_season_archived(season));

-- attendance_records (season via practice_sessions)
drop policy if exists "Reject deletes for archived practice seasons" on public.attendance_records;
create policy "Reject deletes for archived practice seasons"
on public.attendance_records
as restrictive
for delete
using (not public.is_practice_session_season_archived(session_id));

-- reimbursements
drop policy if exists "Reject deletes from archived seasons" on public.reimbursements;
create policy "Reject deletes from archived seasons"
on public.reimbursements
as restrictive
for delete
using (not public.is_season_archived(season));
