-- Expense pre-approval workflow.
-- Run this in the Supabase SQL Editor.

create or replace function public.get_my_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.members
  where email = lower(auth.jwt() ->> 'email')
  limit 1;
$$;

create table if not exists public.expense_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (category in (
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
  )),
  competition_id uuid references public.competitions (id) on delete set null,
  requester_member_id uuid not null references public.members (id) on delete restrict,
  justification text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  denial_reason text,
  approved_at timestamptz,
  approved_by_member_id uuid references public.members (id) on delete set null,
  constraint denied_requires_reason check (
    status <> 'denied' or denial_reason is not null
  ),
  constraint approved_requires_metadata check (
    status <> 'approved'
    or (approved_at is not null and approved_by_member_id is not null)
  )
);

create index if not exists expense_requests_status_idx
  on public.expense_requests (status);

create index if not exists expense_requests_category_idx
  on public.expense_requests (category);

create index if not exists expense_requests_created_at_idx
  on public.expense_requests (created_at desc);

grant select, insert, update on public.expense_requests to authenticated;

alter table public.expense_requests enable row level security;

drop policy if exists "Exec users can read expense requests" on public.expense_requests;
create policy "Exec users can read expense requests"
on public.expense_requests
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Exec users can submit expense requests" on public.expense_requests;
create policy "Exec users can submit expense requests"
on public.expense_requests
for insert
to authenticated
with check (
  public.is_exec_user()
  and requester_member_id = public.get_my_member_id()
  and status = 'pending'
  and denial_reason is null
  and approved_at is null
  and approved_by_member_id is null
);

drop policy if exists "Finance team can review expense requests" on public.expense_requests;
create policy "Finance team can review expense requests"
on public.expense_requests
for update
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
)
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);
