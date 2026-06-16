-- Competitions table for Team Manager.
-- Run this in the Supabase SQL Editor.

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  competition_date date not null,
  venue text,
  location text,
  min_performance_duration integer,
  max_performance_duration integer,
  mix_format text,
  roster_min integer,
  roster_max integer,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'complete'))
);

alter table public.competitions enable row level security;

drop policy if exists "Exec users can read competitions" on public.competitions;
create policy "Exec users can read competitions"
on public.competitions
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can insert competitions" on public.competitions;
create policy "Captain and TM can insert competitions"
on public.competitions
for insert
to authenticated
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Captain and TM can update competitions" on public.competitions;
create policy "Captain and TM can update competitions"
on public.competitions
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));
