-- Public reimbursements are stamped with the active season server-side, so any
-- optional competition reference must belong to that same season. Without this,
-- a public caller could submit an active-season reimbursement tied to an
-- archived or otherwise unrelated competition.

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

  if p_receipt_url is null or trim(p_receipt_url) = '' then
    raise exception 'Receipt is required';
  end if;

  select s.label into v_season
  from public.seasons s
  where s.is_active = true
  limit 1;

  if v_season is null then
    raise exception 'No active season is configured';
  end if;

  if p_competition_id is not null and not exists (
    select 1
    from public.competitions c
    where c.id = p_competition_id
      and c.season = v_season
  ) then
    raise exception 'Competition must belong to the active season';
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
  uuid, text, numeric, text, uuid, text, text, date, text, text
) to anon, authenticated;
