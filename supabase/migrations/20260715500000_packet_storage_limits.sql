-- The registration-packets storage bucket had no file-size or file-type limit, so a
-- direct upload via the storage API (bypassing the web form's own client-side check)
-- could push an oversized or non-PDF file straight into the AI extraction endpoint.
-- Run this in the Supabase SQL Editor.

update storage.buckets
set
  file_size_limit = 52428800, -- 50 MB, matches MAX_PACKET_BYTES in lib/registration-packets.ts
  allowed_mime_types = array['application/pdf']
where id = 'registration-packets';
