import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatSeasonWindow, isOutsideSeasonWindow } from "../lib/competitions.ts";

const form = readFileSync(
  new URL("../components/competition-create-form.tsx", import.meta.url),
  "utf8",
);

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260729000000_competition_date_within_season.sql",
    import.meta.url,
  ),
  "utf8",
);

const SEASON_STARTS = "2025-08-01";
const SEASON_ENDS = "2026-07-31";

const outside = (date) => isOutsideSeasonWindow(date, SEASON_STARTS, SEASON_ENDS);

/**
 * The reported flaw: the 2025-2026 list holds "Mania pt 2" dated June 6 2006 and
 * "Mania 7" dated March 4 2025, against a season running August 2025 to July
 * 2026. The form only checked that a date was entered.
 */
test("a date from another year does not belong to this season", () => {
  assert.equal(outside("2006-06-06"), true);
  assert.equal(outside("2025-03-04"), true);
  assert.equal(outside("2030-01-01"), true);
});

test("a date inside the season is accepted", () => {
  assert.equal(outside("2025-12-06"), false);
  assert.equal(outside("2026-03-04"), false);
});

/** Both ends inclusive - a competition on the season's first or last day is in it. */
test("the season's own first and last day are inside it", () => {
  assert.equal(outside("2025-08-01"), false);
  assert.equal(outside("2026-07-31"), false);
  assert.equal(outside("2025-07-31"), true);
  assert.equal(outside("2026-08-01"), true);
});

test("an empty date is left to the required-field check", () => {
  assert.equal(outside(""), false);
});

/** The bounds come from the seasons table, which can be edited. If a season has
 *  none there is nothing to measure against, and the create form must not start
 *  refusing every date. */
test("missing season bounds check nothing", () => {
  assert.equal(isOutsideSeasonWindow("2006-06-06", null, SEASON_ENDS), false);
  assert.equal(isOutsideSeasonWindow("2006-06-06", SEASON_STARTS, undefined), false);
});

test("the window is spelled out in plain dates", () => {
  assert.equal(
    formatSeasonWindow(SEASON_STARTS, SEASON_ENDS),
    "August 1, 2025 to July 31, 2026",
  );
});

test("the form refuses a date outside the season and says which season", () => {
  assert.match(
    form,
    /isOutsideSeasonWindow\(competitionDate, seasonStartsOn, seasonEndsOn\)\) \{\s+errors\.competitionDate = `Competition date must fall within the \$\{season\} season/,
  );
  // The picker itself is bounded too, so the season is visible before submitting.
  assert.match(form, /min=\{seasonStartsOn\}\s+max=\{seasonEndsOn\}/);
});

/** The bounds live in another table, so this cannot be a check constraint. */
test("the database refuses an out-of-season date too", () => {
  assert.match(
    migration,
    /if new\.competition_date < v_starts_on or new\.competition_date > v_ends_on then\s+raise exception/,
  );
  assert.match(
    migration,
    /before insert or update of competition_date, season on public\.competitions/,
  );
  // A season with no row to measure against is left alone...
  assert.match(migration, /if v_starts_on is null then\s+return new;/);
  // ...and so are the rows that predate the rule: close_past_competitions()
  // rewrites their status on every page view and must not start failing.
  assert.doesNotMatch(migration, /before insert or update on public\.competitions/);
});
