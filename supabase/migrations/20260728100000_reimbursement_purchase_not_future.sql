-- A reimbursement could be dated years ahead. Setting the purchase date to
-- 2030-01-01 was accepted by the form and by the database, and the season's
-- reimbursement list now contains rows dated after the season ends.
--
-- Nothing checked for it. The 24-hour rule only asks whether a purchase is too old,
-- and a future date is comfortably inside that window because no time has elapsed
-- against it yet.
--
-- Measured against submission_timestamp rather than now(): the trigger stamps that
-- from the server clock on insert, so the check reads only columns of the row and
-- stays immutable, and a dump and restore cannot start failing on it later.
-- Run this in the Supabase SQL Editor before merging the app change.

alter table public.reimbursements drop constraint if exists reimbursement_purchase_not_future;

-- "not valid" leaves the rows already dated in the future alone. They predate this
-- rule, they are visible in the reimbursement queue, and deleting or rewriting
-- someone's record is a call for the exec board, not a side effect of a migration.
alter table public.reimbursements
  add constraint reimbursement_purchase_not_future
  check (
    date_of_purchase
      <= (submission_timestamp at time zone 'America/Indiana/Indianapolis')::date
  )
  not valid;
