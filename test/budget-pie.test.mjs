import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBudgetPieSpec,
  BUDGET_PIE_COLORS,
  OTHER_SLICE_COLOR,
  OTHER_SLICE_LABEL,
} from "../lib/budget-pie.ts";

function makeSegments(count, { allocated = (i) => 100 - i, spent = () => 0 } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    label: `Category ${String.fromCharCode(65 + index)}`,
    allocated: allocated(index),
    spent: spent(index),
  }));
}

test("returns an empty spec when nothing is allocated", () => {
  assert.deepEqual(buildBudgetPieSpec([]), {
    total: 0,
    totalSpent: 0,
    slices: [],
    isFullCircle: false,
  });

  const unfunded = buildBudgetPieSpec([
    { label: "Costumes", allocated: 0, spent: 0 },
  ]);
  assert.equal(unfunded.total, 0);
  assert.deepEqual(unfunded.slices, []);
});

test("drops segments with no allocation but keeps the funded ones", () => {
  const spec = buildBudgetPieSpec([
    { label: "Hotels", allocated: 600, spent: 100 },
    { label: "Merch", allocated: 0, spent: 0 },
    { label: "DJ", allocated: 400, spent: 50 },
  ]);

  assert.equal(spec.total, 1000);
  assert.equal(spec.totalSpent, 150);
  assert.deepEqual(
    spec.slices.map((slice) => slice.label),
    ["Hotels", "DJ"],
  );
});

test("orders slices by allocation descending, tie-broken by label", () => {
  const spec = buildBudgetPieSpec([
    { label: "Zebra", allocated: 100, spent: 0 },
    { label: "Alpha", allocated: 100, spent: 0 },
    { label: "Middle", allocated: 500, spent: 0 },
  ]);

  assert.deepEqual(
    spec.slices.map((slice) => slice.label),
    ["Middle", "Alpha", "Zebra"],
  );
});

test("assigns palette colours by display rank without cycling", () => {
  const spec = buildBudgetPieSpec(makeSegments(8));

  assert.equal(spec.slices.length, 8);
  assert.deepEqual(
    spec.slices.map((slice) => slice.color),
    [...BUDGET_PIE_COLORS],
  );
  assert.equal(new Set(spec.slices.map((slice) => slice.color)).size, 8);
  assert.ok(spec.slices.every((slice) => !slice.isOther));
});

test("collapses the tail into Other once there are more segments than slots", () => {
  const spec = buildBudgetPieSpec(makeSegments(12));

  assert.equal(spec.slices.length, 8);

  const other = spec.slices[spec.slices.length - 1];
  assert.equal(other.isOther, true);
  assert.equal(other.label, OTHER_SLICE_LABEL);
  assert.equal(other.color, OTHER_SLICE_COLOR);
  // 12 segments, 7 named, so 5 fold into Other.
  assert.equal(other.members.length, 5);
  assert.deepEqual(other.members, [
    "Category H",
    "Category I",
    "Category J",
    "Category K",
    "Category L",
  ]);
  assert.ok(spec.slices.slice(0, 7).every((slice) => !slice.isOther));
});

test("Other sums the allocation and spend of everything it absorbs", () => {
  const spec = buildBudgetPieSpec(
    makeSegments(10, { allocated: () => 100, spent: () => 25 }),
  );

  const other = spec.slices[spec.slices.length - 1];
  // 10 identical segments, 7 named, 3 folded.
  assert.equal(other.allocated, 300);
  assert.equal(other.spent, 75);
  assert.equal(spec.total, 1000);
  assert.equal(spec.totalSpent, 250);
});

test("Other reports over budget when any absorbed member is over", () => {
  const withinBudget = buildBudgetPieSpec(
    makeSegments(10, { allocated: () => 100, spent: () => 25 }),
  );
  assert.equal(withinBudget.slices.at(-1).overBudget, false);

  const overspent = buildBudgetPieSpec(
    makeSegments(10, {
      allocated: () => 100,
      spent: (index) => (index === 9 ? 400 : 25),
    }),
  );
  assert.equal(overspent.slices.at(-1).overBudget, true);
});

