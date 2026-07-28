-- Pre-approval expense requests had no upper bound at all. $999,999 passed
-- amount > 0 and every other check on both the public form and the internal
-- Add Expense form - the roster email check was the only thing that stopped
-- the public submission from going through.
--
-- Reimbursements already have a sanity cap at the database level
-- (reimbursement_amount_under_cap, amount < 100) for the same reason: a form
-- field alone can't be trusted against someone calling the API directly.
-- Expense requests are pre-approval against a whole budget category or an
-- IUFB line item, not a single out-of-pocket purchase, so the number has to
-- be generous enough for a real line item (a hotel block, a van rental, a
-- team registration fee) while still catching an obviously wrong entry.
--
-- "not valid" leaves any request already on the books above this amount
-- alone - reviewing or denying an existing pending request is a call for
-- finance, not a side effect of a migration.
-- Run this in the Supabase SQL Editor before merging the app change.

alter table public.expense_requests drop constraint if exists expense_request_amount_sane;

alter table public.expense_requests
  add constraint expense_request_amount_sane
  check (amount <= 10000)
  not valid;
