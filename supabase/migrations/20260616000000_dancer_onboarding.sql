-- Dancer onboarding: new member columns, storage bucket, and public access policies.
-- Run this in the Supabase SQL Editor.

alter table public.members
  add column if not exists dietary_restrictions text,
  add column if not exists medical_conditions text,
  add column if not exists shirt_size text,
  add column if not exists pants_size text,
  add column if not exists government_id_path text,
  add column if not exists birthday_image_path text,
  add column if not exists student_id_path text,
  add column if not exists covid_vaccination_path text,
  add column if not exists drinks_alcohol boolean,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text;

create or replace function public.is_exec_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where email = lower(auth.jwt() ->> 'email')
      and 'exec' = any (roles)
  );
$$;

insert into storage.buckets (id, name, public)
values ('member-documents', 'member-documents', false)
on conflict (id) do nothing;

create or replace function public.is_onboarding_submission(roles text[])
returns boolean
language sql
immutable
as $$
  select roles <@ array['dancer', 'production']::text[]
    and cardinality(roles) > 0
    and not ('exec' = any (roles));
$$;

drop policy if exists "Allow anonymous dancer onboarding insert" on public.members;
create policy "Allow anonymous dancer onboarding insert"
on public.members
for insert
to anon, authenticated
with check (
  exec_title is null
  and status = 'active'
  and email like '%@iu.edu'
  and public.is_onboarding_submission(roles)
);

drop policy if exists "Allow anonymous onboarding uploads" on storage.objects;
create policy "Allow anonymous onboarding uploads"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'member-documents'
  and (storage.foldername(name))[1] = 'onboarding'
);

drop policy if exists "Exec users can read member documents" on storage.objects;
create policy "Exec users can read member documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-documents'
  and public.is_exec_user()
);
