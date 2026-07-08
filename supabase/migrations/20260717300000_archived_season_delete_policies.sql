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

-- Defined defensively here too (create or replace is a no-op if it already exists)
-- in case the original archived-season-readonly migration was never applied.
create or replace function public.is_season_archived(p_season text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.seasons s
    where s.label = p_season
      and s.is_archived = true
  );
$$;

create or replace function public.is_practice_session_season_archived(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_season_archived((
    select ps.season
    from public.practice_sessions ps
    where ps.id = p_session_id
  ));
$$;

grant execute on function public.is_season_archived(text) to anon, authenticated;
grant execute on function public.is_practice_session_season_archived(uuid) to anon, authenticated;

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
