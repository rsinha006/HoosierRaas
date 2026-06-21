-- Reject writes to rows whose season belongs to an archived season (§9 safety net).
-- Run this in the Supabase SQL Editor.

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

create or replace function public.is_competition_season_archived(p_competition_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_season_archived((
    select c.season
    from public.competitions c
    where c.id = p_competition_id
  ));
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
grant execute on function public.is_competition_season_archived(uuid) to anon, authenticated;
grant execute on function public.is_practice_session_season_archived(uuid) to anon, authenticated;

-- budgets
drop policy if exists "Reject inserts into archived seasons" on public.budgets;
create policy "Reject inserts into archived seasons"
on public.budgets
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.budgets;
create policy "Reject updates to archived seasons"
on public.budgets
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

drop policy if exists "Reject deletes from archived seasons" on public.budgets;
create policy "Reject deletes from archived seasons"
on public.budgets
as restrictive
for delete
using (not public.is_season_archived(season));

-- iufb_line_items
drop policy if exists "Reject inserts into archived seasons" on public.iufb_line_items;
create policy "Reject inserts into archived seasons"
on public.iufb_line_items
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.iufb_line_items;
create policy "Reject updates to archived seasons"
on public.iufb_line_items
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

drop policy if exists "Reject deletes from archived seasons" on public.iufb_line_items;
create policy "Reject deletes from archived seasons"
on public.iufb_line_items
as restrictive
for delete
using (not public.is_season_archived(season));

-- practice_sessions
drop policy if exists "Reject inserts into archived seasons" on public.practice_sessions;
create policy "Reject inserts into archived seasons"
on public.practice_sessions
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.practice_sessions;
create policy "Reject updates to archived seasons"
on public.practice_sessions
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

-- competitions
drop policy if exists "Reject inserts into archived seasons" on public.competitions;
create policy "Reject inserts into archived seasons"
on public.competitions
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.competitions;
create policy "Reject updates to archived seasons"
on public.competitions
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

-- income_entries
drop policy if exists "Reject inserts into archived seasons" on public.income_entries;
create policy "Reject inserts into archived seasons"
on public.income_entries
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.income_entries;
create policy "Reject updates to archived seasons"
on public.income_entries
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

drop policy if exists "Reject deletes from archived seasons" on public.income_entries;
create policy "Reject deletes from archived seasons"
on public.income_entries
as restrictive
for delete
using (not public.is_season_archived(season));

-- expense_requests
drop policy if exists "Reject inserts into archived seasons" on public.expense_requests;
create policy "Reject inserts into archived seasons"
on public.expense_requests
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.expense_requests;
create policy "Reject updates to archived seasons"
on public.expense_requests
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

-- season_memberships
drop policy if exists "Reject inserts into archived seasons" on public.season_memberships;
create policy "Reject inserts into archived seasons"
on public.season_memberships
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.season_memberships;
create policy "Reject updates to archived seasons"
on public.season_memberships
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

drop policy if exists "Reject deletes from archived seasons" on public.season_memberships;
create policy "Reject deletes from archived seasons"
on public.season_memberships
as restrictive
for delete
using (not public.is_season_archived(season));

-- attendance_records (season via practice_sessions)
drop policy if exists "Reject inserts for archived practice seasons" on public.attendance_records;
create policy "Reject inserts for archived practice seasons"
on public.attendance_records
as restrictive
for insert
with check (not public.is_practice_session_season_archived(session_id));

drop policy if exists "Reject updates for archived practice seasons" on public.attendance_records;
create policy "Reject updates for archived practice seasons"
on public.attendance_records
as restrictive
for update
using (not public.is_practice_session_season_archived(session_id))
with check (not public.is_practice_session_season_archived(session_id));

-- deadlines (season via competitions)
drop policy if exists "Reject inserts for archived competition seasons" on public.deadlines;
create policy "Reject inserts for archived competition seasons"
on public.deadlines
as restrictive
for insert
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject updates for archived competition seasons" on public.deadlines;
create policy "Reject updates for archived competition seasons"
on public.deadlines
as restrictive
for update
using (not public.is_competition_season_archived(competition_id))
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject deletes for archived competition seasons" on public.deadlines;
create policy "Reject deletes for archived competition seasons"
on public.deadlines
as restrictive
for delete
using (not public.is_competition_season_archived(competition_id));

-- fees (season via competitions)
drop policy if exists "Reject inserts for archived competition seasons" on public.fees;
create policy "Reject inserts for archived competition seasons"
on public.fees
as restrictive
for insert
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject updates for archived competition seasons" on public.fees;
create policy "Reject updates for archived competition seasons"
on public.fees
as restrictive
for update
using (not public.is_competition_season_archived(competition_id))
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject deletes for archived competition seasons" on public.fees;
create policy "Reject deletes for archived competition seasons"
on public.fees
as restrictive
for delete
using (not public.is_competition_season_archived(competition_id));

-- competition_deadlines
drop policy if exists "Reject inserts for archived competition seasons" on public.competition_deadlines;
create policy "Reject inserts for archived competition seasons"
on public.competition_deadlines
as restrictive
for insert
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject updates for archived competition seasons" on public.competition_deadlines;
create policy "Reject updates for archived competition seasons"
on public.competition_deadlines
as restrictive
for update
using (not public.is_competition_season_archived(competition_id))
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject deletes for archived competition seasons" on public.competition_deadlines;
create policy "Reject deletes for archived competition seasons"
on public.competition_deadlines
as restrictive
for delete
using (not public.is_competition_season_archived(competition_id));

-- competition_fees
drop policy if exists "Reject inserts for archived competition seasons" on public.competition_fees;
create policy "Reject inserts for archived competition seasons"
on public.competition_fees
as restrictive
for insert
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject updates for archived competition seasons" on public.competition_fees;
create policy "Reject updates for archived competition seasons"
on public.competition_fees
as restrictive
for update
using (not public.is_competition_season_archived(competition_id))
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject deletes for archived competition seasons" on public.competition_fees;
create policy "Reject deletes for archived competition seasons"
on public.competition_fees
as restrictive
for delete
using (not public.is_competition_season_archived(competition_id));

-- competition_contacts
drop policy if exists "Reject inserts for archived competition seasons" on public.competition_contacts;
create policy "Reject inserts for archived competition seasons"
on public.competition_contacts
as restrictive
for insert
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject updates for archived competition seasons" on public.competition_contacts;
create policy "Reject updates for archived competition seasons"
on public.competition_contacts
as restrictive
for update
using (not public.is_competition_season_archived(competition_id))
with check (not public.is_competition_season_archived(competition_id));

drop policy if exists "Reject deletes for archived competition seasons" on public.competition_contacts;
create policy "Reject deletes for archived competition seasons"
on public.competition_contacts
as restrictive
for delete
using (not public.is_competition_season_archived(competition_id));
