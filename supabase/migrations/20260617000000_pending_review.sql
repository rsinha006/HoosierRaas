-- Pending onboarding review workflow for Team Manager.
-- Run this in the Supabase SQL Editor.

alter table public.members
  add column if not exists pending_review boolean not null default false;

create or replace function public.get_my_exec_title()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select exec_title
  from public.members
  where email = lower(auth.jwt() ->> 'email')
  limit 1;
$$;

drop policy if exists "Allow anonymous dancer onboarding insert" on public.members;
create policy "Allow anonymous dancer onboarding insert"
on public.members
for insert
to anon, authenticated
with check (
  exec_title is null
  and status = 'active'
  and pending_review = true
  and email like '%@iu.edu'
  and public.is_onboarding_submission(roles)
);

drop policy if exists "Captain and TM can update members" on public.members;
create policy "Captain and TM can update members"
on public.members
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (public.get_my_exec_title() in ('captain', 'team_manager'));
