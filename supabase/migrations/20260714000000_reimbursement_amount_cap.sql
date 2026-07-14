-- Reimbursements are only for out-of-pocket purchases under $100 — anything at or
-- above that needs pre-approval through the expense_requests flow instead. The app
-- already blocks this client-side; this adds the same rule at the database level so
-- it can't be bypassed by calling the API directly.
-- Run this in the Supabase SQL Editor.

alter table public.reimbursements drop constraint if exists reimbursement_amount_under_cap;

alter table public.reimbursements
  add constraint reimbursement_amount_under_cap check (amount < 100);
