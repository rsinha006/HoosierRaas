import { PRACTICE_SESSION_TYPES, type PracticeSessionType } from "@/lib/attendance";
import type { SessionAttendanceStat } from "@/lib/attendance-stats";

// The spec describes the plot area only - axis titles, tick labels and their
// gutters are laid out in CSS by the chart component. Keeping the viewBox equal
// to the plot area's measured CSS pixel size means the SVG renders at scale 1,
// so stroke widths stay true and nothing has to guess how far a label sits from
// an axis at an arbitrary viewport width.
export const DEFAULT_PLOT_WIDTH = 860;

// Plot aspect on wide screens; clamped so a narrow phone still gets a plot tall
// enough to read a trend in.
const PLOT_ASPECT = 2.7;
const MIN_PLOT_HEIGHT = 170;
const MAX_PLOT_HEIGHT = 320;

const OVERLAP_THRESHOLD_PX = 16;
// Horizontal room one "M/D" tick label needs to clear its neighbour. Sized for
// the tightest pairing on the axis: the last label is right-aligned against the
// plot edge while the one before it is centred on its tick, so that gap has to
// cover a full label plus half of another (~34px + ~17px) rather than the ~34px
// two centred labels would need. Drives both how many ticks fit at a given
// width and whether the end label can be appended.
const TICK_LABEL_FOOTPRINT_PX = 54;

export const CHART_COLORS: Record<PracticeSessionType, string> = {
  practice: "#990000",
  fundraiser: "#2563eb",
  "exec meeting": "#71717a",
};

// Distinct from CHART_COLORS.practice (validated CVD-safe pair) since the video
// line frequently overlaps the practice line on the same days.
export const VIDEO_LINE_COLOR = "#1baf7a";

export function getPlotHeight(width: number): number {
  return Math.round(Math.min(MAX_PLOT_HEIGHT, Math.max(MIN_PLOT_HEIGHT, width / PLOT_ASPECT)));
}

export function getMaxTickCount(width: number): number {
  return Math.max(2, Math.floor(width / TICK_LABEL_FOOTPRINT_PX));
}

export type AttendanceChartPoint = {
  sessionId: string;
  x: number;
  y: number;
  count: number;
  percent: number;
};

export type AttendanceLineSeries = {
  type: PracticeSessionType;
  color: string;
  path: string;
  points: AttendanceChartPoint[];
};

export type AttendanceChartGridline = {
  value: number;
  y: number;
  yPercent: number;
};

// "start"/"end" pin the first and last labels inside the plot box instead of
// letting a centered label hang off the edge of the card.
export type TickAlign = "start" | "middle" | "end";

export type AttendanceChartTick = {
  sessionId: string;
  x: number;
  xPercent: number;
  label: string;
  align: TickAlign;
};

export type AttendanceChartSpec = {
  width: number;
  height: number;
  gridlines: AttendanceChartGridline[];
  vGridLines: { x: number }[];
  xTicks: AttendanceChartTick[];
  lines: AttendanceLineSeries[];
  videoLine: { path: string; points: AttendanceChartPoint[] } | null;
};

export function computeNiceMax(maxValue: number): number {
  return Math.max(4, Math.ceil(maxValue / 4) * 4);
}

// Sessions are plotted at evenly spaced indices, so evenly spaced labels means
// a constant index stride - every gap is exactly one stride wide.
//
// The stride is the smallest that fits the measured width, then raised by up to
// 50% if a slightly wider one divides the range more cleanly. The cap matters:
// without it a range whose length happens to be prime would collapse to a
// single pair of labels.
//
// The last session is always labelled, so when the stride doesn't divide the
// range exactly one gap ends up an odd width. Which way it is odd depends on
// room: append the end label where it clears its neighbour, otherwise move the
// last regular label to the end and leave one wider gap instead. Never a
// narrower one - that is the case where the two labels would collide.
function evenTickIndices(n: number, maxTicks: number, pointSpacingPx: number): number[] {
  if (n <= 1) {
    return n === 1 ? [0] : [];
  }
  const span = n - 1;
  if (maxTicks < 3) {
    return [0, span];
  }

  const minStep = Math.max(1, Math.ceil(span / (maxTicks - 1)));
  const stepLimit = Math.min(span, Math.floor(minStep * 1.5));
  let step = minStep;
  let leftover = span % minStep;
  for (let candidate = minStep + 1; candidate <= stepLimit && leftover > 0; candidate += 1) {
    if (span % candidate < leftover) {
      step = candidate;
      leftover = span % candidate;
    }
  }

  const indices: number[] = [];
  for (let index = 0; index <= span; index += step) {
    indices.push(index);
  }

  const last = indices[indices.length - 1];
  if (last !== span) {
    if ((span - last) * pointSpacingPx >= TICK_LABEL_FOOTPRINT_PX || indices.length === 1) {
      indices.push(span);
    } else {
      indices[indices.length - 1] = span;
    }
  }

  return indices;
}

