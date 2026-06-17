-- Competition checklist tables (deadlines + fees).
-- Run this in the Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  due_date date,
  fine_amount numeric(10, 2),
  is_hard_cutoff boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'complete')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  amount numeric(10, 2) not null,
  is_per_person boolean not null default false,
  is_refundable boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists deadlines_competition_id_idx
  on public.deadlines (competition_id);

create index if not exists fees_competition_id_idx
  on public.fees (competition_id);

alter table public.deadlines enable row level security;
alter table public.fees enable row level security;

grant select, insert, update, delete on public.deadlines to authenticated;
grant select, insert, update, delete on public.fees to authenticated;

drop policy if exists "Exec users can read deadlines" on public.deadlines;
create policy "Exec users can read deadlines"
on public.deadlines
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can manage deadlines" on public.deadlines;
drop policy if exists "Exec users can insert deadlines" on public.deadlines;
create policy "Exec users can insert deadlines"
on public.deadlines
for insert
to authenticated
with check (public.is_exec_user());

drop policy if exists "Exec users can update deadlines" on public.deadlines;
create policy "Exec users can update deadlines"
on public.deadlines
for update
to authenticated
using (public.is_exec_user())
with check (public.is_exec_user());

drop policy if exists "Exec users can delete deadlines" on public.deadlines;
create policy "Exec users can delete deadlines"
on public.deadlines
for delete
to authenticated
using (public.is_exec_user());

drop policy if exists "Exec users can read fees" on public.fees;
create policy "Exec users can read fees"
on public.fees
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can manage fees" on public.fees;
drop policy if exists "Exec users can insert fees" on public.fees;
create policy "Exec users can insert fees"
on public.fees
for insert
to authenticated
with check (public.is_exec_user());

drop policy if exists "Exec users can update fees" on public.fees;
create policy "Exec users can update fees"
on public.fees
for update
to authenticated
using (public.is_exec_user())
with check (public.is_exec_user());

drop policy if exists "Exec users can delete fees" on public.fees;
create policy "Exec users can delete fees"
on public.fees
for delete
to authenticated
using (public.is_exec_user());

