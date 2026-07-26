import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { exceedsAvailable } from "../lib/finance.ts";

const form = readFileSync(
  new URL("../components/budget-setup-form.tsx", import.meta.url),
  "utf8",
);

test("allocating more than the income recorded is an over-allocation", () => {
  // The reported state: $959.98 allocated against $0.00 of general pool income.
  assert.equal(exceedsAvailable(959.98, 0), true);
  assert.equal(exceedsAvailable(1000, 999.99), true);
});

test("allocating everything, or less, is not", () => {
  assert.equal(exceedsAvailable(0, 0), false);
  assert.equal(exceedsAvailable(500, 1000), false);
  assert.equal(exceedsAvailable(1000, 1000), false);
});

/** Twelve categories summed as floats can land a fraction of a cent over the money
 *  they are measured against. Refusing to save a budget that allocates exactly what
 *  the team has would be wrong. */
test("a rounding tail of less than a cent is not an over-allocation", () => {
  const allocated = [0.1, 0.2].reduce((sum, n) => sum + n, 0);
  assert.ok(allocated > 0.3, "this sum is expected to drift high");
  assert.equal(exceedsAvailable(allocated, 0.3), false);
});

// ---------------------------------------------------------------------------
// What the page does with it
// ---------------------------------------------------------------------------

/**
 * The reported flaw: "General pool available $0.00" and "Total allocated $959.98"
 * sat side by side in the same plain grey box - no warning colour, no message, and
 * nothing gating Save - while the IUFB section right below did guard this.
 */
test("an over-allocated general pool is coloured and spelled out", () => {
  assert.match(
    form,
    /generalPoolOverAllocated \? "text-red-600" : "text-zinc-900"/,
  );
  assert.match(
    form,
    /This budget allocates \{formatCurrency\(-generalPoolRemaining\)\} more than/,
  );
});

test("saving an over-allocated budget takes an explicit confirmation", () => {
  assert.match(
    form,
    /if \(generalPoolOverAllocated && !acknowledgedOverAllocation\) \{\s+setSaveError\(/,
  );
  assert.match(form, /checked=\{acknowledgedOverAllocation\}/);
});

/** General pool income arrives across the season as dues come in, so this stays a
 *  confirmation. The IUFB envelope is a fixed grant, so that one stays a hard stop. */
test("the IUFB envelope is still refused outright", () => {
  assert.match(
    form,
    /if \(iufbOverAllocated\) \{\s+setSaveError\(\s+"Total IUFB approved exceeds available IUFB income/,
  );
});

/** #990000 is the brand crimson. $980 of $1,000 remaining is a healthy state, but
 *  rendered in crimson beside a genuine red error it read as an alarm. */
test("a healthy remaining envelope is not painted like an error", () => {
  assert.match(
    form,
    /iufbRemaining < 0 \? "text-red-600" : "text-zinc-900"/,
  );
  assert.doesNotMatch(form, /iufbRemaining < 0 \? "text-red-600" : "text-\[#990000\]"/);
});
