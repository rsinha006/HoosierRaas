import type { BudgetBarSegment } from "@/lib/budget-bar";

/**
 * Categorical palette for donut slices — the documented 8-slot order from the
 * data-viz reference palette, re-validated against this app's white card
 * surface rather than the reference's off-white one:
 *
 *   node scripts/validate_palette.js "<slots>" --mode light --surface "#ffffff"
 *   → lightness band PASS, chroma floor PASS, adjacent CVD separation PASS
 *     (worst pair ΔE 9.1 protan), normal-vision floor PASS (worst ΔE 19.6),
 *     contrast WARN on aqua/yellow/magenta (below 3:1 on white).
 *
 * That contrast warning obliges a relief channel, which the legend provides:
 * every slice is printed with its label, amount and share, so identity never
 * rests on the fill colour alone.
 *
 * IU crimson is deliberately absent. In bar view crimson already encodes
 * "spent", and reusing it as a category hue would make one colour mean two
 * different things inside the same card.
 */
export const BUDGET_PIE_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const;

/**
 * Fill for the aggregated tail. Sits below the categorical chroma floor on
 * purpose, so "Other" reads as an absence of identity rather than as a ninth
 * category. 4.83:1 on white, comfortably clear of the 3:1 mark floor.
 */
export const OTHER_SLICE_COLOR = "#71717a";

export const OTHER_SLICE_LABEL = "Other";

// Geometry is expressed in viewBox units; the component scales the SVG to fit.
export const PIE_SIZE = 200;
export const PIE_CENTER = PIE_SIZE / 2;
export const PIE_OUTER_RADIUS = 88;
export const PIE_INNER_RADIUS = 54;

export type BudgetPieSlice = {
  label: string;
  allocated: number;
  spent: number;
  /** Exact share of total allocated, 0–100. */
  percent: number;
  /** Whole-number share; these sum to exactly 100 across all slices. */
  percentLabel: number;
  color: string;
  /** Ring-segment path. Empty when the spec is a full circle — see below. */
  path: string;
  isOther: boolean;
  /** Labels folded into "Other"; empty on every named slice. */
  members: string[];
  overBudget: boolean;
};

export type BudgetPieSpec = {
  total: number;
  totalSpent: number;
  slices: BudgetPieSlice[];
  /**
   * A lone slice spans 360°, where an SVG arc's start and end points coincide
   * and the path renders nothing at all. The component draws a stroked circle
   * in that case, so `path` is left empty rather than degenerate.
   */
  isFullCircle: boolean;
};

function polar(radius: number, angle: number) {
  // -90 so 0° sits at twelve o'clock and angles run clockwise.
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: PIE_CENTER + radius * Math.cos(radians),
    y: PIE_CENTER + radius * Math.sin(radians),
  };
}

function round(value: number) {
  return value.toFixed(2);
}

function ringPath(startAngle: number, endAngle: number) {
  // Derived from the swept angle rather than from the endpoint coordinates,
  // which flip unpredictably from float drift either side of a half turn.
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polar(PIE_OUTER_RADIUS, startAngle);
  const outerEnd = polar(PIE_OUTER_RADIUS, endAngle);
  const innerEnd = polar(PIE_INNER_RADIUS, endAngle);
  const innerStart = polar(PIE_INNER_RADIUS, startAngle);

  return [
    `M ${round(outerStart.x)},${round(outerStart.y)}`,
    `A ${PIE_OUTER_RADIUS} ${PIE_OUTER_RADIUS} 0 ${largeArc} 1 ${round(outerEnd.x)},${round(outerEnd.y)}`,
    `L ${round(innerEnd.x)},${round(innerEnd.y)}`,
    `A ${PIE_INNER_RADIUS} ${PIE_INNER_RADIUS} 0 ${largeArc} 0 ${round(innerStart.x)},${round(innerStart.y)}`,
    "Z",
  ].join(" ");
}

/**
 * Whole-number percentages that still add up to 100 — floor everything, then
 * hand the leftover points to the largest fractional remainders. Naive rounding
 * leaves a legend of eight slices reading 99% or 101%.
 */
function largestRemainderPercents(values: number[], total: number): number[] {
  if (total <= 0) {
    return values.map(() => 0);
  }

  const exact = values.map((value) => (value / total) * 100);
  const result = exact.map(Math.floor);
  const leftover = Math.round(100 - result.reduce((sum, value) => sum + value, 0));

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder);

  for (let i = 0; i < leftover && i < byRemainder.length; i += 1) {
    result[byRemainder[i].index] += 1;
  }

  return result;
}

export function buildBudgetPieSpec(segments: BudgetBarSegment[]): BudgetPieSpec {
  const funded = segments.filter((segment) => segment.allocated > 0);
  const total = funded.reduce((sum, segment) => sum + segment.allocated, 0);

  if (funded.length === 0 || total <= 0) {
    return { total: 0, totalSpent: 0, slices: [], isFullCircle: false };
  }

  const ranked = [...funded].sort(
    (left, right) =>
      right.allocated - left.allocated || left.label.localeCompare(right.label),
  );

  // Colours follow display rank, not category identity. The general pool draws
  // from 12 possible categories against 8 palette slots, so a category-stable
  // mapping would have to cycle and could put two identically-coloured slices
  // in the same ring. Distinct-within-one-chart beats stable-across-seasons,
  // since the page only ever renders a single season at a time.
  const named =
    ranked.length <= BUDGET_PIE_COLORS.length
      ? ranked
      : ranked.slice(0, BUDGET_PIE_COLORS.length - 1);
  const tail = ranked.slice(named.length);

  const entries = named.map((segment, index) => ({
    label: segment.label,
    allocated: segment.allocated,
    spent: segment.spent,
    color: BUDGET_PIE_COLORS[index] as string,
    isOther: false,
    members: [] as string[],
    overBudget: segment.spent > segment.allocated,
  }));

  if (tail.length > 0) {
    entries.push({
      label: OTHER_SLICE_LABEL,
      allocated: tail.reduce((sum, segment) => sum + segment.allocated, 0),
      spent: tail.reduce((sum, segment) => sum + segment.spent, 0),
      color: OTHER_SLICE_COLOR,
      isOther: true,
      members: tail.map((segment) => segment.label),
      overBudget: tail.some((segment) => segment.spent > segment.allocated),
    });
  }

  const percentLabels = largestRemainderPercents(
    entries.map((entry) => entry.allocated),
    total,
  );
  const isFullCircle = entries.length === 1;

  let cursor = 0;
  const slices = entries.map((entry, index) => {
    const startAngle = cursor;
    // Pin the final slice to a full turn so accumulated float error can never
    // leave a hairline wedge of background showing at twelve o'clock.
    const endAngle =
      index === entries.length - 1
        ? 360
        : startAngle + (entry.allocated / total) * 360;
    cursor = endAngle;

    return {
      ...entry,
      percent: (entry.allocated / total) * 100,
      percentLabel: percentLabels[index],
      path: isFullCircle ? "" : ringPath(startAngle, endAngle),
    };
  });

  return {
    total,
    totalSpent: funded.reduce((sum, segment) => sum + segment.spent, 0),
    slices,
    isFullCircle,
  };
}
