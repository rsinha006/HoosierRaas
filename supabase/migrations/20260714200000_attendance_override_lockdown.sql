-- The app's override UI correctly requires a written reason before changing an
-- attendance record, but that requirement only lived in the app itself. The database
-- separately let any captain/team_manager UPDATE attendance_records directly (no
-- reason required, no guarantee the original status was preserved), bypassing the
-- override_attendance_record() function entirely. That function is SECURITY DEFINER,
-- already checks the caller's role itself, and is the only supported way to change a
-- record post-submission — so direct client updates are revoked here.
-- Run this in the Supabase SQL Editor.

drop policy if exists "Captain and TM can update attendance records" on public.attendance_records;

revoke update on public.attendance_records from authenticated, anon;
