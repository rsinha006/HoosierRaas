-- Reimbursements had no season column at all, so they weren't covered by the
-- archived-season read-only safety net — a reimbursement could still be inserted,
-- paid, or denied against a season that's already been closed out and archived.
-- Run this in the Supabase SQL Editor.

-- Defined defensively here too (create or replace is a no-op if it already exists)
-- in case the original archived-season-readonly migration was never applied.
create or replace function public.is_season_archived(p_season text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.seasons s
    where s.label = p_season
      and s.is_archived = true
  );
$$;

grant execute on function public.is_season_archived(text) to anon, authenticated;

alter table public.reimbursements
  add column if not exists season text;

update public.reimbursements
set season = (
  select s.label
  from public.seasons s
  where s.is_active = true
  limit 1
)
where season is null;

alter table public.reimbursements
  alter column season set not null;

create index if not exists reimbursements_season_idx
  on public.reimbursements (season);

drop policy if exists "Reject inserts into archived seasons" on public.reimbursements;
create policy "Reject inserts into archived seasons"
on public.reimbursements
as restrictive
for insert
with check (not public.is_season_archived(season));

drop policy if exists "Reject updates to archived seasons" on public.reimbursements;
create policy "Reject updates to archived seasons"
on public.reimbursements
as restrictive
for update
using (not public.is_season_archived(season))
with check (not public.is_season_archived(season));

-- Stamp new public submissions with the currently active season server-side —
-- never trust a client-supplied season, since that's exactly what the archived-
-- season write protection above needs to be able to rely on.
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
