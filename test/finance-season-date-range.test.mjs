import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getSeasonDateRange,
  getSeasonTimestampBounds,
  isDateInSeason,
} from "../lib/finance.ts";

/**
 * The reported flaw (M2, part two): the Aug 1 - Jul 31 window was derived from
 * the season *label* string, ignoring the real starts_on/ends_on dates the
 * seasons table actually stores. Changing a season's dates would silently
 * produce wrong Finance totals. A season whose real dates diverge from the
 * calendar-year guess is the case that would have gone unnoticed.
 */
const oddSeason = {
  label: "2025-2026",
  starts_on: "2025-09-15",
  ends_on: "2026-06-20",
};

test("the date range comes from the season's real dates, not a guess from the label", () => {
  assert.deepEqual(getSeasonDateRange(oddSeason), {
    start: "2025-09-15",
    end: "2026-06-20",
  });
});

test("timestamp bounds wrap the same real dates", () => {
  assert.deepEqual(getSeasonTimestampBounds(oddSeason), {
    start: "2025-09-15T00:00:00.000Z",
    end: "2026-06-20T23:59:59.999Z",
  });
});

test("a date the old Aug 1 - Jul 31 guess would have accepted is correctly out of season", () => {
  // August 20 falls inside the hardcoded guess but before this season's real start.
  assert.equal(isDateInSeason("2025-08-20", oddSeason), false);
  assert.equal(isDateInSeason("2025-09-15", oddSeason), true);
  assert.equal(isDateInSeason("2026-06-20", oddSeason), true);
  assert.equal(isDateInSeason("2026-07-01", oddSeason), false);
});
