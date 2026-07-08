-- The receipts storage bucket had no file-size or file-type limit, so a direct
-- upload via the storage API (bypassing the reimbursement form's client-side check)
-- could push an oversized or arbitrary file type straight into storage.
-- Run this in the Supabase SQL Editor.

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB, matches MAX_RECEIPT_BYTES in lib/reimbursements.ts
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
where id = 'receipts';
