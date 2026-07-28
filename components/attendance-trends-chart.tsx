"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatSessionType, type PracticeSessionType } from "@/lib/attendance";
import type { SessionAttendanceStat } from "@/lib/attendance-stats";
import {
  buildAttendanceChartSpec,
  CHART_COLORS,
  DEFAULT_PLOT_WIDTH,
  getPlotHeight,
  VIDEO_LINE_COLOR,
  type TickAlign,
} from "@/lib/attendance-chart";
import { TIME_WINDOWS, TIME_WINDOW_LABELS, type TimeWindow } from "@/lib/attendance-time-window";

type AttendanceTrendsChartProps = {
  stats: SessionAttendanceStat[];
  activeFilter: PracticeSessionType | "all";
  onFilterChange: (filter: PracticeSessionType | "all") => void;
  onPointClick: (sessionId: string) => void;
  timeWindow: TimeWindow;
  onTimeWindowChange: (window: TimeWindow) => void;
};

type FilterOption = { key: PracticeSessionType | "all"; label: string };

const FILTER_OPTIONS: FilterOption[] = [
  { key: "all", label: "All" },
  { key: "practice", label: "Practice" },
  { key: "fundraiser", label: "Fundraiser" },
  { key: "exec meeting", label: "Exec Meeting" },
];

// Both axes are spaced from these two constants so the chart reads the same in
// either direction: the gap from the plot to its tick labels, and the gap from
// the tick labels to the axis title.
const AXIS_TICK_GAP = 8;
const AXIS_TITLE_GAP = 8;
// Explicit line height for the tick labels, so the row the x-axis labels occupy
// can be reserved exactly rather than estimated.
const TICK_LINE_HEIGHT = 16;

function sessionSortKey(stat: SessionAttendanceStat) {
  return `${stat.session.session_date}T${stat.session.session_time}`;
}

