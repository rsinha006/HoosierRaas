import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getTeamToday,
  isFuturePurchaseDate,
  isOutsideSubmissionWindow,
} from "../lib/reimbursements.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260728100000_reimbursement_purchase_not_future.sql",
    import.meta.url,
  ),
  "utf8",
);

const form = readFileSync(
  new URL("../components/reimbursement-form.tsx", import.meta.url),
  "utf8",
);

/** Absolute instants, so these hold whatever time zone the machine is set to. */
const at = (iso) => new Date(iso);

/**
 * The reported flaw: a purchase date of 2030-01-01 was accepted with no warning,
 * while a date two days old was correctly refused.
 */
test("a purchase date years ahead is rejected", () => {
  assert.equal(isFuturePurchaseDate("2030-01-01", at("2026-07-26T18:00:00Z")), true);
  // ...and the window check is why nothing caught it: no time has elapsed yet.
  assert.equal(
    isOutsideSubmissionWindow("2030-01-01", at("2026-07-26T18:00:00Z")),
    false,
  );
});

test("today and yesterday are not in the future", () => {
  assert.equal(isFuturePurchaseDate("2026-07-26", at("2026-07-26T18:00:00Z")), false);
  assert.equal(isFuturePurchaseDate("2026-07-25", at("2026-07-26T18:00:00Z")), false);
});

/** 9 PM in Indiana is already tomorrow in UTC. Reading "today" off the wrong clock
 *  would wave tomorrow's date through for the last four hours of every day - which is
 *  when students submit. */
test("today is read where the team is, not in UTC", () => {
  assert.equal(getTeamToday(at("2026-07-27T01:00:00Z")), "2026-07-26");
  assert.equal(isFuturePurchaseDate("2026-07-27", at("2026-07-27T01:00:00Z")), true);
  assert.equal(isFuturePurchaseDate("2026-07-26", at("2026-07-27T01:00:00Z")), false);
});

test("an empty date is left to the required-field check", () => {
  assert.equal(isFuturePurchaseDate("", at("2026-07-26T18:00:00Z")), false);
});

test("the form checks the future date before it checks the window", () => {
  assert.match(
    form,
    /isFuturePurchaseDate\(dateOfPurchase\)\) \{\s+errors\.dateOfPurchase =\s+"Date of purchase can't be in the future\./,
  );
  assert.ok(
    form.indexOf("isFuturePurchaseDate(dateOfPurchase)") <
      form.indexOf("isOutsideSubmissionWindow(dateOfPurchase)) {"),
    "the window message would be wrong for a date that has not happened yet",
  );
});

test("the database refuses a future purchase date too", () => {
  assert.match(
    migration,
    /add constraint reimbursement_purchase_not_future\s+check \(\s+date_of_purchase\s+<= \(submission_timestamp at time zone 'America\/Indiana\/Indianapolis'\)::date\s+\)/,
  );
  // The rows already dated in the future stay put - removing them is the board's call.
  assert.match(migration, /not valid;/);
});
