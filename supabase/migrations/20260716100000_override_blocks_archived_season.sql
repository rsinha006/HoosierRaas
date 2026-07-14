-- override_attendance_record() had no check that the session it's changing still
-- belongs to the active season, so a captain/TM could "correct" an attendance record
-- from a frozen, archived season through the sanctioned override flow.
-- Run this in the Supabase SQL Editor.

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
declare
  v_record_season text;
  v_active_season text;
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

  select ps.season into v_record_season
  from public.attendance_records ar
  join public.practice_sessions ps on ps.id = ar.session_id
  where ar.id = p_record_id;

  if v_record_season is null then
    raise exception 'Attendance record not found';
  end if;

  select label into v_active_season from public.seasons where is_active = true;

  if v_record_season <> v_active_season then
    raise exception 'This attendance record belongs to an archived season and is read-only';
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
