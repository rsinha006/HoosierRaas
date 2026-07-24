"use client";

import Link from "next/link";
import { useState } from "react";
import { formatSessionType, type PracticeSessionType } from "@/lib/attendance";
import type { SessionAttendanceStat } from "@/lib/attendance-stats";

type AttendanceSessionsTableProps = {
  stats: SessionAttendanceStat[];
  activeFilter: PracticeSessionType | "all";
};

const VISIBLE_ROW_COUNT = 4;

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function statusBadgeClassName(status: "open" | "closed") {
  return status === "open" ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-700";
}

export default function AttendanceSessionsTable({
  stats,
  activeFilter,
}: AttendanceSessionsTableProps) {
  const [expanded, setExpanded] = useState(false);

  const filtered =
    activeFilter === "all" ? stats : stats.filter((stat) => stat.session.type === activeFilter);

  const visible = expanded ? filtered : filtered.slice(0, VISIBLE_ROW_COUNT);
  const hasMore = filtered.length > VISIBLE_ROW_COUNT;

  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-zinc-600">No practice sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Sessions</h2>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-zinc-600">No sessions match this filter.</div>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Attendance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Video submission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {visible.map((stat) => (
                  <tr key={stat.session.id} className="transition-colors hover:bg-zinc-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                      <Link
                        href={`/attendance/${stat.session.id}`}
                        className="font-medium text-[#990000] hover:underline"
                      >
                        {formatSessionDate(stat.session.session_date)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                      {formatSessionType(stat.session.type)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                      {stat.attendancePercent}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                      {stat.video ? `${stat.video.percent}%` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClassName(stat.session.status)}`}
                      >
                        {stat.session.status === "open" ? "Open" : "Closed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-zinc-200 md:hidden">
            {visible.map((stat) => (
              <div key={stat.session.id} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/attendance/${stat.session.id}`}
                      className="font-medium text-[#990000] hover:underline"
                    >
                      {formatSessionDate(stat.session.session_date)}
                    </Link>
                    <p className="text-sm text-zinc-600">{formatSessionType(stat.session.type)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClassName(stat.session.status)}`}
                  >
                    {stat.session.status === "open" ? "Open" : "Closed"}
                  </span>
                </div>
                <p className="text-sm text-zinc-700">Attendance: {stat.attendancePercent}%</p>
                <p className="text-xs text-zinc-500">
                  Video submission: {stat.video ? `${stat.video.percent}%` : "—"}
                </p>
              </div>
            ))}
          </div>

          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="flex w-full items-center justify-center border-t border-zinc-200 bg-zinc-50 px-6 py-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              {expanded ? "Show less ▴" : "Show more ▾"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
