-- Marketing and Social exec titles are no longer in scope for the app. Only
-- captain / team_manager / finance are valid exec titles going forward.
-- Run this in the Supabase SQL Editor.

update public.members
set exec_title = null
where exec_title in ('marketing', 'social');

update public.season_memberships
set exec_title = null
where exec_title in ('marketing', 'social');

create or replace function public.has_valid_member_role_shape(member_roles text[], member_exec_title text)
returns boolean
language sql
immutable
as $$
  select member_roles <@ array['dancer', 'exec', 'production']::text[]
    and cardinality(member_roles) > 0
    and (
      ('exec' = any (member_roles)
        and member_exec_title in ('captain', 'team_manager', 'finance'))
      or (
        not ('exec' = any (member_roles))
        and member_exec_title is null
      )
    );
$$;
