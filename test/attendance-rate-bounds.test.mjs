import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSessionAttendanceStats,
  getTeamAttendancePercentage,
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
 * Scoping the roster to season_memberships shrank the denominator without
 * touching the numerator, which still counted every record on the session.
 * On this database that put "Overall team attendance" at 822%: two dancers on
 * the roster, against records left behind by thirty who are not.
 *
 * Numerator and denominator have to come from the same population. Records
 * from anyone the session did not apply to are not counted, whether they are
 * off the roster, unattached to a member, or in the wrong audience.
 */
test("responses from people off the roster cannot push a session over 100%", () => {
  const members = [member("a"), member("b")];
  const sessions = [session("s1")];
  const records = [
    record("s1", "a", "present"),
    record("s1", "b", "present"),
    record("s1", "ghost1", "present"),
    record("s1", "ghost2", "present"),
  ];

  const [stat] = buildSessionAttendanceStats(members, sessions, records);

  assert.equal(stat.presentCount, 2);
  assert.equal(stat.expectedCount, 2);
  assert.equal(stat.attendancePercent, 100);
});

test("a record with no member attached does not count toward the rate", () => {
  const members = [member("a")];
  const sessions = [session("s1")];
  const records = [record("s1", "a", "present"), record("s1", null, "present")];

  const [stat] = buildSessionAttendanceStats(members, sessions, records);

  assert.equal(stat.presentCount, 1);
  assert.equal(stat.attendancePercent, 100);
});

test("a dancer answering an exec meeting does not count toward it", () => {
  const members = [member("dancer", ["dancer"]), member("exec", ["exec"])];
  const sessions = [session("s1", { type: "exec meeting" })];
  const records = [
    record("s1", "exec", "present"),
    record("s1", "dancer", "present"),
  ];

  const [stat] = buildSessionAttendanceStats(members, sessions, records);

  assert.equal(stat.expectedCount, 1);
  assert.equal(stat.presentCount, 1);
  assert.equal(stat.attendancePercent, 100);
});

test("video submission counts are bounded by the roster too", () => {
  const members = [member("a")];
  // A Thursday, so the video question applies.
  const sessions = [session("s1", { date: "2025-10-09" })];
  const records = [
    record("s1", "a", "present", { practice_video_status: "on_time" }),
    record("s1", "ghost", "present", { practice_video_status: "on_time" }),
  ];

  const [stat] = buildSessionAttendanceStats(members, sessions, records);

  assert.ok(stat.video, "expected the video question to apply on a Thursday");
  assert.equal(stat.video.submittedCount, 1);
  assert.equal(stat.video.percent, 100);
});

/** The headline figure, which is where the 822% actually showed. */
test("the overall team percentage is bounded by the roster", () => {
  const members = [member("a"), member("b")];
  const sessions = [session("s1"), session("s2")];
  const records = [
    record("s1", "a", "present"),
    record("s1", "b", "present"),
    record("s2", "a", "present"),
    record("s2", "b", "absent_unexcused"),
    // Left behind by dancers who are not on this season's roster.
    ...Array.from({ length: 30 }, (_, index) =>
      record("s1", `ghost${index}`, "present"),
    ),
    ...Array.from({ length: 30 }, (_, index) =>
      record("s2", `ghost${index}`, "present"),
    ),
  ];

  assert.equal(getTeamAttendancePercentage(members, sessions, records, SEASON), 75);
});
