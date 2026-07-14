-- Public expense pre-approval requests — mirrors the same pattern already used for
-- public reimbursements: dancers without portal access can submit a request by name
-- + email instead of requester_member_id, verified against the active roster and
-- stamped with the active season server-side. Two read-only RPCs expose just enough
-- budget/IUFB data (category + line item names, no dollar figures) for the public
-- form's dropdowns without leaking allocated-amount numbers to an unauthenticated page.
-- Run this in the Supabase SQL Editor.

alter table public.expense_requests
  alter column requester_member_id drop not null;

alter table public.expense_requests
  add column if not exists submitter_name text,
  add column if not exists submitter_email text;

alter table public.expense_requests drop constraint if exists expense_request_submitter_identity;
alter table public.expense_requests
  add constraint expense_request_submitter_identity check (
    (
      requester_member_id is not null
      and submitter_name is null
      and submitter_email is null
    )
    or (
      requester_member_id is null
      and submitter_name is not null
      and submitter_email is not null
    )
  );

create or replace function public.list_active_season_expense_categories()
returns table(category text)
language sql
stable
security definer
set search_path = public
as $$
  select b.category
  from public.budgets b
  join public.seasons s on s.label = b.season
  where s.is_active = true
    and b.allocated_amount > 0
  order by b.category;
$$;

create or replace function public.list_active_season_iufb_line_items()
returns table(id uuid, description text)
language sql
stable
security definer
set search_path = public
as $$
  select li.id, li.description
  from public.iufb_line_items li
  join public.seasons s on s.label = li.season
  where s.is_active = true
    and li.approved_amount > 0
  order by li.description;
$$;

grant execute on function public.list_active_season_expense_categories() to anon, authenticated;
grant execute on function public.list_active_season_iufb_line_items() to anon, authenticated;

create or replace function public.submit_public_expense_request(
  p_id uuid,
  p_description text,
  p_amount numeric,
  p_category text,
  p_iufb_line_item_id uuid,
  p_competition_id uuid,
  p_submitter_name text,
  p_submitter_email text,
  p_justification text
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

  if nullif(trim(coalesce(p_justification, '')), '') is null then
    raise exception 'Justification is required';
  end if;

  if (p_category is not null) = (p_iufb_line_item_id is not null) then
    raise exception 'Select exactly one funding source: a general pool category or an IUFB line item';
  end if;

  select s.label into v_season
  from public.seasons s
  where s.is_active = true
  limit 1;

  if v_season is null then
    raise exception 'No active season is configured';
  end if;

  insert into public.expense_requests (
    id,
    season,
    description,
    amount,
    category,
    iufb_line_item_id,
    competition_id,
    requester_member_id,
    submitter_name,
    submitter_email,
    justification,
    status
  )
  values (
    coalesce(p_id, gen_random_uuid()),
    v_season,
    trim(coalesce(p_description, '')),
    p_amount,
    p_category,
    p_iufb_line_item_id,
    p_competition_id,
    null,
    v_name,
    v_email,
    trim(p_justification),
    'pending'
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_public_expense_request(
  uuid, text, numeric, text, uuid, uuid, text, text, text
) to anon, authenticated;
