-- Duplicate-submission protection was keyed only on the typed email address, so the
-- same real member could end up with two (possibly contradictory) attendance records
-- for one session just by using a slightly different email spelling — the row is
-- already matched to a real member_id by the attendance_records_match_member trigger
-- before this constraint is checked, so once a submission is tied to an actual
-- member, block a second one for that member on the same session regardless of what
-- email was typed the second time.
-- Run this in the Supabase SQL Editor.

create unique index if not exists attendance_records_session_member_idx
  on public.attendance_records (session_id, member_id)
  where member_id is not null;

-- Keep the "have you already responded?" pre-check in sync with the constraint above:
-- catch a member who already submitted under a different email spelling too, not just
-- an exact repeat of the same email string.
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
      and (
        lower(ar.respondent_email) = lower(p_email)
        or (
          ar.member_id is not null
          and ar.member_id = (
            select m.id from public.members m
            where lower(m.email) = lower(p_email)
            limit 1
          )
        )
      )
  );
$$;
