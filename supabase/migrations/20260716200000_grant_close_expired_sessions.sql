-- Auto-flagging non-responders only ever happened via the pg_cron schedule, with no
-- fallback if cron isn't enabled or silently fails. Explicitly grant authenticated
-- users execute on the close function so the app can also call it opportunistically
-- (e.g. when the attendance dashboard loads) as a safety net.
-- Run this in the Supabase SQL Editor.

grant execute on function public.close_expired_practice_sessions() to authenticated;
