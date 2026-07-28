import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_EXPENSE_REQUEST_AMOUNT } from "../lib/finance.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260730000000_expense_request_amount_sanity_cap.sql",
    import.meta.url,
  ),
  "utf8",
);

const publicForm = readFileSync(
  new URL("../components/expense-request-form.tsx", import.meta.url),
  "utf8",
);

const internalForm = readFileSync(
  new URL("../components/add-expense-form.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw (M9): $999,999 passed every check on the public expense
 * request form - the roster email check was the only thing that stopped it.
 * Reimbursements already have a database-level sanity cap for the same
 * reason a form field alone can't be trusted; expense requests had none.
 */

test("the constant matches a real dollar ceiling, not a placeholder", () => {
  assert.equal(MAX_EXPENSE_REQUEST_AMOUNT, 10000);
});

test("the database refuses an expense request over the cap, for any insert path", () => {
  assert.match(
    migration,
    /add constraint expense_request_amount_sane\s+check \(amount <= 10000\)\s+not valid;/,
  );
});

test("existing out-of-range requests are left alone, not silently rewritten", () => {
  assert.match(migration, /not valid;/);
});

for (const [name, form] of [
  ["the public expense request form", publicForm],
  ["the internal Add Expense form", internalForm],
]) {
  test(`${name} rejects an amount over the cap before it reaches the database`, () => {
    assert.match(
      form,
      /Number\(amount\) > MAX_EXPENSE_REQUEST_AMOUNT/,
    );
    assert.match(form, /MAX_EXPENSE_REQUEST_AMOUNT/);
  });
}

test("$999,999 - the amount the audit actually entered - is now rejected client-side", () => {
  assert.ok(999_999 > MAX_EXPENSE_REQUEST_AMOUNT);
});
