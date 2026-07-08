-- The 24-hour reimbursement submission window was only a UI warning — a submitter
-- could dismiss it (or bypass the UI entirely and call the API directly) and the
-- request would still be accepted. Enforce it at the database level instead.
--
-- submission_timestamp was also client-supplied, so a submitter could backdate it
-- to dodge a server-side window check. Force it to the server clock on insert, then
-- check the real elapsed time against date_of_purchase.
-- Run this in the Supabase SQL Editor.

create or replace function public.set_reimbursement_submission_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.submission_timestamp := now();
  return new;
end;
$$;

drop trigger if exists reimbursements_set_submission_timestamp on public.reimbursements;
create trigger reimbursements_set_submission_timestamp
before insert on public.reimbursements
for each row
execute function public.set_reimbursement_submission_timestamp();

-- "not valid" skips checking historical rows submitted before this rule existed —
-- only inserts/updates going forward are required to satisfy it.
alter table public.reimbursements drop constraint if exists reimbursement_submission_window;
alter table public.reimbursements
  add constraint reimbursement_submission_window
  check (submission_timestamp - date_of_purchase::timestamptz <= interval '24 hours')
  not valid;
