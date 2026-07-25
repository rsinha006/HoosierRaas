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
// Minimum pixel gap allowed between the last two x-axis tick labels (horizontal
// "M/D" text at 11px) - used only to avoid crowding when the final session is
// forced onto the axis so the range's end date always stays visible.
const MIN_TICK_SPACING_PX = 44;
// Horizontal room a single "M/D" tick label needs before it starts colliding
// with its neighbour. Drives how many ticks the axis can hold at a given width.
const TICK_LABEL_FOOTPRINT_PX = 46;

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

function mondayOfWeek(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isoDayIndex = (monday.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(monday.getDate() - isoDayIndex);
  return monday;
}

function weeksBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((mondayOfWeek(to).getTime() - mondayOfWeek(from).getTime()) / (7 * msPerDay));
}

function buildPath(points: AttendanceChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
}

function tickAlign(xPercent: number): TickAlign {
  if (xPercent < 8) {
    return "start";
  }
  if (xPercent > 92) {
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

  // Label by calendar week rather than raw session count, so a busy week (5
  // sessions) gets the same one label as a quiet week (1 session): find each
  // week's first session, then keep only every Nth of those week-anchors.
  const pointSpacingPx = n > 1 ? width / (n - 1) : width;
  const firstSessionDate = n > 0 ? new Date(`${stats[0].session.session_date}T12:00:00`) : null;

  const weekAnchorIndices: number[] = [];
  let lastWeekNumber: number | null = null;
  stats.forEach((stat, index) => {
    const date = new Date(`${stat.session.session_date}T12:00:00`);
    const weekNumber = firstSessionDate ? weeksBetween(firstSessionDate, date) : 0;
    if (weekNumber !== lastWeekNumber) {
      lastWeekNumber = weekNumber;
      weekAnchorIndices.push(index);
    }
  });

  // Every other week is the widest labelling we ever want; on a narrow plot (or
  // a long time window) widen the stride further so the labels can never
  // collide - the axis thins out instead of turning into a smear of dates.
  const maxTicks = getMaxTickCount(width);
  const stride = Math.max(2, Math.ceil(weekAnchorIndices.length / maxTicks));
  const tickIndices = weekAnchorIndices.filter((_, i) => i % stride === 0);

  const lastRegularTick = tickIndices[tickIndices.length - 1];
  if (n > 0 && lastRegularTick !== n - 1) {
    const gapToEndPx = (n - 1 - lastRegularTick) * pointSpacingPx;
    if (gapToEndPx < MIN_TICK_SPACING_PX && tickIndices.length > 1) {
      // Too close to the previous tick to add both without crowding - swap in
      // the final session so the range's end date still stays visible.
      tickIndices[tickIndices.length - 1] = n - 1;
    } else {
      tickIndices.push(n - 1);
    }
  }

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
