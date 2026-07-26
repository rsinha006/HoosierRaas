-- The public attendance form was protected by a secret link, but nothing
-- actually required the secret.
--
-- submit_attendance_response took p_session_id and checked only that the
-- session was open. Session ids are not secret - they sit in the exec-facing
-- URL /attendance/<id> - so the token hardening that revoked select on
-- practice_sessions from anon could be walked straight around by anyone who had
-- ever seen one.
--
-- Nor was there any check on who was submitting. The unique index on
-- (session_id, lower(respondent_email)) stops one address answering twice, but
-- nothing stopped a fresh made-up address each time, and nothing stopped
-- someone submitting under a real dancer's name and email. That means a
-- response can be forged for another dancer - including an unexcused absence -
-- and a session can be padded with responses from people who are not on the
-- team, which inflates every rate computed from it.
--
-- Two changes. The token becomes the credential: the session is resolved from
-- it inside the function, and the id is never accepted from the caller.
-- And the submitter must be on the roster for that session's season, matching
-- how submit_public_reimbursement and submit_public_expense_request already
-- verify a public submitter.
--
-- Requiring a roster match also means member_id is always populated, so the
-- existing partial unique index on (session_id, member_id) finally applies to
-- every accepted submission rather than only to the ones that happened to
-- match a member.
-- Run this in the Supabase SQL Editor.

-- Same argument types as before, so the old definitions have to be dropped
-- rather than replaced - create or replace cannot rename a parameter.
drop function if exists public.submit_attendance_response(
  uuid, text, text, text, text, boolean, boolean, text, text
);

drop function if exists public.attendance_already_submitted(uuid, text);

create or replace function public.attendance_already_submitted(
  p_token uuid,
  p_email text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.attendance_records ar
    join public.practice_sessions ps on ps.id = ar.session_id
    where ps.shareable_token = p_token
      and (
        lower(ar.respondent_email) = lower(p_email)
        or (
          ar.member_id is not null
          and ar.member_id = (
            select m.id from public.members m
            where lower(m.email) = lower(p_email)
            limit 1
          )
        )
      )
  );
$$;

create or replace function public.submit_attendance_response(
  p_token uuid,
  p_respondent_name text,
  p_respondent_email text,
  p_attendance_status text,
  p_excuse_text text default null,
  p_advance_notice boolean default false,
  p_is_emergency boolean default false,
  p_practice_video_status text default null,
  p_practice_video_excuse text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
  v_session_id uuid;
  v_season text;
  v_member_id uuid;
  v_respondent_name text := trim(coalesce(p_respondent_name, ''));
  v_respondent_email text := lower(trim(coalesce(p_respondent_email, '')));
begin
  if v_respondent_name = '' then
    raise exception 'Respondent name is required';
  end if;

  if v_respondent_email = '' then
    raise exception 'Respondent email is required';
  end if;

  if p_attendance_status not in (
    'present',
    'late',
    'absent_excused',
    'absent_unexcused'
  ) then
    raise exception 'Invalid attendance status';
  end if;

  if p_practice_video_status is not null
     and p_practice_video_status not in ('on_time', 'late', 'missing') then
    raise exception 'Invalid practice video status';
  end if;

  -- The token, not a caller-supplied id, decides which session this lands on.
  select ps.id, ps.season
  into v_session_id, v_season
  from public.practice_sessions ps
  where ps.shareable_token = p_token
    and ps.status = 'open'
    and ps.response_window_closes_at > now();

  if v_session_id is null then
    raise exception 'This attendance session is no longer accepting responses';
  end if;

  -- Must be on the roster for the season this session belongs to. Without
  -- this, a response can be filed under anyone's name, or under nobody's.
  select m.id
  into v_member_id
  from public.members m
  join public.season_memberships sm
    on sm.member_id = m.id
   and sm.season = v_season
   and sm.status = 'active'
  where lower(m.email) = v_respondent_email
    and coalesce(m.pending_review, false) = false
  limit 1;

  if v_member_id is null then
    raise exception 'This email is not on the team roster for this season. Use the email you are on the roster with, or ask a captain to add you.';
  end if;

  insert into public.attendance_records (
    session_id,
    member_id,
    respondent_name,
    respondent_email,
    attendance_status,
    excuse_text,
    advance_notice,
    is_emergency,
    practice_video_status,
    practice_video_excuse,
    overridden,
    auto_flagged
  )
  values (
    v_session_id,
    v_member_id,
    v_respondent_name,
    v_respondent_email,
    p_attendance_status,
    nullif(trim(coalesce(p_excuse_text, '')), ''),
    coalesce(p_advance_notice, false),
    coalesce(p_is_emergency, false),
    p_practice_video_status,
    nullif(trim(coalesce(p_practice_video_excuse, '')), ''),
    false,
    false
  )
  returning id into v_record_id;

  return v_record_id;
end;
$$;

revoke all on function public.attendance_already_submitted(uuid, text) from public;
grant execute on function public.attendance_already_submitted(uuid, text) to anon, authenticated;

revoke all on function public.submit_attendance_response(
  uuid, text, text, text, text, boolean, boolean, text, text
) from public;

grant execute on function public.submit_attendance_response(
  uuid,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  text
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auto-flagging non-responders
-- ---------------------------------------------------------------------------
-- Same defect as the submission path, on the automatic side: this marked every
-- active row in the members table absent, and that table is not season-scoped.
-- On this database that is 40 people against a 6-person roster, so each close
-- wrote 34 absence records for dancers who are not on the team - the bulk of
-- the 3200-odd rows now in the table, and the reason the per-member history
-- page was hitting PostgREST's 1000-row ceiling.
--
-- Deliberately unchanged: only dancers are flagged, so closing an exec meeting
-- still records nothing. The expected audience for an exec meeting is the exec
-- board, so those non-responders go unrecorded - but starting to write absence
-- records against exec members is a change the team should opt into, not a
-- side effect of a security fix.
create or replace function public.close_expired_practice_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with closed_sessions as (
    update public.practice_sessions
    set status = 'closed'
    where status = 'open'
      and response_window_closes_at <= now()
    returning id, season
  )
  insert into public.attendance_records (
    session_id,
    member_id,
    respondent_name,
    respondent_email,
    attendance_status,
    response_timestamp,
    overridden
  )
  select
    cs.id,
    m.id,
    trim(m.first_name || ' ' || m.last_name),
    m.email,
    'absent_unexcused',
    now(),
    false
  from closed_sessions cs
  join public.season_memberships sm
    on sm.season = cs.season
   and sm.status = 'active'
  join public.members m
    on m.id = sm.member_id
  where 'dancer' = any (m.roles)
    and coalesce(m.pending_review, false) = false
    and not exists (
      select 1
      from public.attendance_records ar
      where ar.session_id = cs.id
        and (
          ar.member_id = m.id
          or lower(ar.respondent_email) = lower(m.email)
        )
    );
end;
$$;
