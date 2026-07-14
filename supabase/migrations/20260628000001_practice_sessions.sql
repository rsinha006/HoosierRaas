-- Practice sessions and attendance records for HROS Attendance module.
-- Run this in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- practice_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_date date not null,
  session_time time not null,
  type text not null
    check (type in ('practice', 'fundraiser', 'exec meeting')),
  response_window_closes_at timestamptz not null default (now() + interval '5 hours'),
  status text not null default 'open'
    check (status in ('open', 'closed')),
  shareable_token uuid not null default gen_random_uuid() unique
);

create index if not exists practice_sessions_session_date_idx
  on public.practice_sessions (session_date desc);

create index if not exists practice_sessions_status_idx
  on public.practice_sessions (status);

create index if not exists practice_sessions_shareable_token_idx
  on public.practice_sessions (shareable_token);

create or replace function public.set_practice_session_response_window()
returns trigger
language plpgsql
as $$
begin
  new.response_window_closes_at := coalesce(new.created_at, now()) + interval '5 hours';
  return new;
end;
$$;

drop trigger if exists practice_sessions_set_response_window on public.practice_sessions;

create trigger practice_sessions_set_response_window
before insert on public.practice_sessions
for each row
execute function public.set_practice_session_response_window();

-- ---------------------------------------------------------------------------
-- attendance_records
-- ---------------------------------------------------------------------------

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  respondent_name text not null,
  respondent_email text not null,
  attendance_status text not null
    check (attendance_status in ('present', 'late', 'absent_excused', 'absent_unexcused')),
  excuse_text text,
  advance_notice boolean not null default false,
  is_emergency boolean not null default false,
  response_timestamp timestamptz not null default now(),
  overridden boolean not null default false,
  override_reason text
);

create index if not exists attendance_records_session_id_idx
  on public.attendance_records (session_id);

create index if not exists attendance_records_member_id_idx
  on public.attendance_records (member_id);

create unique index if not exists attendance_records_session_email_idx
  on public.attendance_records (session_id, lower(respondent_email));

create or replace function public.match_attendance_member_by_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.member_id is null and new.respondent_email is not null then
    select m.id
    into new.member_id
    from public.members m
    where lower(m.email) = lower(new.respondent_email)
    limit 1;
  end if;

  if new.response_timestamp is null then
    new.response_timestamp := now();
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_records_match_member on public.attendance_records;

create trigger attendance_records_match_member
before insert on public.attendance_records
for each row
execute function public.match_attendance_member_by_email();

-- ---------------------------------------------------------------------------
-- Scheduled close + non-responder flagging
-- ---------------------------------------------------------------------------

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

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;

do $outer$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'close-expired-practice-sessions'
  ) then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'close-expired-practice-sessions';
  end if;

  perform cron.schedule(
    'close-expired-practice-sessions',
    '*/15 * * * *',
    $$select public.close_expired_practice_sessions()$$
  );
end;
$outer$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.practice_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "Exec users can read practice sessions" on public.practice_sessions;
create policy "Exec users can read practice sessions"
on public.practice_sessions
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can insert practice sessions" on public.practice_sessions;
create policy "Captain and TM can insert practice sessions"
on public.practice_sessions
for insert
to authenticated
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Captain and TM can update practice sessions" on public.practice_sessions;
create policy "Captain and TM can update practice sessions"
on public.practice_sessions
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Public can read open practice sessions" on public.practice_sessions;
create policy "Public can read open practice sessions"
on public.practice_sessions
for select
to anon, authenticated
using (
  status = 'open'
  and response_window_closes_at > now()
);

drop policy if exists "Exec users can read attendance records" on public.attendance_records;
create policy "Exec users can read attendance records"
on public.attendance_records
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can update attendance records" on public.attendance_records;
create policy "Captain and TM can update attendance records"
on public.attendance_records
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Public can submit attendance responses" on public.attendance_records;
create policy "Public can submit attendance responses"
on public.attendance_records
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.practice_sessions ps
    where ps.id = session_id
      and ps.status = 'open'
      and ps.response_window_closes_at > now()
  )
  and respondent_name is not null
  and respondent_email is not null
  and attendance_status in ('present', 'late', 'absent_excused', 'absent_unexcused')
  and overridden = false
);

grant select on public.practice_sessions to anon;
grant insert on public.attendance_records to anon;
