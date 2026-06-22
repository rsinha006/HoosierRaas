import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260708000000_harden_archive_access_rls.sql", import.meta.url),
  "utf8",
);

test("exec RLS helper is scoped to active season memberships", () => {
  assert.match(migration, /create or replace function public\.is_exec_user\(\)/);
  assert.match(migration, /join public\.season_memberships sm on sm\.member_id = m\.id/);
  assert.match(migration, /join public\.seasons s on s\.label = sm\.season and s\.is_active = true/);
  assert.match(migration, /sm\.exec_title in \('captain', 'team_manager', 'finance'\)/);
});

test("archive cannot leave the next season without a captain or team manager", () => {
  assert.match(
    migration,
    /elem->>'next_exec_title' in \('captain', 'team_manager'\)/,
  );
  assert.match(
    migration,
    /At least one Captain or Team Manager is required for the next season/,
  );
});

test("archived season registry rows cannot be mutated through RLS", () => {
  assert.match(migration, /create policy "Reject archived season updates"/);
  assert.match(migration, /using \(not is_archived\)\s+with check \(not is_archived\)/);
  assert.match(migration, /create policy "Reject season deletes"/);
  assert.match(migration, /for delete\s+to authenticated\s+using \(false\)/);
});

test("competition-linked archive guards cover reimbursements and packet storage", () => {
  assert.match(migration, /create policy "Reject reimbursement inserts for archived competitions"/);
  assert.match(migration, /not public\.is_competition_season_archived\(competition_id\)/);
  assert.match(migration, /create or replace function public\.is_registration_packet_object_archived/);
  assert.match(migration, /create policy "Reject registration packet updates for archived competitions"/);
});

test("alumni archive decisions always attempt login deletion", () => {
  const serverCode = readFileSync(
    new URL("../lib/archive-season-server.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    serverCode,
    /return member\.status === "alumni" \|\| member\.delete_login;/,
  );
  assert.match(serverCode, /\.filter\(shouldDeleteLoginForArchiveDecision\)/);
});
