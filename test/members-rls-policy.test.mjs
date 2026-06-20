import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL("../supabase/migrations/20260617000000_pending_review.sql", import.meta.url),
  "utf8",
);

test("captain and team manager can insert reviewed members", () => {
  assert.match(
    migration,
    /create policy "Captain and TM can insert members"[\s\S]*?for insert[\s\S]*?to authenticated[\s\S]*?public\.get_my_exec_title\(\) in \('captain', 'team_manager'\)[\s\S]*?pending_review = false/,
  );
});

test("member write policies enforce exec title and role consistency", () => {
  assert.match(
    migration,
    /create or replace function public\.has_valid_member_role_shape\(member_roles text\[\], member_exec_title text\)/,
  );
  assert.match(
    migration,
    /'exec' = any \(member_roles\)[\s\S]*?member_exec_title in \('captain', 'team_manager', 'finance', 'marketing', 'social'\)/,
  );
  assert.match(
    migration,
    /not \('exec' = any \(member_roles\)\)[\s\S]*?member_exec_title is null/,
  );
  assert.match(
    migration,
    /create policy "Captain and TM can update members"[\s\S]*?public\.has_valid_member_role_shape\(roles, exec_title\)/,
  );
});
