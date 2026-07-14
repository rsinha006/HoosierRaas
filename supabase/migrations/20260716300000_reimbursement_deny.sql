-- Reimbursements could only be paid or left pending forever — there was no way to
-- reject a duplicate, ineligible, or fraudulent request. Add a "denied" status with a
-- required reason, mirroring how expense_requests handles denial.
-- Run this in the Supabase SQL Editor.

alter table public.reimbursements
  add column if not exists denial_reason text,
  add column if not exists denied_at timestamptz,
  add column if not exists denied_by_member_id uuid references public.members (id) on delete set null;

alter table public.reimbursements drop constraint if exists reimbursements_status_check;
alter table public.reimbursements
  add constraint reimbursements_status_check
  check (status in ('pending', 'paid', 'denied'));

alter table public.reimbursements drop constraint if exists reimbursements_denied_requires_reason;
alter table public.reimbursements
  add constraint reimbursements_denied_requires_reason
  check (status <> 'denied' or length(btrim(denial_reason)) > 0);
