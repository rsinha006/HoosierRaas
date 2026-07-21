import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const financePage = readFileSync(
  new URL("../app/(hros)/finance/page.tsx", import.meta.url),
  "utf8",
);

const expensesPage = readFileSync(
  new URL("../app/(hros)/finance/expenses/page.tsx", import.meta.url),
  "utf8",
);

const budgetSetupPage = readFileSync(
  new URL("../app/(hros)/finance/budget-setup/page.tsx", import.meta.url),
  "utf8",
);

const archivePreview = readFileSync(
  new URL("../lib/archive-season-server.ts", import.meta.url),
  "utf8",
);

const archiveMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260721210719_filter_reimbursements_by_season.sql",
    import.meta.url,
  ),
  "utf8",
);

test("finance summaries filter paid reimbursements by explicit season", () => {
  assert.match(
    financePage,
    /\.from\("reimbursements"\)[\s\S]*?\.select\("amount"\)[\s\S]*?\.eq\("status", "paid"\)[\s\S]*?\.eq\("season", season\)/,
  );
  assert.match(
    expensesPage,
    /\.from\("reimbursements"\)[\s\S]*?\.select\("category, amount"\)[\s\S]*?\.eq\("status", "paid"\)[\s\S]*?\.eq\("season", season\)/,
  );
  assert.match(
    budgetSetupPage,
    /\.from\("reimbursements"\)[\s\S]*?\.select\("category, amount"\)[\s\S]*?\.eq\("status", "paid"\)[\s\S]*?\.eq\("season", season\)/,
  );
});

test("archive preview and SQL carryover use reimbursement season", () => {
  assert.match(
    archivePreview,
    /\.from\("reimbursements"\)[\s\S]*?\.select\("amount"\)[\s\S]*?\.eq\("status", "paid"\)[\s\S]*?\.eq\("season", activeSeasonLabel\)/,
  );
  assert.match(
    archiveMigration,
    /from public\.reimbursements[\s\S]*?where status = 'paid'[\s\S]*?and season = v_a_label/,
  );
  assert.doesNotMatch(archiveMigration, /payment_timestamp >= v_expense_start/);
});
