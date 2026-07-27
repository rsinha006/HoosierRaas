import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PAID_COUNT,
  PAID_PAGE_SIZE,
  parsePaidCount,
} from "../lib/reimbursements.ts";

const page = readFileSync(
  new URL("../app/(hros)/finance/reimbursements/page.tsx", import.meta.url),
  "utf8",
);

const queue = readFileSync(
  new URL("../components/reimbursement-queue.tsx", import.meta.url),
  "utf8",
);

/**
 * The reported flaw: alone among the Finance pages, Reimbursements had no season
 * filter. It read the whole table, so an archived season's requests stayed in the
 * live payment queue.
 */
test("every reimbursement list is filtered to the season being viewed", () => {
  assert.match(page, /const viewingSeason = await getViewingSeason\(params\.season\)/);
  // Every list is built by the one helper, and the helper is scoped. There is no
  // second way to read the table, so no list can quietly go season-wide again.
  assert.equal(page.match(/from\("reimbursements"\)/g)?.length, 1);
  assert.match(page, /\.eq\("season", season\)\s+\.eq\("status", status\)/);
  for (const status of ["pending", "paid", "denied"]) {
    assert.match(page, new RegExp(`seasonReimbursements\\("${status}"\\)`));
  }
});

test("status is filtered in the query, not after the rows come back", () => {
  assert.doesNotMatch(page, /filter\(\(item\) => item\.status/);
});

/** Reviewing a season you are only viewing would be refused by the archived-season
 *  policies anyway; the Expenses queue already gates on this. */
test("a season that is not the active one is read-only", () => {
  assert.match(
    page,
    /hasWriteAccess\(userMember\?\.exec_title \?\? null, "finance"\) && viewingSeason\.is_active/,
  );
});

// ---------------------------------------------------------------------------
// The paid-history page size
// ---------------------------------------------------------------------------

test("a paid count from the address bar cannot ask for the whole history", () => {
  // ?paidCount=100000 would have signed a receipt URL for every row it returned.
  assert.equal(parsePaidCount("100000"), MAX_PAID_COUNT);
  assert.equal(parsePaidCount(String(MAX_PAID_COUNT + 1)), MAX_PAID_COUNT);
  assert.equal(parsePaidCount("50"), 50);
});

test("a missing or nonsense paid count falls back to one page", () => {
  assert.equal(parsePaidCount(undefined), PAID_PAGE_SIZE);
  assert.equal(parsePaidCount(""), PAID_PAGE_SIZE);
  assert.equal(parsePaidCount("nonsense"), PAID_PAGE_SIZE);
  assert.equal(parsePaidCount("-1"), PAID_PAGE_SIZE);
  assert.equal(parsePaidCount("Infinity"), PAID_PAGE_SIZE);
  assert.equal(parsePaidCount("1"), PAID_PAGE_SIZE);
});

test("a fractional count cannot become a fractional row limit", () => {
  assert.equal(parsePaidCount("25.7"), 25);
});

test("the page asks the database for a page of rows, not for all of them", () => {
  assert.match(page, /seasonReimbursements\("paid"\)\.limit\(paidCount \+ 1\)/);
  assert.match(page, /seasonReimbursements\("denied"\)\.limit\(DENIED_PAGE_SIZE\)/);
});

/** At the cap there is no next page, so linking to one would return the same rows. */
test("the load-more link disappears once the cap is reached", () => {
  assert.match(page, /paidCount \+ PAID_PAGE_SIZE <= MAX_PAID_COUNT/);
  assert.match(queue, /loadMorePaidHref \? \(/);
  assert.match(queue, /Showing the \{paidReimbursements\.length\} most recent paid/);
});

/** Switching season by query string has to survive paging, or "Load more" would
 *  silently drop you back into the season the cookie remembers. */
test("load more keeps the season being viewed", () => {
  assert.match(page, /\.\.\.\(params\.season \? \{ season: params\.season \} : \{\}\)/);
});

// ---------------------------------------------------------------------------
// Receipt links
// ---------------------------------------------------------------------------

/** One signed URL per receipt meant one network call per row on every page load. */
test("receipts are signed in one call per list, not one per row", () => {
  assert.match(page, /\.createSignedUrls\(/);
  assert.doesNotMatch(page, /\.createSignedUrl\(/);
  assert.match(page, /reimbursements\.map\(\(reimbursement\) => reimbursement\.receipt_url\)/);
});

/** The batch call reports a per-path error, so results are matched by path rather
 *  than trusted to come back in the order they were asked for. */
test("a receipt storage cannot sign still renders", () => {
  assert.match(page, /signedUrlByPath\.get\(reimbursement\.receipt_url\) \?\? null/);
  assert.match(queue, /Receipt preview unavailable\./);
});
