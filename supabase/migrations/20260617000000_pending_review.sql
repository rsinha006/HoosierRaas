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

create or replace function public.has_valid_member_role_shape(member_roles text[], member_exec_title text)
returns boolean
language sql
immutable
as $$
  select member_roles <@ array['dancer', 'exec', 'production']::text[]
    and cardinality(member_roles) > 0
    and (
      ('exec' = any (member_roles)
        and member_exec_title in ('captain', 'team_manager', 'finance', 'marketing', 'social'))
      or (
        not ('exec' = any (member_roles))
        and member_exec_title is null
      )
    );
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

drop policy if exists "Captain and TM can insert members" on public.members;
create policy "Captain and TM can insert members"
on public.members
for insert
to authenticated
with check (
  public.get_my_exec_title() in ('captain', 'team_manager')
  and pending_review = false
  and public.has_valid_member_role_shape(roles, exec_title)
);

drop policy if exists "Captain and TM can update members" on public.members;
create policy "Captain and TM can update members"
on public.members
for update
to authenticated
using (public.get_my_exec_title() in ('captain', 'team_manager'))
with check (
  public.get_my_exec_title() in ('captain', 'team_manager')
  and public.has_valid_member_role_shape(roles, exec_title)
);
