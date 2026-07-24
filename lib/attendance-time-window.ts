import type { SessionAttendanceStat } from "@/lib/attendance-stats";

export const TIME_WINDOWS = ["last_30_days", "current_semester", "full_year"] as const;

export type TimeWindow = (typeof TIME_WINDOWS)[number];

export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  last_30_days: "Last 30 Days",
  current_semester: "Current Semester",
  full_year: "Full Year",
};

function parseSessionDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

// No explicit semester model exists in the schema, so semesters are approximated
// by calendar month: Aug-Dec is the 1st semester, Jan-May is the 2nd. June/July
// (summer, between the 2nd semester ending and the 1st starting again) fold into
// the 2nd semester, since that's the one that most recently ended.
function getSemesterRange(reference: Date) {
  const year = reference.getFullYear();
  const month = reference.getMonth(); // 0 = Jan ... 11 = Dec

  if (month >= 7 && month <= 11) {
    return { start: new Date(year, 7, 1), end: new Date(year, 11, 31, 23, 59, 59) };
  }
  return { start: new Date(year, 0, 1), end: new Date(year, 4, 31, 23, 59, 59) };
}

export function getTimeWindowRange(
  window: TimeWindow,
  reference: Date = new Date(),
): { start: Date; end: Date } | null {
  if (window === "full_year") {
    return null;
  }

  if (window === "last_30_days") {
    const end = new Date(reference);
    const start = new Date(reference);
    start.setDate(start.getDate() - 29);
    return { start, end };
  }

  return getSemesterRange(reference);
}

export function filterStatsByTimeWindow(
  stats: SessionAttendanceStat[],
  window: TimeWindow,
  reference: Date = new Date(),
): SessionAttendanceStat[] {
  const range = getTimeWindowRange(window, reference);
  if (!range) {
    return stats;
  }

  return stats.filter((stat) => {
    const date = parseSessionDate(stat.session.session_date);
    return date >= range.start && date <= range.end;
  });
}

/**
 * Picks the narrowest window that still contains every session in `stats`, so the
 * default view never silently hides real data behind an overly-tight preset.
 */
export function getDefaultTimeWindow(
  stats: SessionAttendanceStat[],
  reference: Date = new Date(),
): TimeWindow {
  if (stats.length === 0) {
    return "full_year";
  }

  for (const window of ["last_30_days", "current_semester"] as const) {
    const range = getTimeWindowRange(window, reference);
    if (!range) {
      continue;
    }

    const allWithinRange = stats.every((stat) => {
      const date = parseSessionDate(stat.session.session_date);
      return date >= range.start && date <= range.end;
    });

    if (allWithinRange) {
      return window;
    }
  }

  return "full_year";
}
