-- A competition could be filed under a season it does not happen in. The create
-- form only checked that a date was entered, and the database only that it was a
-- date. The 2025-2026 list currently holds "Mania pt 2" dated June 6 2006 and
-- "Mania 7" dated March 4 2025, against a season that runs August 2025 to
-- July 2026 - and both appear in the public expense and reimbursement dropdowns
-- dancers pick from.
--
-- A check constraint cannot express this: the bounds live in another table
-- (seasons.starts_on / ends_on), which the app is already free to change. So it
-- is a trigger.
--
-- Run this in the Supabase SQL Editor before merging the app change.

create or replace function public.competition_date_within_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_on date;
  v_ends_on date;
begin
  select starts_on, ends_on
  into v_starts_on, v_ends_on
  from public.seasons
  where label = new.season;

  -- No season row to measure against - leave it to the season checks that
  -- already exist elsewhere rather than inventing a bound here.
  if v_starts_on is null then
    return new;
  end if;

  if new.competition_date < v_starts_on or new.competition_date > v_ends_on then
    raise exception
      'Competition date % is outside the % season (% to %)',
      new.competition_date, new.season, v_starts_on, v_ends_on;
  end if;

  return new;
end;
$$;

drop trigger if exists competitions_date_within_season on public.competitions;

-- Inserts always, updates only when the date or the season is being written. The
-- rows already dated outside their season predate this rule, and they still get
-- status updates written to them - close_past_competitions() runs over every
-- past competition on each competitions page view, and it must not start
-- failing on the old rows. Correcting or removing those two is a call for the
-- exec board, not a side effect of a migration.
create trigger competitions_date_within_season
before insert or update of competition_date, season on public.competitions
for each row
execute function public.competition_date_within_season();
