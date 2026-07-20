-- The original reimbursement season backfill stamped every historical row with
-- the currently active season. If older reimbursements existed, archived-season
-- write protections would point at the wrong season. Re-derive the season from
-- the reimbursement's own dates where a season window matches.
-- Run this in the Supabase SQL Editor.

update public.reimbursements reimbursement
set season = matched_season.label
from public.seasons matched_season
where coalesce(
    reimbursement.date_of_purchase,
    reimbursement.submission_timestamp::date,
    reimbursement.payment_timestamp::date,
    reimbursement.created_at::date
  ) >= matched_season.starts_on
  and coalesce(
    reimbursement.date_of_purchase,
    reimbursement.submission_timestamp::date,
    reimbursement.payment_timestamp::date,
    reimbursement.created_at::date
  ) <= matched_season.ends_on
  and reimbursement.season is distinct from matched_season.label;
