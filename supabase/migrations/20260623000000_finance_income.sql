-- Finance income tracking: income_entries and budgets tables.
-- Run this in the Supabase SQL Editor.

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null check (category in (
    'dues',
    'iufb',
    'sponsorships',
    'dine-in fundraisers',
    'tabling',
    'garba',
    'donations',
    'costume_rental'
  )),
  date_applied date not null,
  date_received date not null,
  payment_method text,
  notes text,
  member_id uuid references public.members (id) on delete set null,
);

create index if not exists income_entries_date_received_idx
  on public.income_entries (date_received desc);

create index if not exists income_entries_member_id_idx
  on public.income_entries (member_id)
  where member_id is not null;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  category text not null check (category in (
    'dues',
    'iufb',
    'sponsorships',
    'dine-in fundraisers',
    'tabling',
    'garba',
    'donations',
    'costume_rental'
  )),
  allocated_amount numeric(12, 2) not null check (allocated_amount >= 0),
  created_at timestamptz not null default now(),
  unique (season, category)
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.income_entries to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;

alter table public.income_entries enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "Exec users can read income entries" on public.income_entries;
create policy "Exec users can read income entries"
on public.income_entries
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Finance team can insert income entries" on public.income_entries;
create policy "Finance team can insert income entries"
on public.income_entries
for insert
to authenticated
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

drop policy if exists "Finance team can update income entries" on public.income_entries;
create policy "Finance team can update income entries"
on public.income_entries
for update
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
)
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

drop policy if exists "Finance team can delete income entries" on public.income_entries;
create policy "Finance team can delete income entries"
on public.income_entries
for delete
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

drop policy if exists "Exec users can read budgets" on public.budgets;
create policy "Exec users can read budgets"
on public.budgets
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Finance team can insert budgets" on public.budgets;
create policy "Finance team can insert budgets"
on public.budgets
for insert
to authenticated
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

drop policy if exists "Finance team can update budgets" on public.budgets;
create policy "Finance team can update budgets"
on public.budgets
for update
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
)
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

drop policy if exists "Finance team can delete budgets" on public.budgets;
create policy "Finance team can delete budgets"
on public.budgets
for delete
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);