function formatDateShort(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// Practice attendance is the primary KPI this dashboard exists to track, so it
// gets a bolder, fully-opaque line; fundraiser/exec meeting are secondary
// context and are rendered thinner and muted so they don't compete with it.
const LINE_STYLE: Record<PracticeSessionType, { strokeWidth: number; baseOpacity: number }> = {
  practice: { strokeWidth: 3.5, baseOpacity: 1 },
  fundraiser: { strokeWidth: 1.75, baseOpacity: 0.7 },
  "exec meeting": { strokeWidth: 1.75, baseOpacity: 0.7 },
};

function lineOpacity(type: PracticeSessionType, activeFilter: PracticeSessionType | "all") {
  if (activeFilter !== "all" && activeFilter !== type) {
    return 0.15;
  }
  return LINE_STYLE[type].baseOpacity;
}

function videoOpacity(activeFilter: PracticeSessionType | "all") {
  return activeFilter !== "all" && activeFilter !== "practice" ? 0.15 : 0.45;
}

function tickTranslate(align: TickAlign) {
  if (align === "start") {
    return "translateX(0)";
  }
  if (align === "end") {
    return "translateX(-100%)";
  }
  return "translateX(-50%)";
}

// The SVG is sized in CSS pixels so it renders at scale 1 - that keeps stroke
// widths true and lets the tick labels be positioned in the same units the
// geometry uses, instead of guessing how a viewBox unit maps to a pixel.
function usePlotWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(DEFAULT_PLOT_WIDTH);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) {
        setWidth(Math.round(next));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export default function AttendanceTrendsChart({
  stats,
  activeFilter,
  onFilterChange,
  onPointClick,
  timeWindow,
  onTimeWindowChange,
}: AttendanceTrendsChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const { ref: plotRef, width: plotWidth } = usePlotWidth();

  const ascendingStats = useMemo(
    () => [...stats].sort((left, right) => sessionSortKey(left).localeCompare(sessionSortKey(right))),
    [stats],
  );

  const xLabels = useMemo(
    () => ascendingStats.map((stat) => formatDateShort(stat.session.session_date)),
    [ascendingStats],
  );

  const plotHeight = getPlotHeight(plotWidth);

  const spec = useMemo(
    () => buildAttendanceChartSpec(ascendingStats, xLabels, plotWidth, plotHeight),
    [ascendingStats, xLabels, plotWidth, plotHeight],
  );

  const hasStats = ascendingStats.length > 0;

  const maxGridValue = spec.gridlines[spec.gridlines.length - 1]?.value ?? 0;

  const dateRangeLabel =
    ascendingStats.length > 0
      ? `${formatDateShort(ascendingStats[0].session.session_date)} – ${formatDateShort(
          ascendingStats[ascendingStats.length - 1].session.session_date,
        )}`
      : "";

  const hoverIsVideo = hoveredKey?.startsWith("video-") ?? false;
  const hoverSessionId = hoveredKey ? (hoverIsVideo ? hoveredKey.slice(6) : hoveredKey) : null;
  const hoverStat = hoverSessionId
    ? ascendingStats.find((stat) => stat.session.id === hoverSessionId)
    : null;

  let tooltip: {
    xPercent: number;
    yPercent: number;
    transform: string;
    dateLabel: string;
    typeLabel: string;
    metricLabel: string;
  } | null = null;

  let hoverPoint: { x: number; y: number; color: string; isVideo: boolean } | null = null;

  if (hoverStat) {
    const matchingLine = spec.lines.find((line) => line.type === hoverStat.session.type);
    const point = hoverIsVideo
      ? spec.videoLine?.points.find((p) => p.sessionId === hoverStat.session.id)
      : matchingLine?.points.find((p) => p.sessionId === hoverStat.session.id);

    if (point) {
      const metricLabel = hoverIsVideo
        ? `Video submission: ${hoverStat.video?.submittedCount ?? 0} of ${hoverStat.video?.expectedCount ?? 0} (${hoverStat.video?.percent ?? 0}%)`
        : `Attendance: ${hoverStat.presentCount} of ${hoverStat.expectedCount} (${hoverStat.attendancePercent}%)`;

      const xPercent = (point.x / spec.width) * 100;
      const yPercent = (point.y / spec.height) * 100;

      // Pin the tooltip inside the plot near the edges - a card this narrow has
      // no room for a centered bubble to hang off the side, and a point near the
      // top has nowhere to put a bubble above it.
      const horizontal = xPercent < 25 ? "0" : xPercent > 75 ? "-100%" : "-50%";
      const vertical = yPercent < 32 ? "16px" : "calc(-100% - 12px)";

      tooltip = {
        xPercent,
        yPercent,
        transform: `translate(${horizontal}, ${vertical})`,
        dateLabel: formatDateShort(hoverStat.session.session_date),
        typeLabel: formatSessionType(hoverStat.session.type),
        metricLabel,
      };

      hoverPoint = {
        x: point.x,
        y: point.y,
        color: hoverIsVideo ? VIDEO_LINE_COLOR : (matchingLine?.color ?? CHART_COLORS[hoverStat.session.type]),
        isVideo: hoverIsVideo,
      };
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Attendance trends
          </p>
          <h2 className="mt-1.5 text-lg font-semibold text-zinc-900 sm:text-xl">
            {hasStats ? `${ascendingStats.length} sessions · ${dateRangeLabel}` : "No sessions in this window"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TIME_WINDOWS.map((window) => (
            <button
              key={window}
              type="button"
              onClick={() => onTimeWindowChange(window)}
              className={
                timeWindow === window
                  ? "rounded-lg border border-zinc-500 bg-zinc-500 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-400"
              }
            >
              {TIME_WINDOW_LABELS[window]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onFilterChange(option.key)}
            className={
              activeFilter === option.key
                ? "rounded-lg border border-[#990000] bg-[#990000] px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-400"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {!hasStats ? (
        <p className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
          No sessions fall within this time window. Try a wider range.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-600 sm:gap-x-5 sm:text-[13px]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: CHART_COLORS.practice }} />
              Practice attendance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: CHART_COLORS.fundraiser }} />
              Fundraiser attendance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4" style={{ backgroundColor: CHART_COLORS["exec meeting"] }} />
              Exec meeting attendance
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0 w-4 border-t-2 border-dashed opacity-55"
                style={{ borderColor: VIDEO_LINE_COLOR }}
              />
              Practice video submission
            </span>
          </div>

          <div className="mt-5 flex" style={{ gap: AXIS_TITLE_GAP }}>
            <div className="flex shrink-0 items-center" style={{ height: plotHeight }}>
              <span
                className="whitespace-nowrap text-[11px] font-semibold text-zinc-500 sm:text-xs"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Members present
              </span>
            </div>

            <div className="flex min-w-0 flex-1" style={{ gap: AXIS_TICK_GAP }}>
              {/* An invisible copy of the widest tick label gives this column
                  its exact width, so the gap left of it is the same constant
                  the x axis puts below its own labels - no pixel guessing. */}
              <div className="relative shrink-0" style={{ height: plotHeight }}>
                <span
                  aria-hidden
                  className="invisible block whitespace-nowrap text-[11px] font-medium sm:text-xs"
                  style={{ lineHeight: `${TICK_LINE_HEIGHT}px` }}
                >
                  {maxGridValue}
                </span>
                {spec.gridlines.map((grid) => (
                  <div
                    key={grid.value}
                    className="absolute right-0 whitespace-nowrap text-[11px] font-medium text-zinc-600 sm:text-xs"
                    style={{
                      top: `${grid.yPercent}%`,
                      lineHeight: `${TICK_LINE_HEIGHT}px`,
                      transform: "translateY(-50%)",
                    }}
                  >
                    {grid.value}
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div ref={plotRef} className="relative w-full" style={{ height: plotHeight }}>
                <svg
                  viewBox={`0 0 ${spec.width} ${spec.height}`}
                  className="absolute top-0 left-0 block h-full w-full overflow-visible"
                >
                  {spec.gridlines.map((grid) => (
                    <line
                      key={grid.value}
                      x1={0}
                      x2={spec.width}
                      y1={grid.y}
                      y2={grid.y}
                      stroke="#e4e4e7"
                      strokeWidth={1}
                    />
                  ))}
                  {spec.vGridLines.map((grid, index) => (
                    <line
                      key={index}
                      x1={grid.x}
                      x2={grid.x}
                      y1={0}
                      y2={spec.height}
                      stroke="#e4e4e7"
                      strokeWidth={1}
                    />
                  ))}
                  <line x1={0} x2={0} y1={0} y2={spec.height} stroke="#d4d4d8" strokeWidth={1.5} />
                  <line
                    x1={0}
                    x2={spec.width}
                    y1={spec.height}
                    y2={spec.height}
                    stroke="#d4d4d8"
                    strokeWidth={1.5}
                  />

                  {spec.videoLine ? (
                    <path
                      d={spec.videoLine.path}
                      fill="none"
                      stroke={VIDEO_LINE_COLOR}
                      strokeWidth={1.5}
                      strokeDasharray="5,4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={videoOpacity(activeFilter)}
                    />
                  ) : null}

                  {spec.lines.map((line) => (
                    <path
                      key={line.type}
                      d={line.path}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={LINE_STYLE[line.type].strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={lineOpacity(line.type, activeFilter)}
                    />
                  ))}

                  {/* Invisible hit-targets - markers are hidden until hovered, but the
                      hit area stays generous so hovering/tapping a date stays easy. */}
                  {spec.videoLine?.points.map((point) => {
                    const key = `video-${point.sessionId}`;
                    const interactable = activeFilter === "all" || activeFilter === "practice";
                    return (
                      <circle
                        key={key}
                        cx={point.x}
                        cy={point.y}
                        r={12}
                        fill="transparent"
                        style={{
                          cursor: interactable ? "pointer" : "default",
                          pointerEvents: interactable ? "auto" : "none",
                        }}
                        onMouseEnter={interactable ? () => setHoveredKey(key) : undefined}
                        onMouseLeave={interactable ? () => setHoveredKey(null) : undefined}
                        onClick={interactable ? () => onPointClick(point.sessionId) : undefined}
                      />
                    );
                  })}

                  {spec.lines.flatMap((line) => {
                    const interactable = activeFilter === "all" || activeFilter === line.type;
                    return line.points.map((point) => (
                      <circle
                        key={point.sessionId}
                        cx={point.x}
                        cy={point.y}
                        r={12}
                        fill="transparent"
                        style={{
                          cursor: interactable ? "pointer" : "default",
                          pointerEvents: interactable ? "auto" : "none",
                        }}
                        onMouseEnter={interactable ? () => setHoveredKey(point.sessionId) : undefined}
                        onMouseLeave={interactable ? () => setHoveredKey(null) : undefined}
                        onClick={interactable ? () => onPointClick(point.sessionId) : undefined}
                      />
                    ));
                  })}

                  {hoverPoint ? (
                    <circle
                      cx={hoverPoint.x}
                      cy={hoverPoint.y}
                      r={6}
                      fill={hoverPoint.isVideo ? "white" : hoverPoint.color}
                      stroke={hoverPoint.isVideo ? hoverPoint.color : "white"}
                      strokeWidth={hoverPoint.isVideo ? 2 : 1.5}
                      style={{ pointerEvents: "none" }}
                    />
                  ) : null}
                </svg>

                {spec.xTicks.map((tick) => (
                  <div
                    key={tick.sessionId}
                    className="absolute whitespace-nowrap text-[11px] font-medium text-zinc-600"
                    style={{
                      left: `${tick.xPercent}%`,
                      top: "100%",
                      marginTop: AXIS_TICK_GAP,
                      lineHeight: `${TICK_LINE_HEIGHT}px`,
                      transform: tickTranslate(tick.align),
                    }}
                  >
                    {tick.label}
                  </div>
                ))}

                {tooltip ? (
                  <div
                    className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-lg"
                    style={{
                      left: `${tooltip.xPercent}%`,
                      top: `${tooltip.yPercent}%`,
                      transform: tooltip.transform,
                    }}
                  >
                    <p className="text-xs font-semibold text-zinc-900">{tooltip.dateLabel}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{tooltip.typeLabel}</p>
                    <p className="mt-1.5 text-xs text-zinc-700">{tooltip.metricLabel}</p>
                  </div>
                ) : null}
                </div>

                {/* The tick labels are absolutely positioned, so reserve the
                    row they occupy before the axis title follows in flow. */}
                <div style={{ height: AXIS_TICK_GAP + TICK_LINE_HEIGHT }} />

                <p
                  className="text-center text-[11px] font-semibold text-zinc-500 sm:text-xs"
                  style={{ marginTop: AXIS_TITLE_GAP }}
                >
                  Session date
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
