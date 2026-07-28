import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toUserFacingAttendanceResponseError,
  toUserFacingExpenseRequestError,
  toUserFacingReimbursementError,
} from "../lib/user-facing-errors.ts";

const expenseForm = readFileSync(
  new URL("../components/expense-request-form.tsx", import.meta.url),
  "utf8",
);
const reimbursementForm = readFileSync(
  new URL("../components/reimbursement-form.tsx", import.meta.url),
  "utf8",
);
const attendanceForm = readFileSync(
  new URL("../components/attendance-response-form.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw (M11): when something failed on the public expense,
 * reimbursement, or attendance forms, the raw database error text was shown
 * to the dancer verbatim - "new row for relation ... violates check
 * constraint ..." rather than something a dancer could act on. The roster
 * check already read nicely because it's a hand-written `raise exception`;
 * every other failure fell through raw.
 *
 * A bare `raise exception 'text'` in plpgsql always surfaces as SQLSTATE
 * P0001 - that's the signal used to tell a hand-written message from raw
 * constraint text, rather than trying to enumerate every constraint name
 * (there are 15+ across these three tables, and they change).
 */

const handWrittenRosterMessage =
  "This email is not on the active roster. Use the email you are on the team roster with, or contact your finance chair.";

/** Supabase's PostgrestError extends Error and carries `code` alongside
 *  `message` - a plain object literal wouldn't be `instanceof Error` and
 *  would silently take a different branch than production traffic does. */
function postgrestError(code, message) {
  return Object.assign(new Error(message), { code });
}

for (const [name, mapper] of [
  ["expense request", toUserFacingExpenseRequestError],
  ["reimbursement", toUserFacingReimbursementError],
  ["attendance response", toUserFacingAttendanceResponseError],
]) {
  test(`${name}: a hand-written raise exception (P0001) is shown verbatim`, () => {
    const error = postgrestError("P0001", handWrittenRosterMessage);
    assert.equal(mapper(error), handWrittenRosterMessage);
  });

  test(`${name}: a raw check-constraint violation is replaced, not shown`, () => {
    const error = postgrestError(
      "23514",
      'new row for relation "expense_requests" violates check constraint "expense_requests_amount_check"',
    );
    const result = mapper(error);
    assert.doesNotMatch(result, /relation|constraint|violates/);
    assert.ok(result.length > 0);
  });

  test(`${name}: a raw not-null or foreign-key violation is also replaced`, () => {
    for (const code of ["23502", "23503", "42501"]) {
      const error = postgrestError(code, "null value in column violates not-null constraint");
      const result = mapper(error);
      assert.doesNotMatch(result, /column|constraint/);
    }
  });

  test(`${name}: an error with no code at all falls back to the generic message`, () => {
    const result = mapper(new Error("ECONNRESET"));
    assert.notEqual(result, "ECONNRESET");
  });
}

// ---------------------------------------------------------------------------
// The forms have to preserve the original error (with its .code) to reach the
// mapper - throwing `new Error(error.message)` strips .code and breaks this.
// ---------------------------------------------------------------------------

test("the expense request form re-throws the original error, not just its message", () => {
  assert.doesNotMatch(expenseForm, /throw new Error\(error\.message\)/);
  assert.match(expenseForm, /if \(error\) \{\s*throw error;/);
  assert.match(expenseForm, /setSaveError\(toUserFacingExpenseRequestError\(error\)\)/);
});

test("the reimbursement form re-throws both RPC errors intact", () => {
  assert.doesNotMatch(reimbursementForm, /throw new Error\(validationError\.message\)/);
  assert.doesNotMatch(reimbursementForm, /throw new Error\(error\.message\)/);
  assert.match(reimbursementForm, /if \(validationError\) \{\s*throw validationError;/);
  assert.match(reimbursementForm, /if \(error\) \{\s*throw error;/);
  assert.match(reimbursementForm, /setSaveError\(toUserFacingReimbursementError\(error\)\)/);
});

test("the attendance response form maps both RPC error paths, including the duplicate-check RPC", () => {
  assert.match(
    attendanceForm,
    /setSaveError\(toUserFacingAttendanceResponseError\(duplicateError\)\)/,
  );
  assert.match(attendanceForm, /setSaveError\(toUserFacingAttendanceResponseError\(error\)\)/);
  // The 23505 duplicate-submission branch is unrelated to this fix - it already
  // routes to a dedicated view instead of showing any message text.
  assert.match(attendanceForm, /if \(error\.code === "23505"\) \{\s*setView\("duplicate"\);/);
});
