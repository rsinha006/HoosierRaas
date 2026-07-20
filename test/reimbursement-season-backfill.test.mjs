import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const originalMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260716800000_reimbursements_season_scoped.sql",
    import.meta.url,
  ),
  "utf8",
);

const correctiveMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260720000000_fix_reimbursement_season_backfill.sql",
    import.meta.url,
  ),
  "utf8",
);

test("reimbursement season backfill is corrected from reimbursement dates", () => {
  assert.match(
    originalMigration,
    /update public\.reimbursements[\s\S]*?where s\.is_active = true[\s\S]*?where season is null/,
  );
  assert.match(
    correctiveMigration,
    /update public\.reimbursements reimbursement[\s\S]*?from public\.seasons matched_season/,
  );
  assert.match(
    correctiveMigration,
    /reimbursement\.date_of_purchase[\s\S]*?reimbursement\.submission_timestamp::date[\s\S]*?reimbursement\.payment_timestamp::date[\s\S]*?reimbursement\.created_at::date/,
  );
  assert.match(
    correctiveMigration,
    />= matched_season\.starts_on[\s\S]*?<= matched_season\.ends_on/,
  );
  assert.match(
    correctiveMigration,
    /reimbursement\.season is distinct from matched_season\.label/,
  );
  assert.doesNotMatch(correctiveMigration, /is_active\s*=\s*true/);
});
