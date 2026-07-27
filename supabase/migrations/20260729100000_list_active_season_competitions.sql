-- The public expense and reimbursement forms list every competition HROS has ever
-- held. They read public.competitions directly, and the policy that lets an
-- unauthenticated page do that ("Public can read competitions for forms") is
-- using (true) - no season in it anywhere. So a dancer filing a claim today picks
-- from a list that still includes last season's competitions, and the two rows
-- dated outside any season at all.
--
-- Scoping it in the page is not possible: public.seasons is readable by
-- authenticated only, so an anonymous page cannot look up which season is active.
-- Same shape as list_active_season_expense_categories / _iufb_line_items, which
-- exist for exactly this reason.
--
-- Run this in the Supabase SQL Editor before merging the app change.

create or replace function public.list_active_season_competitions()
returns table(id uuid, name text, competition_date date)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.competition_date
  from public.competitions c
  join public.seasons s on s.label = c.season
  where s.is_active = true
  order by c.competition_date;
$$;

grant execute on function public.list_active_season_competitions() to anon, authenticated;