function buildPath(points: AttendanceChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
}

// Only the labels sitting exactly on the plot edges get pinned inward; every
// other label is centred on its tick. Keyed off the endpoints rather than a
// percentage band, so a short final gap can't right-align the second-to-last
// label on top of the last one.
function tickAlign(xPercent: number): TickAlign {
  if (xPercent <= 0.01) {
    return "start";
  }
  if (xPercent >= 99.99) {
    return "end";
  }
  return "middle";
}

export function buildAttendanceChartSpec(
  stats: SessionAttendanceStat[],
  xLabels: string[],
  plotWidth: number = DEFAULT_PLOT_WIDTH,
  plotHeight: number = getPlotHeight(DEFAULT_PLOT_WIDTH),
): AttendanceChartSpec {
  const width = Math.max(1, plotWidth);
  const height = Math.max(1, plotHeight);
  const n = stats.length;

  // Markers sit right on the plot edges, so the nudge that separates an
  // overlapping practice/video pair has to stay small on a phone-width plot.
  const nudgePx = width < 400 ? 4 : 6;

  const xFor = (index: number) => (n <= 1 ? width / 2 : (index / (n - 1)) * width);

  const maxRaw = Math.max(
    0,
    ...stats.map((stat) => stat.presentCount),
    ...stats.map((stat) => stat.video?.submittedCount ?? 0),
  );
  const gridStep = Math.max(1, Math.ceil(computeNiceMax(maxRaw) / 4));
  const yMax = gridStep * 4;
  const yFor = (count: number) => ((yMax - count) / yMax) * height;

  const gridlines: AttendanceChartGridline[] = [0, 1, 2, 3, 4].map((i) => {
    const value = gridStep * i;
    const y = yFor(value);
    return { value, y, yPercent: (y / height) * 100 };
  });

  // The number of labels adapts to the width, but their spacing never does:
  // the stride is a constant number of sessions, so adding or removing sessions
  // changes how many labels appear, not how evenly they sit.
  const pointSpacingPx = n > 1 ? width / (n - 1) : width;
  const tickIndices = evenTickIndices(n, getMaxTickCount(width), pointSpacingPx);

  const xTicks: AttendanceChartTick[] = tickIndices.map((index) => {
    const x = xFor(index);
    const xPercent = (x / width) * 100;
    return {
      sessionId: stats[index].session.id,
      x,
      xPercent,
      label: xLabels[index] ?? "",
      align: tickAlign(xPercent),
    };
  });

  const vGridLines = tickIndices.map((index) => ({ x: xFor(index) }));

  const overlapsVideo = (stat: SessionAttendanceStat) => {
    if (!stat.video) {
      return false;
    }
    return Math.abs(yFor(stat.presentCount) - yFor(stat.video.submittedCount)) < OVERLAP_THRESHOLD_PX;
  };

  const lines: AttendanceLineSeries[] = PRACTICE_SESSION_TYPES.map((type) => {
    const entries = stats
      .map((stat, index) => ({ stat, index }))
      .filter(({ stat }) => stat.session.type === type);

    const points: AttendanceChartPoint[] = entries.map(({ stat, index }) => {
      const nudge = type === "practice" && overlapsVideo(stat) ? nudgePx : 0;
      return {
        sessionId: stat.session.id,
        x: xFor(index) + nudge,
        y: yFor(stat.presentCount),
        count: stat.presentCount,
        percent: stat.attendancePercent,
      };
    });

    return { type, color: CHART_COLORS[type], path: buildPath(points), points };
  }).filter((line) => line.points.length > 0);

  const videoEntries = stats
    .map((stat, index) => ({ stat, index }))
    .filter(({ stat }) => stat.video !== null);

  const videoPoints: AttendanceChartPoint[] = videoEntries.map(({ stat, index }) => {
    const nudge = overlapsVideo(stat) ? -nudgePx : 0;
    return {
      sessionId: stat.session.id,
      x: xFor(index) + nudge,
      y: yFor(stat.video!.submittedCount),
      count: stat.video!.submittedCount,
      percent: stat.video!.percent,
    };
  });

  const videoLine = videoPoints.length > 0 ? { path: buildPath(videoPoints), points: videoPoints } : null;

  return {
    width,
    height,
    gridlines,
    vGridLines,
    xTicks,
    lines,
    videoLine,
  };
}
