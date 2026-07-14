-- Restrict registration packet storage access to the same roles used by competitions.
-- Run this in the Supabase SQL Editor.

drop policy if exists "Authenticated users can read registration packets" on storage.objects;
drop policy if exists "Authenticated users can upload registration packets" on storage.objects;
drop policy if exists "Authenticated users can update registration packets" on storage.objects;
drop policy if exists "Authenticated users can delete registration packets" on storage.objects;

drop policy if exists "Exec users can read registration packets" on storage.objects;
create policy "Exec users can read registration packets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'registration-packets'
  and public.is_exec_user()
);

drop policy if exists "Captain and TM can upload registration packets" on storage.objects;
create policy "Captain and TM can upload registration packets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'registration-packets'
  and public.get_my_exec_title() in ('captain', 'team_manager')
);

drop policy if exists "Captain and TM can update registration packets" on storage.objects;
create policy "Captain and TM can update registration packets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'registration-packets'
  and public.get_my_exec_title() in ('captain', 'team_manager')
)
with check (
  bucket_id = 'registration-packets'
  and public.get_my_exec_title() in ('captain', 'team_manager')
);

drop policy if exists "Captain and TM can delete registration packets" on storage.objects;
create policy "Captain and TM can delete registration packets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'registration-packets'
  and public.get_my_exec_title() in ('captain', 'team_manager')
);
