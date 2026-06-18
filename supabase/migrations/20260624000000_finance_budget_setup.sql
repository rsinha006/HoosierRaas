-- Finance budget setup: expense category budgets and IUFB line items.
-- Run this in the Supabase SQL Editor.

alter table public.budgets drop constraint if exists budgets_category_check;

alter table public.budgets
  add constraint budgets_category_check check (category in (
    'team_reg_fees',
    'hotels',
    'transportation',
    'costumes',
    'production',
    'merch',
    'dj',
    'gas',
    'socials',
    'miscellaneous',
    'during_comp_expenses',
    'last_years_debt'
  ));

create table if not exists public.iufb_line_items (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  description text not null,
  approved_amount numeric(12, 2) not null check (approved_amount >= 0),
  spent_amount numeric(12, 2) not null default 0 check (spent_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists iufb_line_items_season_idx
  on public.iufb_line_items (season);

grant select, insert, update, delete on public.iufb_line_items to authenticated;

alter table public.iufb_line_items enable row level security;

drop policy if exists "Exec users can read iufb line items" on public.iufb_line_items;
create policy "Exec users can read iufb line items"
on public.iufb_line_items
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Finance team can insert iufb line items" on public.iufb_line_items;
create policy "Finance team can insert iufb line items"
on public.iufb_line_items
for insert
to authenticated
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

drop policy if exists "Finance team can update iufb line items" on public.iufb_line_items;
create policy "Finance team can update iufb line items"
on public.iufb_line_items
for update
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
)
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

drop policy if exists "Finance team can delete iufb line items" on public.iufb_line_items;
create policy "Finance team can delete iufb line items"
on public.iufb_line_items
for delete
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);
