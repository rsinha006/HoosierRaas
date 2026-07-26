import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSessionAttendanceStats,
  getTeamAttendancePercentage,
  getTeamAttendanceTrend,
  summarizeDancerAttendance,
} from "../lib/attendance-stats.ts";

const SEASON = "2025-2026";

function member(id, roles = ["dancer"]) {
  return {
    id,
    first_name: `First${id}`,
    last_name: `Last${id}`,
    email: `${id}@iu.edu`,
    roles,
  };
}

function session(id, { date = "2025-10-06", type = "practice", status = "closed" } = {}) {
  return {
    id,
    season: SEASON,
    session_date: date,
    session_time: "18:00",
    type,
    status,
  };
}

function record(sessionId, memberId, attendance_status, extra = {}) {
  return {
    session_id: sessionId,
    member_id: memberId,
    respondent_email: `${memberId}@iu.edu`,
    attendance_status,
    practice_video_status: null,
    auto_flagged: false,
    ...extra,
  };
}

/**
 * These cover the record-to-session grouping. The statistics used to re-scan
 * the whole record list once per session; they now index it once, so the
 * grouping is worth pinning down - especially the cases where a session has no
 * records and where records point at a session that is not in the list.
 */
test("session stats count only the records belonging to each session", () => {
  const members = [member("a"), member("b")];
  const sessions = [session("s1"), session("s2")];
  const records = [
    record("s1", "a", "present"),
    record("s1", "b", "late"),
    record("s2", "a", "absent_unexcused"),
  ];

  const stats = buildSessionAttendanceStats(members, sessions, records);

  assert.equal(stats.length, 2);
  // present + late both count as attended
  assert.equal(stats[0].presentCount, 2);
  assert.equal(stats[0].expectedCount, 2);
  assert.equal(stats[0].attendancePercent, 100);
  assert.equal(stats[1].presentCount, 0);
  assert.equal(stats[1].attendancePercent, 0);
});

test("a session with no records reports zero rather than borrowing another session's", () => {
  const members = [member("a")];
  const sessions = [session("s1"), session("empty")];
  const records = [record("s1", "a", "present")];

  const stats = buildSessionAttendanceStats(members, sessions, records);

  assert.equal(stats[0].presentCount, 1);
  assert.equal(stats[1].presentCount, 0);
  assert.equal(stats[1].attendancePercent, 0);
});

test("records for an unknown session are ignored", () => {
  const members = [member("a")];
  const sessions = [session("s1")];
  const records = [
    record("s1", "a", "present"),
    record("session-not-in-list", "a", "present"),
  ];

  const stats = buildSessionAttendanceStats(members, sessions, records);

  assert.equal(stats.length, 1);
  assert.equal(stats[0].presentCount, 1);
});

test("team percentage spans every closed session in the season", () => {
  const members = [member("a"), member("b")];
  const sessions = [session("s1"), session("s2")];
  const records = [
    record("s1", "a", "present"),
    record("s1", "b", "present"),
    record("s2", "a", "present"),
    record("s2", "b", "absent_unexcused"),
  ];

  // 3 attended out of 4 expected slots
  assert.equal(getTeamAttendancePercentage(members, sessions, records, SEASON), 75);
});

test("open sessions and other seasons are excluded from the team percentage", () => {
  const members = [member("a")];
  const sessions = [
    session("closed"),
    session("open", { status: "open" }),
    { ...session("other"), season: "2024-2025" },
  ];
  const records = [
    record("closed", "a", "present"),
    record("open", "a", "absent_unexcused"),
    record("other", "a", "absent_unexcused"),
  ];

  assert.equal(getTeamAttendancePercentage(members, sessions, records, SEASON), 100);
});

test("the trend compares this month against the previous one", () => {
  const members = [member("a")];
  const sessions = [
    session("nov", { date: "2025-11-05" }),
    session("oct", { date: "2025-10-05" }),
  ];
  const records = [
    record("nov", "a", "present"),
    record("oct", "a", "absent_unexcused"),
  ];

  const trend = getTeamAttendanceTrend(
    members,
    sessions,
    records,
    SEASON,
    new Date(2025, 10, 20), // November 2025
  );

  assert.equal(trend.current, 100);
  assert.equal(trend.previous, 0);
  assert.equal(trend.deltaPoints, 100);
});

test("dancer summaries tally excused and unexcused absences per member", () => {
  const members = [member("a"), member("b")];
  const records = [
    { ...record("s1", "a", "absent_excused"), session: session("s1") },
    { ...record("s2", "a", "absent_excused"), session: session("s2") },
    { ...record("s3", "a", "absent_unexcused"), session: session("s3") },
    { ...record("s1", "b", "present"), session: session("s1") },
  ];

  const summaries = summarizeDancerAttendance(members, records, SEASON);
  const a = summaries.find((s) => s.memberId === "a");
  const b = summaries.find((s) => s.memberId === "b");

  assert.equal(a.excusedAbsences, 2);
  assert.equal(a.unexcusedAbsences, 1);
  assert.equal(a.excusedAbsenceTier, "approaching");
  assert.equal(b.excusedAbsences, 0);
  assert.equal(b.excusedAbsenceTier, "none");
});

test("exec meetings do not count toward dancer absence summaries", () => {
  const members = [member("a")];
  const records = [
    {
      ...record("exec", "a", "absent_unexcused"),
      session: session("exec", { type: "exec meeting" }),
    },
  ];

  const summaries = summarizeDancerAttendance(members, records, SEASON);

  assert.equal(summaries[0].unexcusedAbsences, 0);
});
