-- Deadline reminder emails: configurable lead times + a dedup/audit log so the
-- daily cron job (see 20260724100000_deadline_reminders_cron.sql) never sends
-- the same (deadline, lead_days) reminder twice.

create table if not exists public.reminder_settings (
  id integer primary key default 1,
  lead_days integer[] not null default '{3}',
  updated_at timestamptz not null default now(),
  constraint reminder_settings_singleton check (id = 1)
);

insert into public.reminder_settings (id, lead_days)
values (1, '{3}')
on conflict (id) do nothing;

create table if not exists public.deadline_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  deadline_id uuid not null references public.deadlines(id) on delete cascade,
  lead_days integer not null,
  sent_at timestamptz not null default now(),
  unique (deadline_id, lead_days)
);

create index if not exists deadline_reminders_sent_deadline_id_idx
  on public.deadline_reminders_sent (deadline_id);

alter table public.reminder_settings enable row level security;
alter table public.deadline_reminders_sent enable row level security;

grant select, update on public.reminder_settings to authenticated;
grant select on public.deadline_reminders_sent to authenticated;

drop policy if exists "Exec users can read reminder settings" on public.reminder_settings;
create policy "Exec users can read reminder settings"
on public.reminder_settings
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Captain and TM can update reminder settings" on public.reminder_settings;
create policy "Captain and TM can update reminder settings"
on public.reminder_settings
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));

drop policy if exists "Exec users can read sent reminders" on public.deadline_reminders_sent;
create policy "Exec users can read sent reminders"
on public.deadline_reminders_sent
for select
to authenticated
using (public.is_exec_user());

-- No insert/update/delete policies for deadline_reminders_sent: only the
-- service-role client used by app/api/reminders/send bypasses RLS to write rows.
