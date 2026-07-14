-- The public reimbursement form let anyone type any name/email — there was no check
-- that the submitter is an actual active team member. Move the public insert behind
-- a SECURITY DEFINER function (same pattern used to harden public attendance
-- submission) that verifies the email against the active roster before inserting.
-- Run this in the Supabase SQL Editor.

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
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_submitter_email, '')));
  v_name text := trim(coalesce(p_submitter_name, ''));
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

  if p_receipt_url is null or trim(p_receipt_url) = '' then
    raise exception 'Receipt is required';
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
    status
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
    'pending'
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_public_reimbursement(
  uuid, text, numeric, text, uuid, text, text, date, text, text
) to anon, authenticated;

drop policy if exists "Public can submit reimbursements" on public.reimbursements;
revoke insert on public.reimbursements from anon;
