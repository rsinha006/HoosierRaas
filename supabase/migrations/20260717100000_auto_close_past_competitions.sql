-- Competition status only ever moved from "upcoming" to "active" (when packet data
-- was saved) — nothing ever marked a competition "complete" once its date passed, so
-- old competitions sat around forever showing as "Active" or even "Upcoming". Mirror
-- the same opportunistic-close pattern already used for practice sessions
-- (close_expired_practice_sessions): call this cheaply on every relevant page load
-- instead of relying solely on a cron job.
-- Run this in the Supabase SQL Editor.

create or replace function public.close_past_competitions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.competitions
  set status = 'complete'
  where status <> 'complete'
    and competition_date < current_date;
end;
$$;

grant execute on function public.close_past_competitions() to authenticated;
