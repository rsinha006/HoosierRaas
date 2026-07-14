import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260718100001_validate_public_finance_submitter_roster.sql",
    import.meta.url,
  ),
  "utf8",
);

function functionBody(name) {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1, `missing ${name} function`);

  const nextGrant = migration.indexOf("\ngrant execute on function", start);
  assert.notEqual(nextGrant, -1, `missing grant after ${name} function`);

  return migration.slice(start, nextGrant);
}

test("public finance roster helper uses active season_memberships", () => {
  assert.match(
    migration,
    /create or replace function public\.is_member_active_in_season\([\s\S]*?security definer/,
  );
  assert.match(
    migration,
    /join public\.season_memberships sm on sm\.member_id = m\.id[\s\S]*?sm\.season = p_season[\s\S]*?sm\.status = 'active'/,
  );
  assert.doesNotMatch(migration, /\bm\.status = 'active'/);
  assert.match(
    migration,
    /revoke all on function public\.is_member_active_in_season\(text, text\) from public, anon, authenticated/,
  );
});

test("public reimbursement submissions require active-season roster membership", () => {
  const reimbursementFunction = functionBody("submit_public_reimbursement");

  assert.match(
    reimbursementFunction,
    /select s\.label into v_season[\s\S]*?where s\.is_active = true[\s\S]*?if v_season is null/,
  );
  assert.match(
    reimbursementFunction,
    /if not public\.is_member_active_in_season\(v_email, v_season\) then[\s\S]*?raise exception 'This email is not on the active roster/,
  );
  assert.doesNotMatch(
    reimbursementFunction,
    /from public\.members[\s\S]*?status = 'active'/,
  );
  assert.match(
    reimbursementFunction,
    /if p_competition_id is not null and not exists \([\s\S]*?from public\.competitions c[\s\S]*?c\.id = p_competition_id[\s\S]*?c\.season = v_season/,
  );
});

test("public expense requests require active-season roster membership", () => {
  const expenseFunction = functionBody("submit_public_expense_request");

  assert.match(
    expenseFunction,
    /select s\.label into v_season[\s\S]*?where s\.is_active = true[\s\S]*?if v_season is null/,
  );
  assert.match(
    expenseFunction,
    /if not public\.is_member_active_in_season\(v_email, v_season\) then[\s\S]*?raise exception 'This email is not on the active roster/,
  );
  assert.doesNotMatch(
    expenseFunction,
    /from public\.members[\s\S]*?status = 'active'/,
  );
  assert.match(
    expenseFunction,
    /insert into public\.expense_requests \([\s\S]*?season,[\s\S]*?submitter_email,[\s\S]*?status[\s\S]*?values \([\s\S]*?v_season,[\s\S]*?v_email,[\s\S]*?'pending'/,
  );
});
