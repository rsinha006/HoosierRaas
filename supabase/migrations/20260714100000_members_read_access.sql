-- Fixes two bugs caused by "Allow anonymous onboarding member lookup" being the
-- ONLY select policy on public.members:
--
-- 1. Once a member is confirmed (pending_review = false) and has a government ID on
--    file, that policy's condition is never true for anyone — including exec users
--    viewing the roster through the app. Confirmed members silently disappeared from
--    the Members page and could get locked out of their own login.
-- 2. The same policy has no check tying the requester to the row being read, so
--    anyone with the public anon key could read every not-yet-reviewed member's
--    private onboarding data (medical conditions, emergency contacts, phone, etc.)
--    directly from the table.
--
-- Fix: exec users get a normal, full read policy. Anonymous onboarding no longer
-- reads the members table directly at all — it goes through a narrow function that
-- returns only the four fields the onboarding form actually needs to detect a
-- duplicate submission, for one email at a time.
-- Run this in the Supabase SQL Editor.

drop policy if exists "Allow anonymous onboarding member lookup" on public.members;

create policy "Exec users can read members"
on public.members
for select
to authenticated
using (public.is_exec_user());

create or replace function public.get_onboarding_member_status(p_email text)
returns table (
  id uuid,
  roles text[],
  pending_review boolean,
  government_id_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.roles, m.pending_review, m.government_id_path
  from public.members m
  where m.email = lower(p_email)
  limit 1;
$$;

revoke all on function public.get_onboarding_member_status(text) from public;
grant execute on function public.get_onboarding_member_status(text) to anon, authenticated;
