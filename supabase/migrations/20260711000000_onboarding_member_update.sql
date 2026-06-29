-- Allow dancer onboarding to complete an existing member record (e.g. stub from signup).

create or replace function public.is_onboarding_completion_roles(roles text[])
returns boolean
language sql
immutable
as $$
  select cardinality(roles) > 0
    and roles <@ array['dancer', 'exec', 'production']::text[]
    and ('dancer' = any (roles) or 'production' = any (roles));
$$;

create or replace function public.is_eligible_for_onboarding_update(
  member_pending_review boolean,
  member_government_id_path text
)
returns boolean
language sql
immutable
as $$
  select member_pending_review = true
    or member_government_id_path is null;
$$;

drop policy if exists "Allow anonymous onboarding member lookup" on public.members;
create policy "Allow anonymous onboarding member lookup"
on public.members
for select
to anon, authenticated
using (
  email like '%@iu.edu'
  and public.is_eligible_for_onboarding_update(pending_review, government_id_path)
);

drop policy if exists "Allow anonymous dancer onboarding update" on public.members;
create policy "Allow anonymous dancer onboarding update"
on public.members
for update
to anon, authenticated
using (
  email like '%@iu.edu'
  and public.is_eligible_for_onboarding_update(pending_review, government_id_path)
)
with check (
  exec_title is null
  and status = 'active'
  and pending_review = true
  and email like '%@iu.edu'
  and public.is_onboarding_completion_roles(roles)
);
