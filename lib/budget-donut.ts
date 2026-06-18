import {
  buildPopulatedGeneralPoolCategories,
  type Budget,
  type ExpenseRequest,
  type IufbLineItem,
} from "@/lib/finance";

export type BudgetDonutSegment = {
  label: string;
  allocated: number;
  spent: number;
};

export const IU_CRIMSON = "#990000";
export const IU_CRIMSON_DARK = "#7a0000";
export const IU_CREAM = "#EEEDEB";

export function buildGeneralPoolDonutSegments(
  budgets: Pick<Budget, "category" | "allocated_amount">[],
  approvedRequests: Pick<
    ExpenseRequest,
    "category" | "amount" | "iufb_line_item_id"
  >[],
): BudgetDonutSegment[] {
  return buildPopulatedGeneralPoolCategories(budgets).map(
    ({ value, label, allocated }) => {
      const spent = approvedRequests
        .filter(
          (request) =>
            request.category === value && !request.iufb_line_item_id,
        )
        .reduce((sum, request) => sum + Number(request.amount), 0);

      return { label, allocated, spent };
    },
  );
}

export function buildIufbDonutSegments(
  lineItems: Pick<
    IufbLineItem,
    "description" | "approved_amount" | "spent_amount"
  >[],
): BudgetDonutSegment[] {
  return lineItems
    .filter((item) => Number(item.approved_amount) > 0)
    .sort((left, right) => left.description.localeCompare(right.description))
    .map((item) => ({
      label: item.description,
      allocated: Number(item.approved_amount),
      spent: Number(item.spent_amount),
    }));
}

export function sumDonutAllocated(segments: BudgetDonutSegment[]) {
  return segments.reduce((sum, segment) => sum + segment.allocated, 0);
}

