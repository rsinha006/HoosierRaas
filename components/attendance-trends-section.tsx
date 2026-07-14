"use client";

import { useState } from "react";
import type { PracticeSessionType } from "@/lib/attendance";
import type { SessionAttendanceStat } from "@/lib/attendance-stats";
import AttendanceTrendsChart from "@/components/attendance-trends-chart";
import AttendanceSessionsTable from "@/components/attendance-sessions-table";

type AttendanceTrendsSectionProps = {
  stats: SessionAttendanceStat[];
};

export default function AttendanceTrendsSection({ stats }: AttendanceTrendsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<PracticeSessionType | "all">("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <AttendanceTrendsChart
        stats={stats}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onPointClick={setSelectedSessionId}
      />
      <AttendanceSessionsTable
        stats={stats}
        activeFilter={activeFilter}
        scrollToSessionId={selectedSessionId}
      />
    </div>
  );
}
