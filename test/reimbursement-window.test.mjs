import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getZonedMidnightMs,
  isOutsideSubmissionWindow,
  TEAM_TIME_ZONE,
} from "../lib/reimbursements.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260728000000_reimbursement_window_timezone.sql",
    import.meta.url,
  ),
  "utf8",
);

const form = readFileSync(
  new URL("../components/reimbursement-form.tsx", import.meta.url),
  "utf8",
);

/** Every submission time below is an absolute instant, not a wall clock, so these
 *  assertions hold whatever time zone the machine running them is set to. That is the
 *  whole point: the window used to move with the clock the check ran on. */
const at = (iso) => new Date(iso);

// ---------------------------------------------------------------------------
// The window itself
// ---------------------------------------------------------------------------

test("midnight is read in the team's time zone, not the machine's", () => {
  // 2026-07-26 in Indiana (EDT, UTC-4) begins at 04:00 UTC.
  assert.equal(
    getZonedMidnightMs("2026-07-26", TEAM_TIME_ZONE),
    Date.UTC(2026, 6, 26, 4),
  );
  // 2026-01-15 is EST, an hour further back.
  assert.equal(
    getZonedMidnightMs("2026-01-15", TEAM_TIME_ZONE),
    Date.UTC(2026, 0, 15, 5),
  );
});

/**
 * The reported failure: a purchase made today and submitted after roughly 8 PM
 * Indiana time passed the form's check and was then rejected by the database, which
 * was measuring from UTC midnight - 4 hours earlier than the form was.
 */
test("an evening submission on the day of purchase is inside the window", () => {
  assert.equal(
    isOutsideSubmissionWindow("2026-07-26", at("2026-07-27T00:59:00Z")),
    false,
  );
  assert.equal(
    isOutsideSubmissionWindow("2026-07-26", at("2026-07-27T03:59:00Z")),
    false,
  );
});

test("the window closes 24 hours after midnight in Indiana", () => {
  assert.equal(
    isOutsideSubmissionWindow("2026-07-26", at("2026-07-27T04:00:00Z")),
    false,
  );
  assert.equal(
    isOutsideSubmissionWindow("2026-07-26", at("2026-07-27T04:00:01Z")),
    true,
  );
});

test("a purchase from two days ago is still outside the window", () => {
  assert.equal(
    isOutsideSubmissionWindow("2026-07-24", at("2026-07-26T18:00:00Z")),
    true,
  );
});

/** 8 March 2026 is a 23-hour day in Indiana. Taking the UTC offset at the wrong
 *  instant would put its midnight an hour out and shift the whole window. */
test("the spring-forward day still measures from its own midnight", () => {
  assert.equal(
    getZonedMidnightMs("2026-03-08", TEAM_TIME_ZONE),
    Date.UTC(2026, 2, 8, 5),
  );
  assert.equal(
    isOutsideSubmissionWindow("2026-03-08", at("2026-03-09T03:59:00Z")),
    false,
  );
  assert.equal(
    isOutsideSubmissionWindow("2026-03-08", at("2026-03-09T05:30:00Z")),
    true,
  );
});

test("an unparseable date is left for the database to reject", () => {
  assert.equal(isOutsideSubmissionWindow("", at("2026-07-26T18:00:00Z")), false);
});

// ---------------------------------------------------------------------------
// The database has to agree with the form
// ---------------------------------------------------------------------------

test("the constraint measures from the same midnight the form does", () => {
  assert.match(
    migration,
    /submission_timestamp\s+- \(date_of_purchase::timestamp at time zone 'America\/Indiana\/Indianapolis'\)\s+<= interval '24 hours'/,
  );
  // The old anchor resolved against the database session's TimeZone, which is UTC.
  assert.doesNotMatch(migration, /date_of_purchase::timestamptz/);
});

test("the function reports the window in a sentence, not as a constraint error", () => {
  assert.match(
    migration,
    /if now\(\) - v_purchase_midnight > interval '24 hours' then\s+raise exception 'Reimbursements must be submitted within 24 hours/,
  );
});

test("the old signature is dropped so the new default cannot be ambiguous", () => {
  assert.match(
    migration,
    /drop function if exists public\.submit_public_reimbursement\(\s*uuid, text, numeric, text, uuid, text, text, date, text, text\s*\)/,
  );
  assert.match(
    migration,
    /p_validate_only boolean default false/,
  );
});

// ---------------------------------------------------------------------------
// Nothing reaches storage until the submission is known to be good
// ---------------------------------------------------------------------------

test("the form validates before it uploads the receipt", () => {
  const validatedAt = form.indexOf("p_validate_only: true");
  const uploadedAt = form.indexOf("await uploadReceipt(");

  assert.ok(validatedAt > -1, "the form should run a validate-only pass");
  assert.ok(uploadedAt > -1, "the form should still upload the receipt");
  assert.ok(
    validatedAt < uploadedAt,
    "a rejected submission must not leave a receipt in storage",
  );
});

test("validate-only does not check for a receipt that has not been uploaded yet", () => {
  assert.match(
    migration,
    /if not p_validate_only and \(p_receipt_url is null or trim\(p_receipt_url\) = ''\) then/,
  );
});
