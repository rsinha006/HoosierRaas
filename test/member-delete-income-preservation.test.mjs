import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const originalMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260713000000_admin_delete_member.sql",
    import.meta.url,
  ),
  "utf8",
);

const correctiveMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260721210718_block_income_deleting_member.sql",
    import.meta.url,
  ),
  "utf8",
);

const userFacingErrors = readFileSync(
  new URL("../lib/user-facing-errors.ts", import.meta.url),
  "utf8",
);

test("member deletion preserves linked income records", () => {
  assert.match(
    originalMigration,
    /delete from public\.income_entries where member_id = p_member_id/,
  );
  assert.match(
    correctiveMigration,
    /if exists \([\s\S]*?from public\.income_entries[\s\S]*?where member_id = p_member_id[\s\S]*?raise exception 'member_has_linked_income_entries'/,
  );
  assert.doesNotMatch(correctiveMigration, /delete from public\.income_entries/);
});

test("linked-income delete failures show the finance-record warning", () => {
  assert.match(
    userFacingErrors,
    /message\.includes\("member_has_linked_income_entries"\)[\s\S]*?linked income records/,
  );
});
