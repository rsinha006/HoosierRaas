-- Tag date-based tables with an explicit season column.
-- Run this in the Supabase SQL Editor.

alter table public.practice_sessions
  add column if not exists season text;

update public.practice_sessions
set season = '2025-2026'
where season is null;

alter table public.practice_sessions
  alter column season set not null;

create index if not exists practice_sessions_season_idx
  on public.practice_sessions (season);

alter table public.competitions
  add column if not exists season text;

update public.competitions
set season = '2025-2026'
where season is null;

alter table public.competitions
  alter column season set not null;

create index if not exists competitions_season_idx
  on public.competitions (season);

alter table public.income_entries
  add column if not exists season text;

update public.income_entries
set season = '2025-2026'
where season is null;

alter table public.income_entries
  alter column season set not null;

create index if not exists income_entries_season_idx
  on public.income_entries (season);

alter table public.expense_requests
  add column if not exists season text;

update public.expense_requests
set season = '2025-2026'
where season is null;

alter table public.expense_requests
  alter column season set not null;

create index if not exists expense_requests_season_idx
  on public.expense_requests (season);

alter table public.income_entries drop constraint if exists income_entries_category_check;

alter table public.income_entries
  add constraint income_entries_category_check check (category in (
    'dues',
    'iufb',
    'sponsorships',
    'dine-in fundraisers',
    'tabling',
    'garba',
    'donations',
    'costume_rental',
    'previous_year_carryover'
  ));