test("flags an over-budget named slice", () => {
  const spec = buildBudgetPieSpec([
    { label: "Hotels", allocated: 600, spent: 900 },
    { label: "DJ", allocated: 400, spent: 100 },
  ]);

  assert.deepEqual(
    spec.slices.map((slice) => [slice.label, slice.overBudget]),
    [
      ["Hotels", true],
      ["DJ", false],
    ],
  );
});

test("whole-number percentages add up to exactly 100", () => {
  // Thirds round to 33 each and would otherwise leave the legend reading 99%.
  const thirds = buildBudgetPieSpec(
    makeSegments(3, { allocated: () => 100 }),
  );
  assert.equal(
    thirds.slices.reduce((sum, slice) => sum + slice.percentLabel, 0),
    100,
  );

  const awkward = buildBudgetPieSpec([
    { label: "A", allocated: 1234.56, spent: 0 },
    { label: "B", allocated: 987.65, spent: 0 },
    { label: "C", allocated: 456.78, spent: 0 },
    { label: "D", allocated: 321.09, spent: 0 },
    { label: "E", allocated: 111.11, spent: 0 },
    { label: "F", allocated: 77.77, spent: 0 },
    { label: "G", allocated: 33.33, spent: 0 },
    { label: "H", allocated: 22.22, spent: 0 },
    { label: "I", allocated: 11.11, spent: 0 },
  ]);
  assert.equal(awkward.slices.length, 8);
  assert.equal(
    awkward.slices.reduce((sum, slice) => sum + slice.percentLabel, 0),
    100,
  );
});

test("exact percentages track the underlying allocation", () => {
  const spec = buildBudgetPieSpec([
    { label: "Big", allocated: 750, spent: 0 },
    { label: "Small", allocated: 250, spent: 0 },
  ]);

  assert.equal(spec.slices[0].percent, 75);
  assert.equal(spec.slices[1].percent, 25);
  assert.equal(spec.slices[0].percentLabel, 75);
  assert.equal(spec.slices[1].percentLabel, 25);
});

test("a lone slice becomes a full circle instead of a degenerate arc", () => {
  const spec = buildBudgetPieSpec([
    { label: "Costumes", allocated: 900, spent: 100 },
  ]);

  assert.equal(spec.isFullCircle, true);
  assert.equal(spec.slices.length, 1);
  assert.equal(spec.slices[0].percentLabel, 100);
  // An arc whose endpoints coincide draws nothing, so no path is emitted.
  assert.equal(spec.slices[0].path, "");
});

test("multi-slice specs emit real ring paths and are not full circles", () => {
  const spec = buildBudgetPieSpec(makeSegments(4));

  assert.equal(spec.isFullCircle, false);
  assert.ok(
    spec.slices.every((slice) => slice.path.startsWith("M") && slice.path.endsWith("Z")),
  );
});

test("uses the large-arc flag once a slice passes a half turn", () => {
  const spec = buildBudgetPieSpec([
    { label: "Dominant", allocated: 900, spent: 0 },
    { label: "Sliver", allocated: 100, spent: 0 },
  ]);

  const [dominant, sliver] = spec.slices;
  // "A rx ry rotation largeArc sweep x,y" — the fourth number is the flag.
  assert.match(dominant.path, /A 88 88 0 1 1 /);
  assert.match(sliver.path, /A 88 88 0 0 1 /);
});

test("slices close the full turn without leaving a gap", () => {
  const spec = buildBudgetPieSpec(makeSegments(5, { allocated: () => 33 }));
  const last = spec.slices[spec.slices.length - 1];

  // 360° lands back at twelve o'clock: x at centre, y at the top of the ring.
  assert.match(last.path, /100\.00,12\.00/);
});

test("slice sweeps stay proportional to their allocation", () => {
  const spec = buildBudgetPieSpec(makeSegments(8, { allocated: () => 12.5 }));

  // Eight equal slices each sweep 45°, so consecutive outer-arc start points
  // walk the ring evenly rather than bunching up.
  assert.equal(spec.slices.length, 8);
  assert.ok(spec.slices.every((slice) => slice.percentLabel === 13 || slice.percentLabel === 12));
  assert.equal(
    spec.slices.reduce((sum, slice) => sum + slice.percentLabel, 0),
    100,
  );
});
