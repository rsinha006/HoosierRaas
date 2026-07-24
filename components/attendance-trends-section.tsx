"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PracticeSessionType } from "@/lib/attendance";
import type { SessionAttendanceStat } from "@/lib/attendance-stats";
import {
  filterStatsByTimeWindow,
  getDefaultTimeWindow,
  type TimeWindow,
} from "@/lib/attendance-time-window";
import AttendanceTrendsChart from "@/components/attendance-trends-chart";
import AttendanceSessionsTable from "@/components/attendance-sessions-table";

type AttendanceTrendsSectionProps = {
  stats: SessionAttendanceStat[];
};

export default function AttendanceTrendsSection({ stats }: AttendanceTrendsSectionProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<PracticeSessionType | "all">("all");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(() => getDefaultTimeWindow(stats));

  const windowedStats = useMemo(
    () => filterStatsByTimeWindow(stats, timeWindow),
    [stats, timeWindow],
  );

  return (
    <div className="space-y-6">
      <AttendanceTrendsChart
        stats={windowedStats}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onPointClick={(sessionId) => router.push(`/attendance/${sessionId}`)}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
      />
      <AttendanceSessionsTable stats={windowedStats} activeFilter={activeFilter} />
    </div>
  );
}
