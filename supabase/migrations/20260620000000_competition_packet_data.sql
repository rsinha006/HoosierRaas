-- Extracted competition packet data (deadlines, fees, contacts).
-- Run this in the Supabase SQL Editor.

alter table public.competitions
  add column if not exists per_person_registration_cost numeric(10, 2),
  add column if not exists tech_rehearsal_required boolean;

create table if not exists public.competition_deadlines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  due_date date,
  fine_amount numeric(10, 2),
  is_hard_cutoff boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.competition_fees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  amount numeric(10, 2) not null,
  is_per_person boolean not null default false,
  is_refundable boolean not null default false,
  due_date date,
  sort_order integer not null default 0
);

create table if not exists public.competition_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  sort_order integer not null default 0
);

create index if not exists competition_deadlines_competition_id_idx
  on public.competition_deadlines (competition_id);

create index if not exists competition_fees_competition_id_idx
  on public.competition_fees (competition_id);

create index if not exists competition_contacts_competition_id_idx
  on public.competition_contacts (competition_id);

alter table public.competition_deadlines enable row level security;
alter table public.competition_fees enable row level security;
alter table public.competition_contacts enable row level security;

drop policy if exists "Exec users can read competition deadlines" on public.competition_deadlines;
create policy "Exec users can read competition deadlines"
on public.competition_deadlines
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can manage competition deadlines" on public.competition_deadlines;
create policy "Captain and TM can manage competition deadlines"
on public.competition_deadlines
for all
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Exec users can read competition fees" on public.competition_fees;
create policy "Exec users can read competition fees"
on public.competition_fees
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can manage competition fees" on public.competition_fees;
create policy "Captain and TM can manage competition fees"
on public.competition_fees
for all
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Exec users can read competition contacts" on public.competition_contacts;
create policy "Exec users can read competition contacts"
on public.competition_contacts
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can manage competition contacts" on public.competition_contacts;
create policy "Captain and TM can manage competition contacts"
on public.competition_contacts
for all
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));
