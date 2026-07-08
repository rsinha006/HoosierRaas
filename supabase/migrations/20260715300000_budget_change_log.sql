-- Mid-season budget adjustments were silently overwritten with no record of who
-- changed a category's allocation, when, or why. Add a change log and require a
-- reason whenever an already-set allocation is changed (initial season setup, going
-- from unset to a value, is not logged as an "adjustment").
-- Run this in the Supabase SQL Editor.

create table if not exists public.budget_change_log (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  category text not null,
  previous_allocated_amount numeric(12, 2) not null,
  new_allocated_amount numeric(12, 2) not null,
  reason text not null,
  changed_by_member_id uuid references public.members (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists budget_change_log_season_category_idx
  on public.budget_change_log (season, category);

grant select, insert on public.budget_change_log to authenticated;

alter table public.budget_change_log enable row level security;

drop policy if exists "Exec users can read budget change log" on public.budget_change_log;
create policy "Exec users can read budget change log"
on public.budget_change_log
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Finance team can log budget changes" on public.budget_change_log;
create policy "Finance team can log budget changes"
on public.budget_change_log
for insert
to authenticated
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);
