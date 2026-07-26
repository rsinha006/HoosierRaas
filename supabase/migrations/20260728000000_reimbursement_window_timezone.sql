-- The 24-hour reimbursement window was measured from two different midnights.
--
-- The form measured from midnight on the submitter's own clock - Indiana time for
-- everyone on this team. The check constraint measured from date_of_purchase cast to
-- timestamptz, which resolves against the database session's TimeZone, and that is
-- UTC in production. Indiana is 4-5 hours behind UTC, so the two disagreed by exactly
-- that much: a purchase made today and submitted after roughly 8 PM Indiana time
-- passed the on-screen check and was then rejected by the constraint. Evening is when
-- students submit, and the rejection surfaced as a raw constraint error.
--
-- Anchor both to the team's own time zone, and give the rejection a sentence a dancer
-- can act on rather than the constraint's text.
--
-- The function also gains a validate-only mode. The receipt is uploaded before the
-- submission is checked, and anon can insert into the receipts bucket but cannot
-- delete from it, so every rejected submission - most often "your email is not on the
-- roster" - left a file in storage that nothing references and nothing cleans up. The
-- form now runs the checks before it uploads.
--
-- APPLY THIS BEFORE MERGING THE APP CHANGE. The old 10-argument function is dropped
-- so the new default argument cannot make the call ambiguous; the currently deployed
-- form keeps working against the new one, because PostgREST matches its 10 named
-- arguments and lets p_validate_only default.
-- Run this in the Supabase SQL Editor.

alter table public.reimbursements drop constraint if exists reimbursement_submission_window;

-- Casting a date to timestamp and then reading it "at time zone" is immutable, unlike
-- the ::timestamptz cast it replaces, which silently depended on a session setting.
alter table public.reimbursements
  add constraint reimbursement_submission_window
  check (
    submission_timestamp
      - (date_of_purchase::timestamp at time zone 'America/Indiana/Indianapolis')
      <= interval '24 hours'
  )
  not valid;

drop function if exists public.submit_public_reimbursement(
  uuid, text, numeric, text, uuid, text, text, date, text, text
);

create or replace function public.submit_public_reimbursement(
  p_id uuid,
  p_description text,
  p_amount numeric,
  p_category text,
  p_competition_id uuid,
  p_submitter_name text,
  p_submitter_email text,
  p_date_of_purchase date,
  p_receipt_url text,
  p_notes text,
  p_validate_only boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_submitter_email, '')));
  v_name text := trim(coalesce(p_submitter_name, ''));
  v_purchase_midnight timestamptz;
  v_season text;
  v_id uuid;
begin
  if v_name = '' then
    raise exception 'Submitter name is required';
  end if;

  if v_email = '' then
    raise exception 'Submitter email is required';
  end if;

  if not exists (
    select 1
    from public.members
    where email = v_email
      and status = 'active'
  ) then
    raise exception 'This email is not on the active roster. Use the email you are on the team roster with, or contact your finance chair.';
  end if;

  if p_date_of_purchase is null then
    raise exception 'Date of purchase is required';
  end if;

  -- Same midnight the constraint below uses, and the same one the form uses.
  v_purchase_midnight :=
    p_date_of_purchase::timestamp at time zone 'America/Indiana/Indianapolis';

  if now() - v_purchase_midnight > interval '24 hours' then
    raise exception 'Reimbursements must be submitted within 24 hours of the purchase date. This purchase is outside that window, so contact your finance chair directly.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than zero.';
  end if;

  -- Matches MAX_REIMBURSEMENT_AMOUNT in lib/reimbursements.ts and the
  -- reimbursement_amount_under_cap constraint, so the cap is reported as a sentence
  -- instead of as a constraint violation.
  if p_amount >= 100 then
    raise exception 'Reimbursement is only for purchases under $100. For anything $100 or more, ask your finance chair to submit a pre-approval expense request instead.';
  end if;

  -- Validation runs before the receipt is uploaded, so in that mode there is no path
  -- to check yet.
  if not p_validate_only and (p_receipt_url is null or trim(p_receipt_url) = '') then
    raise exception 'Receipt is required';
  end if;

  select s.label into v_season
  from public.seasons s
  where s.is_active = true
  limit 1;

  if v_season is null then
    raise exception 'No active season is configured';
  end if;

  if p_validate_only then
    return null;
  end if;

  insert into public.reimbursements (
    id,
    description,
    amount,
    category,
    competition_id,
    submitted_by_member_id,
    submitter_name,
    submitter_email,
    date_of_purchase,
    receipt_url,
    notes,
    status,
    season
  )
  values (
    coalesce(p_id, gen_random_uuid()),
    trim(coalesce(p_description, '')),
    p_amount,
    p_category,
    p_competition_id,
    null,
    v_name,
    v_email,
    p_date_of_purchase,
    p_receipt_url,
    nullif(trim(coalesce(p_notes, '')), ''),
    'pending',
    v_season
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_public_reimbursement(
  uuid, text, numeric, text, uuid, text, text, date, text, text, boolean
) to anon, authenticated;
