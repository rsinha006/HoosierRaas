-- Manual practice session close for captain / team manager.

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
    overridden
  )
  select
    p_session_id,
    m.id,
    trim(m.first_name || ' ' || m.last_name),
    m.email,
    'absent_unexcused',
    now(),
    false
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

grant execute on function public.close_practice_session_manually(uuid) to authenticated;
