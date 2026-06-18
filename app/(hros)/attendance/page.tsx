import Link from "next/link";
import AttendanceAlertPanels, {
  AttendanceSeasonLabel,
  AttendanceTeamSummary,
} from "@/components/attendance-alert-panels";
import AttendanceSessionsTable from "@/components/attendance-sessions-table";
import { getUserMember } from "@/lib/get-user-member";
import type { AttendanceRecord, PracticeSession } from "@/lib/attendance";
import {
  buildSessionRates,
  summarizeDancerAttendance,
  getTeamAttendancePercentage,
  type AttendanceRecordWithSession,
  type MemberSummary,
} from "@/lib/attendance-stats";
import { getCurrentSeason } from "@/lib/finance";
import { hasWriteAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

type AttendancePageProps = {
  searchParams: Promise<{ created?: string }>;
};

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const showCreated = params.created === "1";
  const season = getCurrentSeason();

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canWrite = hasWriteAccess(userMember?.exec_title ?? null, "attendance");

  const [
    { data: sessionData, error: sessionError },
    { data: recordData, error: recordError },
    { data: memberData, error: memberError },
  ] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .order("session_time", { ascending: false }),
    supabase
      .from("attendance_records")
      .select(
        `
        *,
        session:practice_sessions (
          id,
          session_date,
          session_time,
          type,
          status
        )
      `,
      )
      .order("response_timestamp", { ascending: false }),
    supabase
      .from("members")
      .select("id, first_name, last_name, email, roles")
      .eq("status", "active")
      .order("last_name", { ascending: true }),
  ]);

  const sessions = (sessionData ?? []) as PracticeSession[];
  const records = (recordData ?? []) as AttendanceRecordWithSession[];
  const members = (memberData ?? []) as MemberSummary[];
  const dancerMembers = members.filter((member) => member.roles.includes("dancer"));
  const plainRecords = records as AttendanceRecord[];

  const sessionRates = buildSessionRates(members, sessions, plainRecords);
  const dancerSummaries = summarizeDancerAttendance(dancerMembers, records, season);
  const approachingLimit = dancerSummaries.filter(
    (summary) => summary.approachingExcusedLimit,
  );
  const unexcusedAbsences = dancerSummaries.filter(
    (summary) => summary.hasUnexcusedAbsence,
  );
  const teamAttendancePercentage = getTeamAttendancePercentage(
    members,
    sessions,
    plainRecords,
    season,
  );

  const error = sessionError ?? recordError ?? memberError;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Attendance</h1>
            <p className="mt-2 text-zinc-600">
              Practice sessions, response tracking, and team attendance insights.
            </p>
            <div className="mt-3">
              <AttendanceSeasonLabel />
            </div>
          </div>

          {canWrite ? (
            <Link
              href="/attendance/new"
              className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
            >
              New session
            </Link>
          ) : null}
        </div>
      </div>

      {showCreated ? (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800"
        >
          <p className="font-medium">Practice session created successfully.</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load attendance dashboard</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      ) : (
        <>
          <AttendanceTeamSummary
            teamAttendancePercentage={teamAttendancePercentage}
            season={season}
          />

          <AttendanceAlertPanels
            approachingLimit={approachingLimit}
            unexcusedAbsences={unexcusedAbsences}
            season={season}
          />

          {sessions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
              <p className="text-zinc-600">No practice sessions yet.</p>
              {canWrite ? (
                <Link
                  href="/attendance/new"
                  className="mt-4 inline-block text-sm font-medium text-[#990000] hover:underline"
                >
                  Create your first session
                </Link>
              ) : null}
            </div>
          ) : (
            <AttendanceSessionsTable sessions={sessionRates} />
          )}
        </>
      )}
    </div>
  );
}
