import { formatMemberName, type Member } from "@/lib/members";
import {
  type AttendanceRecord,
  type AttendanceStatus,
  type PracticeSession,
  type PracticeSessionType,
  getAudienceLabel,
  isVideoDeadlineDay,
} from "@/lib/attendance";

export type MemberSummary = Pick<Member, "id" | "first_name" | "last_name" | "email" | "roles">;

export type AttendanceRecordWithSession = AttendanceRecord & {
  session: Pick<
    PracticeSession,
    "id" | "season" | "session_date" | "session_time" | "type" | "status"
  >;
};

/**
 * The columns the dashboard statistics actually read. The attendance dashboard
 * loads every record in the season, so it selects only these rather than the
 * whole row - the free-text columns (excuse_text, override_reason,
 * practice_video_excuse) are dead weight multiplied by thousands of rows.
 *
 * Full AttendanceRecord values still satisfy this, so callers that do need the
 * whole row (the member detail page) pass them through unchanged.
 */
export type AttendanceStatRecord = Pick<
  AttendanceRecord,
  | "session_id"
  | "member_id"
  | "respondent_email"
  | "attendance_status"
  | "practice_video_status"
  | "auto_flagged"
>;

export type AttendanceStatRecordWithSession = AttendanceStatRecord & {
  session: Pick<PracticeSession, "id" | "season" | "session_date" | "type" | "status">;
};

/**
 * Indexes records by session once, instead of re-scanning the full record list
 * for every session. The dashboard has O(sessions x records) worth of work
 * otherwise - a full season is easily 100 sessions against several thousand
 * records, and the scan repeats for each statistic on the page.
 */
function groupRecordsBySession<T extends Pick<AttendanceRecord, "session_id">>(
  records: T[],
): Map<string, T[]> {
  const bySession = new Map<string, T[]>();

  for (const record of records) {
    const existing = bySession.get(record.session_id);

    if (existing) {
      existing.push(record);
    } else {
      bySession.set(record.session_id, [record]);
    }
  }

  return bySession;
}

export function getExpectedAudienceRole(sessionType: PracticeSessionType) {
  return sessionType === "exec meeting" ? "exec" : "dancer";
}

export function memberMatchesSessionAudience(
  member: Pick<Member, "roles">,
  sessionType: PracticeSessionType,
) {
  const role = getExpectedAudienceRole(sessionType);
  return member.roles.includes(role);
}

export function getExpectedMembers(
  members: MemberSummary[],
  sessionType: PracticeSessionType,
) {
  return members.filter(
    (member) => memberMatchesSessionAudience(member, sessionType),
  );
}

export function hasVoluntarySubmission(
  records: Pick<AttendanceRecord, "member_id" | "respondent_email" | "auto_flagged">[],
  member: MemberSummary,
) {
  const email = member.email.toLowerCase();

  return records.some(
    (record) =>
      !record.auto_flagged &&
      (record.member_id === member.id ||
        record.respondent_email.toLowerCase() === email),
  );
}

export function getVoluntaryResponses<T extends Pick<AttendanceRecord, "auto_flagged">>(
  records: T[],
) {
  return records.filter((record) => !record.auto_flagged);
}

export function getNonResponderMembers(
  members: MemberSummary[],
  sessionType: PracticeSessionType,
  records: Pick<AttendanceRecord, "member_id" | "respondent_email" | "auto_flagged">[],
) {
  const expectedMembers = getExpectedMembers(members, sessionType);

  return expectedMembers.filter(
    (member) => !hasVoluntarySubmission(records, member),
  );
}

export function getSessionResponseRate(
  members: MemberSummary[],
  session: PracticeSession,
  records: Pick<AttendanceRecord, "member_id" | "respondent_email" | "auto_flagged">[],
) {
  const expectedCount = getExpectedMembers(members, session.type).length;
  const responseCount = getVoluntaryResponses(records).length;

  const audienceLabel = getAudienceLabel(session.type);

  return {
    responseCount,
    expectedCount,
    label: `${responseCount} of ${expectedCount} ${audienceLabel} responded`,
  };
}

export function isPositiveAttendance(status: AttendanceStatus) {
  return status === "present" || status === "late";
}

export function getSeasonSessions(sessions: PracticeSession[], season: string) {
  return sessions.filter((session) => session.season === season);
}

export function getClosedSeasonSessions(sessions: PracticeSession[], season: string) {
  return getSeasonSessions(sessions, season).filter(
    (session) => session.status === "closed",
  );
}

export type ExcusedAbsenceTier = "none" | "approaching" | "at_limit";

export type DancerAttendanceSummary = {
  memberId: string;
  name: string;
  excusedAbsences: number;
  unexcusedAbsences: number;
  excusedAbsenceTier: ExcusedAbsenceTier;
};

