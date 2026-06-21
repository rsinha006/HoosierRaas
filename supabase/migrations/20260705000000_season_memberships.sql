-- Per-season member status and exec access.
-- Run this in the Supabase SQL Editor.

create table if not exists public.season_memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  season text not null,
  status text not null check (status in ('active', 'inactive', 'alumni')),
  exec_title text check (exec_title in ('captain', 'team_manager', 'finance')),
  created_at timestamptz not null default now(),
  unique (member_id, season)
);

create index if not exists season_memberships_season_idx
  on public.season_memberships (season);

create index if not exists season_memberships_member_id_idx
  on public.season_memberships (member_id);

grant select, insert, update, delete on public.season_memberships to authenticated;

alter table public.season_memberships enable row level security;

drop policy if exists "Authenticated users can read season memberships" on public.season_memberships;
create policy "Authenticated users can read season memberships"
on public.season_memberships
for select
to authenticated
using (true);

drop policy if exists "Captain and TM can insert season memberships" on public.season_memberships;
create policy "Captain and TM can insert season memberships"
on public.season_memberships
for insert
to authenticated
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Captain and TM can update season memberships" on public.season_memberships;
create policy "Captain and TM can update season memberships"
on public.season_memberships
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Captain and TM can delete season memberships" on public.season_memberships;
create policy "Captain and TM can delete season memberships"
on public.season_memberships
for delete
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'));

insert into public.season_memberships (member_id, season, status, exec_title)
select
  id,
  '2025-2026',
  status,
  case
    when exec_title in ('captain', 'team_manager', 'finance') then exec_title
    else null
  end
from public.members
on conflict (member_id, season) do nothing;

create or replace function public.get_my_exec_title()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sm.exec_title
  from public.members m
  join public.season_memberships sm on sm.member_id = m.id
  join public.seasons s on s.label = sm.season and s.is_active = true
  where m.email = lower(auth.jwt() ->> 'email')
  limit 1;
$$;
