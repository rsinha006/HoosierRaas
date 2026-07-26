import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatExportCategory,
  formatExportedAt,
  resolveExportedMembers,
} from "../lib/member-export-log.ts";

const createMigration = readFileSync(
  new URL("../supabase/migrations/20260723000000_member_export_log.sql", import.meta.url),
  "utf8",
);

const readOnlyMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260726000000_member_export_log_read_only.sql",
    import.meta.url,
  ),
  "utf8",
);

test("every HROS user can read the export log", () => {
  assert.match(
    createMigration,
    /create policy "Exec users can read member export log"[\s\S]*?for select[\s\S]*?to authenticated[\s\S]*?using \(public\.is_exec_user\(\)\)/,
  );
});

test("no authenticated user can write to the export log", () => {
  assert.match(
    readOnlyMigration,
    /drop policy if exists "Team managers can log member exports" on public\.member_export_log/,
  );
  assert.match(
    readOnlyMigration,
    /revoke insert, update, delete on public\.member_export_log from authenticated/,
  );
  assert.match(
    readOnlyMigration,
    /revoke insert, update, delete on public\.member_export_log from anon/,
  );
});

test("category keys render with their export dialog labels", () => {
  assert.equal(formatExportCategory("emergency_contact"), "Emergency Contact");
  assert.equal(formatExportCategory("covid_vaccination"), "COVID Vaccination Record");
});

test("a retired category key still renders readably", () => {
  assert.equal(formatExportCategory("shoe_size"), "Shoe Size");
});

// The log renders on the server, so without a pinned timezone the same export would
// read differently depending on where it rendered — UTC in production, the
// developer's zone locally.
test("timestamps render in the team's timezone regardless of the host", () => {
  assert.equal(
    formatExportedAt("2026-07-24T18:30:00.000Z"),
    "July 24, 2026 at 2:30 PM EDT",
  );
  assert.equal(
    formatExportedAt("2026-01-15T02:00:00.000Z"),
    "January 14, 2026 at 9:00 PM EST",
  );
});

test("exported members resolve to sorted names", () => {
  const { names, removedCount } = resolveExportedMembers(["b", "a"], {
    a: "Ada Lovelace",
    b: "Grace Hopper",
  });

  assert.deepEqual(names, ["Ada Lovelace", "Grace Hopper"]);
  assert.equal(removedCount, 0);
});

test("members deleted since the export are counted, not dropped", () => {
  const { names, removedCount } = resolveExportedMembers(["a", "gone", "also-gone"], {
    a: "Ada Lovelace",
  });

  assert.deepEqual(names, ["Ada Lovelace"]);
  assert.equal(removedCount, 2);
});
