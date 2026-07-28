import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const dashboard = readFileSync(
  new URL("../app/(hros)/finance/page.tsx", import.meta.url),
  "utf8",
);
const expenses = readFileSync(
  new URL("../app/(hros)/finance/expenses/page.tsx", import.meta.url),
  "utf8",
);
const budgetSetup = readFileSync(
  new URL("../app/(hros)/finance/budget-setup/page.tsx", import.meta.url),
  "utf8",
);
const archiveServer = readFileSync(
  new URL("../lib/archive-season-server.ts", import.meta.url),
  "utf8",
);

/**
 * The reported flaw (M2, part one): on the Finance dashboard, pending
 * reimbursements were matched by season label but paid ones were matched by
 * payment date - a reimbursement submitted in one season and paid in the next
 * could be counted in the wrong place, or in neither. A reimbursement's
 * `season` is stamped once at submission and never revisited when it is later
 * paid (see submit_public_reimbursement / reimbursement-queue's handleMarkPaid),
 * so `payment_timestamp` is the wrong column to scope it to a season by -
 * `season` is the one column every reimbursement query can agree on. This is
 * also what the Reimbursements page itself already does for every status.
 */
for (const [name, source] of [
  ["the Finance dashboard", dashboard],
  ["the Expenses approval queue", expenses],
  ["Budget Setup", budgetSetup],
]) {
  test(`${name} matches paid reimbursements by season, not payment date`, () => {
    assert.doesNotMatch(source, /"payment_timestamp"/);
    assert.match(
      source,
      /\.from\("reimbursements"\)\s*\.select\("category, amount"\)\s*\.eq\("status", "paid"\)\s*\.eq\("season", season\)/,
    );
  });
}

test("the season-archive ending-balance preview does the same", () => {
  assert.doesNotMatch(archiveServer, /"payment_timestamp"/);
  assert.match(
    archiveServer,
    /\.from\("reimbursements"\)\s*\.select\("amount"\)\s*\.eq\("status", "paid"\)\s*\.eq\("season", activeSeasonLabel\)/,
  );
});

test("pending and paid reimbursements are scoped to a season the same way on the dashboard", () => {
  const pendingMatch = dashboard.match(
    /\.from\("reimbursements"\)\s*\.select\("amount"\)\s*\.eq\("status", "pending"\)\s*\.eq\("season", season\)/,
  );
  assert.ok(pendingMatch, "expected the pending-reimbursements query to filter by season");
});
