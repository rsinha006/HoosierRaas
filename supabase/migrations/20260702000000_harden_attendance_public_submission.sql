-- Harden public attendance submission so the shareable token remains a secret.

drop policy if exists "Public can read open practice sessions" on public.practice_sessions;
drop policy if exists "Public can submit attendance responses" on public.attendance_records;

revoke select on public.practice_sessions from anon;
revoke insert on public.attendance_records from anon;

create or replace function public.submit_attendance_response(
  p_session_id uuid,
  p_respondent_name text,
  p_respondent_email text,
  p_attendance_status text,
  p_excuse_text text default null,
  p_advance_notice boolean default false,
  p_is_emergency boolean default false,
  p_practice_video_submitted boolean default null,
  p_practice_video_excuse text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
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

  if not exists (
    select 1
    from public.practice_sessions ps
    where ps.id = p_session_id
      and ps.status = 'open'
      and ps.response_window_closes_at > now()
  ) then
    raise exception 'This attendance session is no longer accepting responses';
  end if;

  insert into public.attendance_records (
    session_id,
    respondent_name,
    respondent_email,
    attendance_status,
    excuse_text,
    advance_notice,
    is_emergency,
    practice_video_submitted,
    practice_video_excuse,
    overridden,
    auto_flagged
  )
  values (
    p_session_id,
    v_respondent_name,
    v_respondent_email,
    p_attendance_status,
    nullif(trim(coalesce(p_excuse_text, '')), ''),
    coalesce(p_advance_notice, false),
    coalesce(p_is_emergency, false),
    p_practice_video_submitted,
    nullif(trim(coalesce(p_practice_video_excuse, '')), ''),
    false,
    false
  )
  returning id into v_record_id;

  return v_record_id;
end;
$$;

grant execute on function public.submit_attendance_response(
  uuid,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text
) to anon, authenticated;
