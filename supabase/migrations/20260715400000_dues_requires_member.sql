-- "Who has and hasn't paid dues" only works if dues income is actually linked to a
-- member. This constraint was dropped in 20260631000000_optional_income_member.sql to
-- allow unlinked dues entries — re-add it now that the app requires a member for dues.
-- Run this in the Supabase SQL Editor.

alter table public.income_entries drop constraint if exists dues_requires_member;

alter table public.income_entries
  add constraint dues_requires_member check (
    category <> 'dues' or member_id is not null
  );
