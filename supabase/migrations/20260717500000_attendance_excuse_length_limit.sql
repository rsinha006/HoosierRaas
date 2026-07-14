-- Excuse text boxes had no length limit at all — someone could paste an enormous
-- wall of text, which then displays inline in every staff-facing attendance table.
-- The UI now caps these at 500 characters via maxLength; add the matching DB limit
-- so it can't be bypassed by calling the submission function directly.
-- Run this in the Supabase SQL Editor.

alter table public.attendance_records drop constraint if exists excuse_text_length_limit;
alter table public.attendance_records
  add constraint excuse_text_length_limit
  check (excuse_text is null or length(excuse_text) <= 500);

alter table public.attendance_records drop constraint if exists practice_video_excuse_length_limit;
alter table public.attendance_records
  add constraint practice_video_excuse_length_limit
  check (practice_video_excuse is null or length(practice_video_excuse) <= 500);
