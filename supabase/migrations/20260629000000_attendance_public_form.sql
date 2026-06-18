-- Public attendance form: video fields and token lookup helpers.
-- Run this in the Supabase SQL Editor.

alter table public.attendance_records
  add column if not exists practice_video_submitted boolean,
  add column if not exists practice_video_excuse text;

create or replace function public.get_practice_session_for_attendance(p_token uuid)
returns table (
  id uuid,
  session_date date,
  session_time time,
  type text,
  status text,
  response_window_closes_at timestamptz,
  is_accepting_responses boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ps.id,
    ps.session_date,
    ps.session_time,
    ps.type,
    ps.status,
    ps.response_window_closes_at,
    (
      ps.status = 'open'
      and ps.response_window_closes_at > now()
    ) as is_accepting_responses
  from public.practice_sessions ps
  where ps.shareable_token = p_token;
$$;

create or replace function public.attendance_already_submitted(
  p_session_id uuid,
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
    where ar.session_id = p_session_id
      and lower(ar.respondent_email) = lower(p_email)
  );
$$;

grant execute on function public.get_practice_session_for_attendance(uuid) to anon, authenticated;
grant execute on function public.attendance_already_submitted(uuid, text) to anon, authenticated;
