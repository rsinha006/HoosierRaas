-- Registration packet uploads for competitions.
-- Run this in the Supabase SQL Editor.

alter table public.competitions
  add column if not exists packet_url text,
  add column if not exists packet_uploaded_at timestamptz;

insert into storage.buckets (id, name, public)
values ('registration-packets', 'registration-packets', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read registration packets" on storage.objects;
create policy "Authenticated users can read registration packets"
on storage.objects
for select
to authenticated
using (bucket_id = 'registration-packets');

drop policy if exists "Authenticated users can upload registration packets" on storage.objects;
create policy "Authenticated users can upload registration packets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'registration-packets');

drop policy if exists "Authenticated users can update registration packets" on storage.objects;
create policy "Authenticated users can update registration packets"
on storage.objects
for update
to authenticated
using (bucket_id = 'registration-packets')
with check (bucket_id = 'registration-packets');

drop policy if exists "Authenticated users can delete registration packets" on storage.objects;
create policy "Authenticated users can delete registration packets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'registration-packets');
