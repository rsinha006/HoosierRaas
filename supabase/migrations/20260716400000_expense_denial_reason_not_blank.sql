-- The expense_requests denial constraint only checked "not null" — a denial with
-- denial_reason = '   ' (whitespace only) was accepted at the DB level even though
-- the UI trims client-side. Tighten it to require real, non-blank text, matching
-- the same guard added for reimbursements.
-- Run this in the Supabase SQL Editor.

alter table public.expense_requests drop constraint if exists denied_requires_reason;
alter table public.expense_requests
  add constraint denied_requires_reason
  check (status <> 'denied' or length(btrim(denial_reason)) > 0);
