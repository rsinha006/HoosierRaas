import { formatMemberName, type Member } from "@/lib/members";
import {
  type AttendanceRecord,
  type AttendanceStatus,
  type PracticeSession,
  type PracticeSessionType,
  getAudienceLabel,
} from "@/lib/attendance";

export type MemberSummary = Pick<Member, "id" | "first_name" | "last_name" | "email" | "roles">;

export type AttendanceRecordWithSession = AttendanceRecord & {
  session: Pick<
    PracticeSession,
    "id" | "season" | "session_date" | "session_time" | "type" | "status"
  >;
};

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

export function getVoluntaryResponses(
  records: AttendanceRecord[],
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
  const responseCount = getVoluntaryResponses(records as AttendanceRecord[]).length;

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

export type DancerAttendanceSummary = {
  memberId: string;
  name: string;
  excusedAbsences: number;
  unexcusedAbsences: number;
  /** Per the dancer contract, ANY unexcused absence is an immediate flag — no "2 or more" grace. */
  hasUnexcusedFlag: boolean;
  /** Excused absences: 2 is a warning, 3+ is the policy limit. */
  excusedWarning: boolean;
  excusedPolicyAlert: boolean;
};

export function summarizeDancerAttendance(
  members: MemberSummary[],
  records: AttendanceRecordWithSession[],
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
      hasUnexcusedFlag: false,
      excusedWarning: false,
      excusedPolicyAlert: false,
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
    summary.hasUnexcusedFlag = summary.unexcusedAbsences >= 1;
    summary.excusedWarning = summary.excusedAbsences === 2;
    summary.excusedPolicyAlert = summary.excusedAbsences >= 3;
  }

  return Array.from(summaries.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function getTeamAttendancePercentage(
  members: MemberSummary[],
  sessions: PracticeSession[],
  records: AttendanceRecord[],
  season: string,
) {
  const closedSessions = getClosedSeasonSessions(sessions, season);

  if (closedSessions.length === 0) {
    return null;
  }

  let denominator = 0;
  let numerator = 0;

  for (const session of closedSessions) {
    const expectedCount = getExpectedMembers(members, session.type).length;
    denominator += expectedCount;

    const sessionRecords = records.filter((record) => record.session_id === session.id);
    numerator += sessionRecords.filter((record) =>
      isPositiveAttendance(record.attendance_status),
    ).length;
  }

  if (denominator === 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 100);
}

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
