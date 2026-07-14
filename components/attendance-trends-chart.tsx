"use client";

import { useMemo, useState } from "react";
import { formatSessionType, type PracticeSessionType } from "@/lib/attendance";
import type { SessionAttendanceStat } from "@/lib/attendance-stats";
import { buildAttendanceChartSpec, CHART_COLORS, VIDEO_LINE_COLOR } from "@/lib/attendance-chart";

type AttendanceTrendsChartProps = {
  stats: SessionAttendanceStat[];
  activeFilter: PracticeSessionType | "all";
  onFilterChange: (filter: PracticeSessionType | "all") => void;
  onPointClick: (sessionId: string) => void;
};

type FilterOption = { key: PracticeSessionType | "all"; label: string };

const FILTER_OPTIONS: FilterOption[] = [
  { key: "all", label: "All" },
  { key: "practice", label: "Practice" },
  { key: "fundraiser", label: "Fundraiser" },
  { key: "exec meeting", label: "Exec Meeting" },
];

function sessionSortKey(stat: SessionAttendanceStat) {
  return `${stat.session.session_date}T${stat.session.session_time}`;
}

function formatDateShort(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function lineOpacity(type: PracticeSessionType, activeFilter: PracticeSessionType | "all") {
  return activeFilter === "all" || activeFilter === type ? 1 : 0.15;
}

function videoOpacity(activeFilter: PracticeSessionType | "all") {
  return activeFilter !== "all" && activeFilter !== "practice" ? 0.15 : 0.55;
}

export default function AttendanceTrendsChart({
  stats,
  activeFilter,
  onFilterChange,
  onPointClick,
}: AttendanceTrendsChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const ascendingStats = useMemo(
    () => [...stats].sort((left, right) => sessionSortKey(left).localeCompare(sessionSortKey(right))),
    [stats],
  );

  const xLabels = useMemo(
    () => ascendingStats.map((stat) => formatDateShort(stat.session.session_date)),
    [ascendingStats],
  );

  const spec = useMemo(
    () => buildAttendanceChartSpec(ascendingStats, xLabels),
    [ascendingStats, xLabels],
  );

  if (ascendingStats.length === 0) {
    return null;
  }

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
    dateLabel: string;
    typeLabel: string;
    metricLabel: string;
  } | null = null;

  if (hoverStat) {
    const point = hoverIsVideo
      ? spec.videoLine?.points.find((p) => p.sessionId === hoverStat.session.id)
      : spec.lines
          .find((line) => line.type === hoverStat.session.type)
          ?.points.find((p) => p.sessionId === hoverStat.session.id);

    if (point) {
      const metricLabel = hoverIsVideo
        ? `Video submission: ${hoverStat.video?.submittedCount ?? 0} of ${hoverStat.video?.expectedCount ?? 0} (${hoverStat.video?.percent ?? 0}%)`
        : `Attendance: ${hoverStat.presentCount} of ${hoverStat.expectedCount} (${hoverStat.attendancePercent}%)`;

      tooltip = {
        xPercent: (point.x / spec.width) * 100,
        yPercent: (point.y / spec.height) * 100,
        dateLabel: formatDateShort(hoverStat.session.session_date),
        typeLabel: formatSessionType(hoverStat.session.type),
        metricLabel,
      };
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Attendance trends
          </p>
          <h2 className="mt-1.5 text-xl font-semibold text-zinc-900">
            {ascendingStats.length} sessions &middot; {dateRangeLabel}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
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
      </div>

      <div className="mt-5 flex flex-wrap gap-5 text-[13px] text-zinc-600">
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

      <div className="relative mt-5" style={{ aspectRatio: `${spec.width} / ${spec.height}` }}>
        <div
          className="absolute whitespace-nowrap text-xs font-semibold text-zinc-500"
          style={{
            left: `${spec.axisXPercent}%`,
            top: "50%",
            transform: "translate(calc(-100% - 36px), -50%) rotate(180deg)",
            writingMode: "vertical-rl",
          }}
        >
          Members present
        </div>

        <svg
          viewBox={`0 0 ${spec.width} ${spec.height}`}
          className="absolute top-0 left-0 block h-full w-full overflow-visible"
        >
          {spec.gridlines.map((grid) => (
            <line
              key={grid.value}
              x1={48}
              x2={spec.width - 20}
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
              y1={24}
              y2={spec.height - 110}
              stroke="#e4e4e7"
              strokeWidth={1}
            />
          ))}
          <line x1={48} x2={48} y1={24} y2={spec.height - 110} stroke="#d4d4d8" strokeWidth={1.5} />
          <line
            x1={48}
            x2={spec.width - 20}
            y1={spec.height - 110}
            y2={spec.height - 110}
            stroke="#d4d4d8"
            strokeWidth={1.5}
          />

          {spec.videoLine ? (
            <path
              d={spec.videoLine.path}
              fill="none"
              stroke={VIDEO_LINE_COLOR}
              strokeWidth={2}
              strokeDasharray="5,4"
              opacity={videoOpacity(activeFilter)}
            />
          ) : null}

          {spec.lines.map((line) => (
            <path
              key={line.type}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth={2.5}
              opacity={lineOpacity(line.type, activeFilter)}
            />
          ))}

          {spec.videoLine?.points.map((point) => {
            const key = `video-${point.sessionId}`;
            const isHover = hoveredKey === key;
            return (
              <circle
                key={key}
                cx={point.x}
                cy={point.y}
                r={isHover ? 6 : 4}
                fill="white"
                stroke={VIDEO_LINE_COLOR}
                strokeWidth={2}
                opacity={videoOpacity(activeFilter)}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => onPointClick(point.sessionId)}
              />
            );
          })}

          {spec.lines.flatMap((line) =>
            line.points.map((point) => {
              const isHover = hoveredKey === point.sessionId;
              return (
                <circle
                  key={point.sessionId}
                  cx={point.x}
                  cy={point.y}
                  r={isHover ? 6 : 4}
                  fill={line.color}
                  opacity={lineOpacity(line.type, activeFilter)}
                  stroke="white"
                  strokeWidth={1.5}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredKey(point.sessionId)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => onPointClick(point.sessionId)}
                />
              );
            }),
          )}
        </svg>

        {spec.gridlines.map((grid) => (
          <div
            key={grid.value}
            className="absolute whitespace-nowrap text-xs font-medium text-zinc-600"
            style={{
              left: `${spec.axisXPercent}%`,
              top: `${grid.yPercent}%`,
              transform: "translate(calc(-100% - 8px), -50%)",
            }}
          >
            {grid.value}
          </div>
        ))}

        {spec.xTicks.map((tick) => (
          <div
            key={tick.sessionId}
            className="absolute whitespace-nowrap text-[11px] font-medium text-zinc-600"
            style={{
              left: `${tick.xPercent}%`,
              top: `calc(${spec.axisYPercent}% + 8px)`,
              transform: "translate(-100%,0) rotate(-40deg)",
              transformOrigin: "right top",
            }}
          >
            {tick.label}
          </div>
        ))}

        <div
          className="absolute whitespace-nowrap text-xs font-semibold text-zinc-500"
          style={{
            left: `${((48 + (spec.width - 68) / 2) / spec.width) * 100}%`,
            top: `calc(${spec.axisYPercent}% + 54px)`,
            transform: "translate(-50%,-50%)",
          }}
        >
          Session date
        </div>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-lg"
            style={{
              left: `${tooltip.xPercent}%`,
              top: `${tooltip.yPercent}%`,
              transform: "translate(-50%,-120%)",
            }}
          >
            <p className="text-xs font-semibold text-zinc-900">{tooltip.dateLabel}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{tooltip.typeLabel}</p>
            <p className="mt-1.5 text-xs text-zinc-700">{tooltip.metricLabel}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
