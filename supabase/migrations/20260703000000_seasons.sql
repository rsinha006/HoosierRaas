-- Seasons registry: source of truth for active and archived seasons.
-- Run this in the Supabase SQL Editor.

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists seasons_one_active_idx
  on public.seasons (is_active)
  where is_active;

grant select, insert, update, delete on public.seasons to authenticated;

alter table public.seasons enable row level security;

drop policy if exists "Authenticated users can read seasons" on public.seasons;
create policy "Authenticated users can read seasons"
on public.seasons
for select
to authenticated
using (true);

drop policy if exists "Captain and TM can insert seasons" on public.seasons;
create policy "Captain and TM can insert seasons"
on public.seasons
for insert
to authenticated
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Captain and TM can update seasons" on public.seasons;
create policy "Captain and TM can update seasons"
on public.seasons
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Captain and TM can delete seasons" on public.seasons;
create policy "Captain and TM can delete seasons"
on public.seasons
for delete
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'));

insert into public.seasons (label, starts_on, ends_on, is_active, is_archived)
values ('2025-2026', '2025-08-01', '2026-07-31', true, false)
on conflict (label) do nothing;
