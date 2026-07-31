import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const scopeMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260718100000_validate_expense_request_scope.sql",
    import.meta.url,
  ),
  "utf8",
);

const publicExpenseMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260718000000_public_expense_requests.sql",
    import.meta.url,
  ),
  "utf8",
);

test("expense requests validate funding and competition references against request season", () => {
  assert.match(
    scopeMigration,
    /create or replace function public\.validate_expense_request_scope\(\)[\s\S]*?security definer/,
  );
  assert.match(
    scopeMigration,
    /from public\.budgets b[\s\S]*?b\.season = new\.season[\s\S]*?b\.category = new\.category[\s\S]*?b\.allocated_amount > 0/,
  );
  assert.match(
    scopeMigration,
    /from public\.iufb_line_items li[\s\S]*?li\.id = new\.iufb_line_item_id[\s\S]*?li\.season = new\.season[\s\S]*?li\.approved_amount > 0/,
  );
  assert.match(
    scopeMigration,
    /from public\.competitions c[\s\S]*?c\.id = new\.competition_id[\s\S]*?c\.season = new\.season/,
  );
  assert.match(
    scopeMigration,
    /create trigger validate_expense_request_scope[\s\S]*?before insert or update on public\.expense_requests[\s\S]*?execute function public\.validate_expense_request_scope\(\)/,
  );
});

test("public expense RPC still stamps active season while database trigger validates supplied IDs", () => {
  assert.match(
    publicExpenseMigration,
    /select s\.label into v_season[\s\S]*?where s\.is_active = true/,
  );
  assert.match(
    publicExpenseMigration,
    /insert into public\.expense_requests \([\s\S]*?season,[\s\S]*?category,[\s\S]*?iufb_line_item_id,[\s\S]*?competition_id/,
  );
  assert.match(
    publicExpenseMigration,
    /values \([\s\S]*?v_season,[\s\S]*?p_category,[\s\S]*?p_iufb_line_item_id,[\s\S]*?p_competition_id/,
  );
});
