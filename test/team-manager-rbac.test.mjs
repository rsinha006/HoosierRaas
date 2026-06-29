import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260712000000_finance_team_manager_readonly.sql",
    import.meta.url,
  ),
  "utf8",
);

const rbac = readFileSync(new URL("../lib/rbac.ts", import.meta.url), "utf8");

test("deadlines and fees writes are limited to captain and team manager", () => {
  assert.match(
    migration,
    /create policy "Captain and TM can insert deadlines"[\s\S]*?public\.get_my_exec_title\(\) in \('captain', 'team_manager'\)/,
  );
  assert.match(
    migration,
    /create policy "Captain and TM can update fees"[\s\S]*?public\.get_my_exec_title\(\) in \('captain', 'team_manager'\)/,
  );
  assert.doesNotMatch(
    migration,
    /create policy "Exec users can insert deadlines"/,
  );
  assert.doesNotMatch(migration, /create policy "Exec users can update fees"/);
});

test("packet save RPC rejects non team manager writers", () => {
  assert.match(
    migration,
    /if public\.get_my_exec_title\(\) not in \('captain', 'team_manager'\) then[\s\S]*?raise exception 'not_authorized'/,
  );
});

test("finance cannot write to team manager in app rbac", () => {
  assert.match(rbac, /module === "team-manager"/);
  assert.match(rbac, /TEAM_MANAGER_WRITE_TITLES/);
  assert.match(
    rbac,
    /if \(execTitle === "finance"\) \{[\s\S]*?return module === "finance"/,
  );
});
