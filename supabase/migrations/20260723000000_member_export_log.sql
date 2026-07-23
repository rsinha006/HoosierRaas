-- Team managers can now export member data (identity, medical, sizing, documents)
-- for competitions. Because medical and ID data is in scope, every export needs an
-- audit trail of who exported what, and when.
-- Run this in the Supabase SQL Editor.

create table if not exists public.member_export_log (
  id uuid primary key default gen_random_uuid(),
  exported_by_member_id uuid references public.members (id) on delete set null,
  member_ids uuid[] not null,
  member_count int not null,
  categories text[] not null,
  exported_at timestamptz not null default now()
);

grant select, insert on public.member_export_log to authenticated;

alter table public.member_export_log enable row level security;

drop policy if exists "Exec users can read member export log" on public.member_export_log;
create policy "Exec users can read member export log"
on public.member_export_log
for select
to authenticated
using (public.is_exec_user());

drop policy if exists "Team managers can log member exports" on public.member_export_log;
create policy "Team managers can log member exports"
on public.member_export_log
for insert
to authenticated
with check (
  public.get_my_exec_title() in ('captain', 'team_manager')
);