export function sumDonutSpent(segments: BudgetDonutSegment[]) {
  return segments.reduce((sum, segment) => sum + segment.spent, 0);
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

export function describeDonutArc(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  if (endAngle - startAngle <= 0) {
    return "";
  }

  const startOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export type DonutArcSlice = {
  key: string;
  path: string;
  fill: string;
};

export type DonutSegmentLabel = {
  key: string;
  label: string;
  linePath: string;
  textX: number;
  textY: number;
  textAnchor: "start" | "end";
  textWidth: number;
  arcPoint: { x: number; y: number };
  elbowPoint: { x: number; y: number };
  horizontalEndX: number;
};

export type DonutLayout = {
  slices: DonutArcSlice[];
  labels: DonutSegmentLabel[];
};

export type DonutChartViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type DonutChartSpec = DonutLayout & {
  viewBox: DonutChartViewBox;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  fontSize: number;
};

const SEGMENT_GAP_DEGREES = 1.5;
const MIN_LABEL_ANGLE = 8;
const LABEL_FONT_SIZE = 11;
const LABEL_CHAR_WIDTH = LABEL_FONT_SIZE * 0.56;
const LABEL_LINE_HEIGHT = LABEL_FONT_SIZE * 1.35;
const VIEWBOX_PADDING_X = 12;
const VIEWBOX_PADDING_TOP = 10;
const VIEWBOX_PADDING_BOTTOM = 6;

function estimateTextWidth(label: string) {
  return label.length * LABEL_CHAR_WIDTH;
}

function buildCalloutLinePath(
  arcX: number,
  arcY: number,
  elbowX: number,
  elbowY: number,
  horizontalEndX: number,
  textY: number,
) {
  return `M ${arcX} ${arcY} L ${elbowX} ${elbowY} L ${horizontalEndX} ${textY}`;
}

function buildCalloutLabel(
  centerX: number,
  centerY: number,
  outerRadius: number,
  midAngle: number,
  label: string,
  key: string,
  calloutScale: number,
): DonutSegmentLabel {
  const radialOffset = 16 * calloutScale;
  const horizontalLength = 28 * calloutScale;
  const textPadding = 6 * calloutScale;

  const arcPoint = polarToCartesian(centerX, centerY, outerRadius, midAngle);
  const elbowPoint = polarToCartesian(
    centerX,
    centerY,
    outerRadius + radialOffset,
    midAngle,
  );
  const isRightSide = elbowPoint.x >= centerX;
  const horizontalEndX = isRightSide
    ? elbowPoint.x + horizontalLength
    : elbowPoint.x - horizontalLength;
  const textWidth = estimateTextWidth(label);
  const textX = isRightSide
    ? horizontalEndX + textPadding
    : horizontalEndX - textPadding;

  return {
    key,
    label,
    textX,
    textY: elbowPoint.y,
    textAnchor: isRightSide ? "start" : "end",
    textWidth,
    arcPoint,
    elbowPoint,
    horizontalEndX,
    linePath: buildCalloutLinePath(
      arcPoint.x,
      arcPoint.y,
      elbowPoint.x,
      elbowPoint.y,
      horizontalEndX,
      elbowPoint.y,
    ),
  };
}

function syncCalloutLinePath(label: DonutSegmentLabel) {
  label.linePath = buildCalloutLinePath(
    label.arcPoint.x,
    label.arcPoint.y,
    label.elbowPoint.x,
    label.elbowPoint.y,
    label.horizontalEndX,
    label.textY,
  );
}

function separateCalloutLabels(labels: DonutSegmentLabel[]) {
  const groups: DonutSegmentLabel[][] = [
    labels.filter((label) => label.textAnchor === "end"),
    labels.filter((label) => label.textAnchor === "start"),
  ];

  for (const group of groups) {
    group.sort((left, right) => left.textY - right.textY);

    for (let index = 1; index < group.length; index += 1) {
      const previous = group[index - 1];
      const current = group[index];
      const minY = previous.textY + LABEL_LINE_HEIGHT;

      if (current.textY < minY) {
        current.textY = minY;
        syncCalloutLinePath(current);
      }
    }

    for (let index = group.length - 2; index >= 0; index -= 1) {
      const next = group[index + 1];
      const current = group[index];
      const maxY = next.textY - LABEL_LINE_HEIGHT;

      if (current.textY > maxY) {
        current.textY = maxY;
        syncCalloutLinePath(current);
      }
    }
  }
}

function computeViewBox(
  centerX: number,
  centerY: number,
  outerRadius: number,
  labels: DonutSegmentLabel[],
  fontSize: number,
): DonutChartViewBox {
  let minX = centerX - outerRadius;
  let maxX = centerX + outerRadius;
  let minY = centerY - outerRadius;
  let maxY = centerY + outerRadius;
  const textHeight = fontSize * 1.2;

  for (const label of labels) {
    minY = Math.min(minY, label.textY - textHeight / 2);
    maxY = Math.max(maxY, label.textY + textHeight / 2);

    if (label.textAnchor === "start") {
      maxX = Math.max(maxX, label.textX + label.textWidth);
    } else {
      minX = Math.min(minX, label.textX - label.textWidth);
    }
  }

  minX -= VIEWBOX_PADDING_X;
  minY -= VIEWBOX_PADDING_TOP;
  maxX += VIEWBOX_PADDING_X;
  maxY += VIEWBOX_PADDING_BOTTOM;

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function buildLayoutAtRadius(
  segments: BudgetDonutSegment[],
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
): DonutLayout {
  const totalAllocated = sumDonutAllocated(segments);
  const calloutScale = outerRadius / 110;

  if (totalAllocated <= 0) {
    return { slices: [], labels: [] };
  }

  const slices: DonutArcSlice[] = [];
  const labels: DonutSegmentLabel[] = [];
  let currentAngle = 0;

  for (const [index, segment] of segments.entries()) {
    const segmentAngle =
      (segment.allocated / totalAllocated) * 360 - SEGMENT_GAP_DEGREES;

    if (segmentAngle <= 0) {
      continue;
    }

    const segmentStart = currentAngle + SEGMENT_GAP_DEGREES / 2;
    const segmentEnd = segmentStart + segmentAngle;
    const spentRatio =
      segment.allocated > 0
        ? Math.min(segment.spent / segment.allocated, 1)
        : 0;
    const spentEnd = segmentStart + segmentAngle * spentRatio;
    const overBudget = segment.spent > segment.allocated;

    if (overBudget) {
      slices.push({
        key: `${index}-spent`,
        path: describeDonutArc(
          centerX,
          centerY,
          innerRadius,
          outerRadius,
          segmentStart,
          segmentEnd,
        ),
        fill: IU_CRIMSON_DARK,
      });
    } else {
      if (spentRatio > 0) {
        slices.push({
          key: `${index}-spent`,
          path: describeDonutArc(
            centerX,
            centerY,
            innerRadius,
            outerRadius,
            segmentStart,
            spentEnd,
          ),
          fill: IU_CRIMSON,
        });
      }

      if (spentEnd < segmentEnd) {
        slices.push({
          key: `${index}-remaining`,
          path: describeDonutArc(
            centerX,
            centerY,
            innerRadius,
            outerRadius,
            spentEnd,
            segmentEnd,
          ),
          fill: IU_CREAM,
        });
      }
    }

    if (segmentAngle >= MIN_LABEL_ANGLE) {
      const midAngle = segmentStart + segmentAngle / 2;

      labels.push(
        buildCalloutLabel(
          centerX,
          centerY,
          outerRadius,
          midAngle,
          segment.label,
          `label-${index}`,
          calloutScale,
        ),
      );
    }

    currentAngle += (segment.allocated / totalAllocated) * 360;
  }

  separateCalloutLabels(labels);

  return { slices, labels };
}

export function unifyDonutViewBoxes(viewBoxes: DonutChartViewBox[]) {
  if (viewBoxes.length === 0) {
    return { minX: -1, minY: -1, width: 2, height: 2 };
  }

  const minX = Math.min(...viewBoxes.map((box) => box.minX));
  const minY = Math.min(...viewBoxes.map((box) => box.minY));
  const maxX = Math.max(...viewBoxes.map((box) => box.minX + box.width));
  const maxY = Math.max(...viewBoxes.map((box) => box.minY + box.height));

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function resolveOuterRadius(labelCount: number) {
  return Math.min(165, Math.max(112, 105 + labelCount * 2.5));
}

function buildDonutChartSpecWithRadius(
  segments: BudgetDonutSegment[],
  outerRadius: number,
): DonutChartSpec {
  const centerX = 0;
  const centerY = 0;
  const innerRadius = outerRadius * 0.62;
  const layout = buildLayoutAtRadius(
    segments,
    centerX,
    centerY,
    outerRadius,
    innerRadius,
  );
  const viewBox = computeViewBox(
    centerX,
    centerY,
    outerRadius,
    layout.labels,
    LABEL_FONT_SIZE,
  );

  return {
    ...layout,
    viewBox,
    centerX,
    centerY,
    innerRadius,
    outerRadius,
    fontSize: LABEL_FONT_SIZE,
  };
}

export function buildMatchedDonutChartSpecs(
  segmentSets: BudgetDonutSegment[][],
): { specs: DonutChartSpec[]; viewBox: DonutChartViewBox } {
  const maxLabelCount = Math.max(
    ...segmentSets.map((segments) => segments.length),
    0,
  );
  const outerRadius = resolveOuterRadius(maxLabelCount);
  const specs = segmentSets.map((segments) =>
    buildDonutChartSpecWithRadius(segments, outerRadius),
  );
  const viewBox = unifyDonutViewBoxes(specs.map((spec) => spec.viewBox));

  return { specs, viewBox };
}

export function buildDonutChartSpec(
  segments: BudgetDonutSegment[],
): DonutChartSpec {
  return buildDonutChartSpecWithRadius(
    segments,
    resolveOuterRadius(segments.length),
  );
}

/** @deprecated Use buildDonutChartSpec for responsive sizing. */
export function buildDonutLayout(
  segments: BudgetDonutSegment[],
  options: {
    centerX: number;
    centerY: number;
    innerRadius: number;
    outerRadius: number;
  },
): DonutLayout {
  return buildLayoutAtRadius(
    segments,
    options.centerX,
    options.centerY,
    options.outerRadius,
    options.innerRadius,
  );
}

export function formatDonutViewBox(viewBox: DonutChartViewBox) {
  return `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`;
}
