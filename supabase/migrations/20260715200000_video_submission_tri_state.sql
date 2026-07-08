-- The video-submission question only ever offered Yes/No, so there was no way to
-- record "submitted late" (fine-eligible) separately from "missing" (may count as an
-- absence) — both collapsed into the same "No" answer. Widen the column to a 3-state
-- value: on_time / late / missing. Existing rows: true -> on_time, false -> missing.
-- Run this in the Supabase SQL Editor.

alter table public.attendance_records
  add column if not exists practice_video_status text;

-- Guarded so this migration can be re-run safely: the backfill only runs if the old
-- boolean column is still there (it gets dropped further down).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'attendance_records'
      and column_name = 'practice_video_submitted'
  ) then
    update public.attendance_records
    set practice_video_status = case
      when practice_video_submitted = true then 'on_time'
      when practice_video_submitted = false then 'missing'
      else null
    end
    where practice_video_status is null;
  end if;
end $$;

alter table public.attendance_records drop constraint if exists practice_video_status_check;
alter table public.attendance_records
  add constraint practice_video_status_check
  check (practice_video_status in ('on_time', 'late', 'missing'));

alter table public.attendance_records drop column if exists practice_video_submitted;

drop function if exists public.submit_attendance_response(
  uuid, text, text, text, text, boolean, boolean, boolean, text
);

create or replace function public.submit_attendance_response(
  p_session_id uuid,
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
    practice_video_status,
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
    p_practice_video_status,
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
  text,
  text
) to anon, authenticated;
