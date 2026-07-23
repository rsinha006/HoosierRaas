import { PRACTICE_SESSION_TYPES, type PracticeSessionType } from "@/lib/attendance";
import type { SessionAttendanceStat } from "@/lib/attendance-stats";

export const CHART_VIEWBOX_WIDTH = 900;
export const CHART_VIEWBOX_HEIGHT = 380;

const PAD_LEFT = 48;
const PAD_RIGHT = 20;
const PAD_TOP = 24;
const PAD_BOTTOM = 110;
const NUDGE_PX = 6;
const OVERLAP_THRESHOLD_PX = 16;
// Minimum pixel gap between x-axis tick labels. Sized for a rotated (-40deg)
// "M/D" label at 11px so adjacent labels never overlap regardless of session volume.
const MIN_TICK_SPACING_PX = 44;

export const CHART_COLORS: Record<PracticeSessionType, string> = {
  practice: "#990000",
  fundraiser: "#2563eb",
  "exec meeting": "#71717a",
};

// Distinct from CHART_COLORS.practice (validated CVD-safe pair) since the video
// line frequently overlaps the practice line on the same days.
export const VIDEO_LINE_COLOR = "#1baf7a";

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

export type AttendanceChartTick = {
  sessionId: string;
  x: number;
  xPercent: number;
  label: string;
};

export type AttendanceChartSpec = {
  width: number;
  height: number;
  axisXPercent: number;
  axisYPercent: number;
  gridlines: AttendanceChartGridline[];
  vGridLines: { x: number }[];
  xTicks: AttendanceChartTick[];
  lines: AttendanceLineSeries[];
  videoLine: { path: string; points: AttendanceChartPoint[] } | null;
};

export function computeNiceMax(maxValue: number): number {
  return Math.max(4, Math.ceil(maxValue / 4) * 4);
}

function buildPath(points: AttendanceChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
}

export function buildAttendanceChartSpec(
  stats: SessionAttendanceStat[],
  xLabels: string[],
): AttendanceChartSpec {
  const width = CHART_VIEWBOX_WIDTH;
  const height = CHART_VIEWBOX_HEIGHT;
  const innerWidth = width - PAD_LEFT - PAD_RIGHT;
  const innerHeight = height - PAD_TOP - PAD_BOTTOM;
  const n = stats.length;

  const xFor = (index: number) =>
    PAD_LEFT + (n <= 1 ? innerWidth / 2 : (index / (n - 1)) * innerWidth);

  const maxRaw = Math.max(
    0,
    ...stats.map((stat) => stat.presentCount),
    ...stats.map((stat) => stat.video?.submittedCount ?? 0),
  );
  const gridStep = Math.max(1, Math.ceil(computeNiceMax(maxRaw) / 4));
  const yMax = gridStep * 4;
  const yFor = (count: number) => PAD_TOP + ((yMax - count) / yMax) * innerHeight;

  const axisXPercent = (PAD_LEFT / width) * 100;
  const axisYPercent = ((height - PAD_BOTTOM) / height) * 100;

  const gridlines: AttendanceChartGridline[] = [0, 1, 2, 3, 4].map((i) => {
    const value = gridStep * i;
    const y = yFor(value);
    return { value, y, yPercent: (y / height) * 100 };
  });

  // Space ticks by actual pixel distance rather than a fixed "every Nth session" -
  // keeps labels legible whether there are 4 sessions or 400. Always include the
  // last session so the range's end date stays visible.
  const pointSpacingPx = n > 1 ? innerWidth / (n - 1) : innerWidth;
  const tickStep = Math.max(1, Math.ceil(MIN_TICK_SPACING_PX / pointSpacingPx));
  const tickIndices = stats.map((_, index) => index).filter((index) => index % tickStep === 0);
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

  const xTicks: AttendanceChartTick[] = tickIndices.map((index) => ({
    sessionId: stats[index].session.id,
    x: xFor(index),
    xPercent: (xFor(index) / width) * 100,
    label: xLabels[index] ?? "",
  }));

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
      const nudge = type === "practice" && overlapsVideo(stat) ? NUDGE_PX : 0;
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
    const nudge = overlapsVideo(stat) ? -NUDGE_PX : 0;
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
    axisXPercent,
    axisYPercent,
    gridlines,
    vGridLines,
    xTicks,
    lines,
    videoLine,
  };
}
