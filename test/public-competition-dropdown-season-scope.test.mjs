import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const publicExpensePage = read("../app/expenses/page.tsx");
const publicReimbursementPage = read("../app/reimbursements/page.tsx");
const financeExpensePage = read("../app/(hros)/finance/expenses/page.tsx");
const migration = read(
  "../supabase/migrations/20260729100000_list_active_season_competitions.sql",
);

/**
 * The reported flaw: both public forms read public.competitions directly, with no
 * season filter, so a dancer filing a claim picked from every competition HROS has
 * ever held - including the two dated outside any season at all.
 */
test("neither public form reads the competitions table directly", () => {
  for (const page of [publicExpensePage, publicReimbursementPage]) {
    assert.doesNotMatch(page, /\.from\("competitions"\)/);
    assert.match(page, /supabase\.rpc\(\s*"list_active_season_competitions",?\s*\)/);
  }
});

/** The page cannot do this filtering itself - public.seasons is readable by
 *  authenticated users only, so an anonymous page has no way to ask which season
 *  is active. Hence a security definer RPC, like the two it sits beside. */
test("the RPC returns the active season's competitions only", () => {
  assert.match(
    migration,
    /join public\.seasons s on s\.label = c\.season\s+where s\.is_active = true/,
  );
  assert.match(migration, /security definer/);
  assert.match(migration, /order by c\.competition_date;/);
});

test("the RPC is callable by an unauthenticated dancer", () => {
  assert.match(
    migration,
    /grant execute on function public\.list_active_season_competitions\(\) to anon, authenticated;/,
  );
});

/** It exposes the same three columns the forms already showed - no more. */
test("the RPC hands out nothing the form did not already show", () => {
  assert.match(
    migration,
    /returns table\(id uuid, name text, competition_date date\)/,
  );
  assert.match(migration, /select c\.id, c\.name, c\.competition_date/);
});

/** The signed-in Finance screen was already scoped, and stays that way - it has a
 *  season to work from, so it does not need the RPC. */
test("the finance expenses screen still scopes competitions to its season", () => {
  assert.match(
    financeExpensePage,
    /\.from\("competitions"\)\s+\.select\("id, name, competition_date"\)\s+\.eq\("season", season\)/,
  );
});
