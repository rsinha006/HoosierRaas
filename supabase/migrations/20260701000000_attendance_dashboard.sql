-- Attendance overrides and session-type-aware non-responder flagging.

alter table public.attendance_records
  add column if not exists original_attendance_status text
    check (
      original_attendance_status is null
      or original_attendance_status in ('present', 'late', 'absent_excused', 'absent_unexcused')
    );

create or replace function public.member_matches_session_audience(
  p_session_type text,
  p_roles text[]
)
returns boolean
language sql
immutable
as $$
  select case
    when p_session_type = 'exec meeting' then 'exec' = any (p_roles)
    else 'dancer' = any (p_roles)
  end;
$$;

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
    returning id, type
  )
  insert into public.attendance_records (
    session_id,
    member_id,
    respondent_name,
    respondent_email,
    attendance_status,
    response_timestamp,
    overridden,
    auto_flagged
  )
  select
    cs.id,
    m.id,
    trim(m.first_name || ' ' || m.last_name),
    m.email,
    'absent_unexcused',
    now(),
    false,
    true
  from closed_sessions cs
  cross join public.members m
  where m.status = 'active'
    and public.member_matches_session_audience(cs.type, m.roles)
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

create or replace function public.close_practice_session_manually(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_type text;
begin
  if public.get_my_exec_title() not in ('captain', 'team_manager') then
    raise exception 'Not authorized to close practice sessions';
  end if;

  select ps.type
  into v_session_type
  from public.practice_sessions ps
  where ps.id = p_session_id;

  if v_session_type is null then
    raise exception 'Practice session not found';
  end if;

  update public.practice_sessions
  set status = 'closed'
  where id = p_session_id
    and status = 'open';

  insert into public.attendance_records (
    session_id,
    member_id,
    respondent_name,
    respondent_email,
    attendance_status,
    response_timestamp,
    overridden,
    auto_flagged
  )
  select
    p_session_id,
    m.id,
    trim(m.first_name || ' ' || m.last_name),
    m.email,
    'absent_unexcused',
    now(),
    false,
    true
  from public.members m
  where m.status = 'active'
    and public.member_matches_session_audience(v_session_type, m.roles)
    and exists (
      select 1
      from public.practice_sessions ps
      where ps.id = p_session_id
        and ps.status = 'closed'
    )
    and not exists (
      select 1
      from public.attendance_records ar
      where ar.session_id = p_session_id
        and (
          ar.member_id = m.id
          or lower(ar.respondent_email) = lower(m.email)
        )
    );
end;
$$;

create or replace function public.override_attendance_record(
  p_record_id uuid,
  p_new_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_my_exec_title() not in ('captain', 'team_manager') then
    raise exception 'Not authorized to override attendance records';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Override reason is required';
  end if;

  if p_new_status not in ('present', 'late', 'absent_excused', 'absent_unexcused') then
    raise exception 'Invalid attendance status';
  end if;

  update public.attendance_records ar
  set
    original_attendance_status = coalesce(ar.original_attendance_status, ar.attendance_status),
    attendance_status = p_new_status,
    overridden = true,
    override_reason = trim(p_reason)
  where ar.id = p_record_id;

  if not found then
    raise exception 'Attendance record not found';
  end if;
end;
$$;

grant execute on function public.override_attendance_record(uuid, text, text) to authenticated;
