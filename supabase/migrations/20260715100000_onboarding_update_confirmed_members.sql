-- The anonymous "update an existing member" path for onboarding was eligible whenever
-- pending_review = true OR government_id_path IS NULL. That second clause meant any
-- member added directly by an exec (who never has a government_id_path) stayed
-- anonymously updatable forever, even after being confirmed — so re-submitting the
-- public onboarding form under their email would silently demote a confirmed exec
-- back to "pending" and wipe their exec title. An update should only be allowed while
-- the submission is still pending review, full stop.
-- Run this in the Supabase SQL Editor.

create or replace function public.is_eligible_for_onboarding_update(
  member_pending_review boolean,
  member_government_id_path text
)
returns boolean
language sql
immutable
as $$
  select member_pending_review = true;
$$;
