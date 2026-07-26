import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTENDANCE_PAGE_SIZE,
  dedupeById,
  escapeLikePattern,
  fetchAllPages,
} from "../lib/attendance-records.ts";

/**
 * Builds a fake paged endpoint over a fixed row list, mimicking PostgREST:
 * an inclusive range, and never more than pageSize rows in one response.
 */
function pagedSource(rows, pageSize = ATTENDANCE_PAGE_SIZE) {
  const calls = [];

  const fetchPage = async (from, to) => {
    calls.push([from, to]);
    const capped = Math.min(to, from + pageSize - 1);
    return { data: rows.slice(from, capped + 1), error: null };
  };

  return { fetchPage, calls };
}

function rowsOf(count, prefix = "r") {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }));
}

test("a result set inside one page takes a single request", async () => {
  const { fetchPage, calls } = pagedSource(rowsOf(12), 10);
  const { data, error } = await fetchAllPages(fetchPage, 10);

  assert.equal(error, null);
  // 12 rows at 10/page: the first page is full, so it has to look further.
  assert.equal(data.length, 12);
  assert.ok(calls.length > 1, "a full first page must trigger another read");
});

test("a short first page stops immediately", async () => {
  const { fetchPage, calls } = pagedSource(rowsOf(4), 10);
  const { data } = await fetchAllPages(fetchPage, 10);

  assert.equal(data.length, 4);
  assert.deepEqual(calls, [[0, 9]]);
});

/**
 * The bug this guards: the per-member history page read the season unpaged,
 * PostgREST silently returned the first 1000 rows, and the page reported a
 * fraction of the member's real absences. Anything over one page has to come
 * back whole.
 */
test("a result set spanning many pages comes back complete and in order", async () => {
  const rows = rowsOf(2_500);
  const { fetchPage } = pagedSource(rows, 1_000);
  const { data, error } = await fetchAllPages(fetchPage, 1_000);

  assert.equal(error, null);
  assert.equal(data.length, 2_500);
  assert.deepEqual(
    data.map((row) => row.id),
    rows.map((row) => row.id),
  );
});

test("a result set that is an exact multiple of the page size is not truncated", async () => {
  const { fetchPage } = pagedSource(rowsOf(2_000), 1_000);
  const { data } = await fetchAllPages(fetchPage, 1_000);

  assert.equal(data.length, 2_000);
});

test("an error on a later page surfaces instead of returning a partial set", async () => {
  const fetchPage = async (from) => {
    if (from === 0) {
      return { data: rowsOf(10), error: null };
    }
    return { data: null, error: { message: "connection reset" } };
  };

  const { data, error } = await fetchAllPages(fetchPage, 10);

  assert.equal(error?.message, "connection reset");
  // The caller gets the error, so a short list can never be read as "no records".
  assert.equal(data.length, 10);
});

test("an error on the first page surfaces", async () => {
  const fetchPage = async () => ({ data: null, error: { message: "denied" } });
  const { data, error } = await fetchAllPages(fetchPage, 10);

  assert.equal(error?.message, "denied");
  assert.deepEqual(data, []);
});

test("like wildcards inside an email are escaped so they match literally", () => {
  assert.equal(escapeLikePattern("a_b@iu.edu"), "a\\_b@iu.edu");
  assert.equal(escapeLikePattern("100%@iu.edu"), "100\\%@iu.edu");
  assert.equal(escapeLikePattern("normal@iu.edu"), "normal@iu.edu");
});

test("records matched by both member id and email are counted once", () => {
  const shared = { id: "x" };
  const merged = dedupeById([shared, { id: "y" }], [shared, { id: "z" }]);

  assert.equal(merged.length, 3);
  assert.deepEqual(merged.map((row) => row.id).sort(), ["x", "y", "z"]);
});
