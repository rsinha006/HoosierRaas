-- Out-of-pocket reimbursement workflow and receipt storage.
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

create table if not exists public.reimbursements (
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
  submitted_by_member_id uuid not null references public.members (id) on delete restrict,
  date_of_purchase date not null,
  submission_timestamp timestamptz not null default now(),
  receipt_url text not null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'paid')),
  payment_method text check (payment_method in ('venmo', 'zelle')),
  payment_timestamp timestamptz,
  paid_by_member_id uuid references public.members (id) on delete set null,
  constraint paid_requires_payment_details check (
    status <> 'paid'
    or (
      payment_method is not null
      and payment_timestamp is not null
      and paid_by_member_id is not null
    )
  )
);

create index if not exists reimbursements_status_idx
  on public.reimbursements (status);

create index if not exists reimbursements_submission_timestamp_idx
  on public.reimbursements (submission_timestamp desc);

grant select, insert, update on public.reimbursements to authenticated;

alter table public.reimbursements enable row level security;

drop policy if exists "Exec users can read reimbursements" on public.reimbursements;
create policy "Exec users can read reimbursements"
on public.reimbursements
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Exec users can submit reimbursements" on public.reimbursements;
create policy "Exec users can submit reimbursements"
on public.reimbursements
for insert
to authenticated
with check (
  public.is_exec_user()
  and submitted_by_member_id = public.get_my_member_id()
  and status = 'pending'
  and payment_method is null
  and payment_timestamp is null
  and paid_by_member_id is null
);

drop policy if exists "Finance team can mark reimbursements paid" on public.reimbursements;
create policy "Finance team can mark reimbursements paid"
on public.reimbursements
for update
to authenticated
using (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
)
with check (
  public.get_my_exec_title() in ('captain', 'team_manager', 'finance')
);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Exec users can read receipts" on storage.objects;
create policy "Exec users can read receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and public.is_exec_user()
);

drop policy if exists "Exec users can upload receipts" on storage.objects;
create policy "Exec users can upload receipts"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and public.is_exec_user()
);

drop policy if exists "Exec users can update receipts" on storage.objects;
create policy "Exec users can update receipts"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'receipts'
  and public.is_exec_user()
)
with check (
  bucket_id = 'receipts'
  and public.is_exec_user()
);
