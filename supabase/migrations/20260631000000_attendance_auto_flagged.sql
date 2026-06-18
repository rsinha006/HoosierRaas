-- Distinguish voluntary form submissions from system-flagged non-responders.

alter table public.attendance_records
  add column if not exists auto_flagged boolean not null default false;

-- Backfill: system records have no excuse details from the public form.
update public.attendance_records
set auto_flagged = true
where auto_flagged = false
  and attendance_status = 'absent_unexcused'
  and excuse_text is null
  and advance_notice = false
  and is_emergency = false
  and practice_video_submitted is null;

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
    returning id
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
    and 'dancer' = any (m.roles)
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
begin
  if public.get_my_exec_title() not in ('captain', 'team_manager') then
    raise exception 'Not authorized to close practice sessions';
  end if;

  if not exists (
    select 1
    from public.practice_sessions
    where id = p_session_id
  ) then
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
    and 'dancer' = any (m.roles)
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
