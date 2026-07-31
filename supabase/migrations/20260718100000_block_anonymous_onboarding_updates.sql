-- Anonymous onboarding updates let anyone with the public key overwrite a pending
-- member row by email/id before Team Manager review. Keep public onboarding to
-- inserts only; existing rows must be handled by staff rejecting or confirming them.
-- Run this in the Supabase SQL Editor.

create or replace function public.is_onboarding_completion_roles(roles text[])
returns boolean
language sql
immutable
as $$
  select public.is_onboarding_submission(roles);
$$;

drop policy if exists "Allow anonymous dancer onboarding update" on public.members;
