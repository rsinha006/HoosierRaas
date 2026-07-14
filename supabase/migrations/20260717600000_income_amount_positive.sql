-- income_entries allowed amount = 0 while expense_requests and reimbursements both
-- require amount > 0 — an inconsistent rule with no legitimate use case (there's no
-- reason to log receiving $0). Align income to the same > 0 rule.
-- Run this in the Supabase SQL Editor.

alter table public.income_entries drop constraint if exists income_entries_amount_check;
alter table public.income_entries
  add constraint income_entries_amount_check
  check (amount > 0);
