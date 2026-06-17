-- Fix RLS + grants for deadlines and fees tables.
-- Run this in the Supabase SQL Editor if Confirm and Save fails with RLS errors.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.deadlines to authenticated;
grant select, insert, update, delete on public.fees to authenticated;

alter table public.deadlines enable row level security;
alter table public.fees enable row level security;

drop policy if exists "Exec users can read deadlines" on public.deadlines;
drop policy if exists "Captain and TM can manage deadlines" on public.deadlines;
drop policy if exists "Exec users can insert deadlines" on public.deadlines;
drop policy if exists "Exec users can update deadlines" on public.deadlines;
drop policy if exists "Exec users can delete deadlines" on public.deadlines;

create policy "Exec users can read deadlines"
on public.deadlines
for select
to authenticated
using (public.is_exec_user());

create policy "Exec users can insert deadlines"
on public.deadlines
for insert
to authenticated
with check (public.is_exec_user());

create policy "Exec users can update deadlines"
on public.deadlines
for update
to authenticated
using (public.is_exec_user())
with check (public.is_exec_user());

create policy "Exec users can delete deadlines"
on public.deadlines
for delete
to authenticated
using (public.is_exec_user());

drop policy if exists "Exec users can read fees" on public.fees;
drop policy if exists "Captain and TM can manage fees" on public.fees;
drop policy if exists "Exec users can insert fees" on public.fees;
drop policy if exists "Exec users can update fees" on public.fees;
drop policy if exists "Exec users can delete fees" on public.fees;

create policy "Exec users can read fees"
on public.fees
for select
to authenticated
using (public.is_exec_user());

create policy "Exec users can insert fees"
on public.fees
for insert
to authenticated
with check (public.is_exec_user());

create policy "Exec users can update fees"
on public.fees
for update
to authenticated
using (public.is_exec_user())
with check (public.is_exec_user());

create policy "Exec users can delete fees"
on public.fees
for delete
to authenticated
using (public.is_exec_user());