export function summarizeDancerAttendance(
  members: MemberSummary[],
  records: AttendanceStatRecordWithSession[],
  season: string,
) {
  const seasonRecords = records.filter(
    (record) =>
      record.session.season === season && getExpectedAudienceRole(record.session.type) === "dancer",
  );

  const summaries = new Map<string, DancerAttendanceSummary>();

  for (const member of members) {
    summaries.set(member.id, {
      memberId: member.id,
      name: formatMemberName(member),
      excusedAbsences: 0,
      unexcusedAbsences: 0,
      excusedAbsenceTier: "none",
    });
  }

  for (const record of seasonRecords) {
    if (!record.member_id) {
      continue;
    }

    const summary = summaries.get(record.member_id);
    if (!summary) {
      continue;
    }

    if (record.attendance_status === "absent_excused") {
      summary.excusedAbsences += 1;
    }

    if (record.attendance_status === "absent_unexcused") {
      summary.unexcusedAbsences += 1;
    }
  }

  for (const summary of summaries.values()) {
    summary.excusedAbsenceTier =
      summary.excusedAbsences >= 3
        ? "at_limit"
        : summary.excusedAbsences === 2
          ? "approaching"
          : "none";
  }

  return Array.from(summaries.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export type AttendanceAlertGroups = {
  unexcused: DancerAttendanceSummary[];
  approaching: DancerAttendanceSummary[];
  atLimit: DancerAttendanceSummary[];
};

export function buildAttendanceAlertGroups(
  summaries: DancerAttendanceSummary[],
): AttendanceAlertGroups {
  const unexcused = summaries
    .filter((summary) => summary.unexcusedAbsences >= 1)
    .sort(
      (left, right) =>
        right.unexcusedAbsences - left.unexcusedAbsences || left.name.localeCompare(right.name),
    );

  return {
    unexcused,
    approaching: summaries.filter((summary) => summary.excusedAbsenceTier === "approaching"),
    atLimit: summaries.filter((summary) => summary.excusedAbsenceTier === "at_limit"),
  };
}

function attendancePercentForSessions(
  members: MemberSummary[],
  sessions: PracticeSession[],
  records: AttendanceStatRecord[],
) {
  if (sessions.length === 0) {
    return null;
  }

  const recordsBySession = groupRecordsBySession(records);
  let denominator = 0;
  let numerator = 0;

  for (const session of sessions) {
    const expectedCount = getExpectedMembers(members, session.type).length;
    denominator += expectedCount;

    const sessionRecords = recordsBySession.get(session.id) ?? [];
    numerator += sessionRecords.filter((record) =>
      isPositiveAttendance(record.attendance_status),
    ).length;
  }

  if (denominator === 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 100);
}

export function getTeamAttendancePercentage(
  members: MemberSummary[],
  sessions: PracticeSession[],
  records: AttendanceStatRecord[],
  season: string,
) {
  return attendancePercentForSessions(members, getClosedSeasonSessions(sessions, season), records);
}

export type AttendanceTrend = {
  current: number | null;
  previous: number | null;
  deltaPoints: number | null;
};

function calendarMonthRange(reference: Date, monthOffset: number) {
  const year = reference.getFullYear();
  const month = reference.getMonth() + monthOffset;
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

/**
 * Compares this-month-to-date team attendance against the full previous
 * calendar month, for a "up X% from last month" style trend indicator.
 */
export function getTeamAttendanceTrend(
  members: MemberSummary[],
  sessions: PracticeSession[],
  records: AttendanceStatRecord[],
  season: string,
  referenceDate: Date = new Date(),
): AttendanceTrend {
  const closedSessions = getClosedSeasonSessions(sessions, season);
  const currentRange = calendarMonthRange(referenceDate, 0);
  const previousRange = calendarMonthRange(referenceDate, -1);

  const sessionsInRange = (range: { start: Date; end: Date }) =>
    closedSessions.filter((session) => {
      const date = new Date(`${session.session_date}T12:00:00`);
      return date >= range.start && date <= range.end;
    });

  const current = attendancePercentForSessions(members, sessionsInRange(currentRange), records);
  const previous = attendancePercentForSessions(members, sessionsInRange(previousRange), records);

  return {
    current,
    previous,
    deltaPoints: current !== null && previous !== null ? current - previous : null,
  };
}

/** @deprecated Use buildSessionAttendanceStats for the attendance dashboard. */
export function buildSessionRates(
  members: MemberSummary[],
  sessions: PracticeSession[],
  records: AttendanceRecord[],
) {
  return sessions.map((session) => {
    const sessionRecords = records.filter((record) => record.session_id === session.id);
    const rate = getSessionResponseRate(members, session, sessionRecords);

    return {
      session,
      ...rate,
      responseRatePercent:
        rate.expectedCount === 0
          ? 0
          : Math.round((rate.responseCount / rate.expectedCount) * 100),
    };
  });
}

export type SessionAttendanceStat = {
  session: Pick<
    PracticeSession,
    "id" | "season" | "session_date" | "session_time" | "type" | "status"
  >;
  presentCount: number;
  expectedCount: number;
  attendancePercent: number;
  video: {
    submittedCount: number;
    expectedCount: number;
    percent: number;
  } | null;
};

function isVideoApplicableSession(
  session: Pick<PracticeSession, "type" | "session_date">,
) {
  return (
    session.type === "practice" &&
    isVideoDeadlineDay(new Date(`${session.session_date}T12:00:00`))
  );
}

export function buildSessionAttendanceStats(
  members: MemberSummary[],
  sessions: PracticeSession[],
  records: AttendanceStatRecord[],
): SessionAttendanceStat[] {
  const recordsBySession = groupRecordsBySession(records);

  return sessions.map((session) => {
    const sessionRecords = recordsBySession.get(session.id) ?? [];
    const expectedCount = getExpectedMembers(members, session.type).length;
    const presentCount = sessionRecords.filter((record) =>
      isPositiveAttendance(record.attendance_status),
    ).length;
    const attendancePercent =
      expectedCount === 0 ? 0 : Math.round((presentCount / expectedCount) * 100);

    let video: SessionAttendanceStat["video"] = null;

    if (isVideoApplicableSession(session)) {
      const submittedCount = sessionRecords.filter(
        (record) =>
          record.practice_video_status === "on_time" || record.practice_video_status === "late",
      ).length;

      video = {
        submittedCount,
        expectedCount,
        percent: expectedCount === 0 ? 0 : Math.round((submittedCount / expectedCount) * 100),
      };
    }

    return { session, presentCount, expectedCount, attendancePercent, video };
  });
}
