import Link from "next/link";
import {
  AttendanceSeasonLabel,
  AttendanceTeamSummary,
} from "@/components/attendance-alert-panels";
import AttendanceAlertRow from "@/components/attendance-alert-row";
import AttendanceTrendsSection from "@/components/attendance-trends-section";
import { getUserMember } from "@/lib/get-user-member";
import type { PracticeSession } from "@/lib/attendance";
import {
  buildAttendanceAlertGroups,
  buildSessionAttendanceStats,
  summarizeDancerAttendance,
  getTeamAttendancePercentage,
  getTeamAttendanceTrend,
  type AttendanceStatRecordWithSession,
  type MemberSummary,
} from "@/lib/attendance-stats";
import { hasWriteAccess } from "@/lib/rbac";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type AttendancePageProps = {
  searchParams: Promise<{ created?: string; season?: string }>;
};

const PAGE_SIZE = 1000;

// Only the columns the statistics read. Selecting * here pulled every free-text
// column (excuses, override reasons) for every record in the season.
const STAT_COLUMNS = `
  session_id,
  member_id,
  respondent_email,
  attendance_status,
  practice_video_status,
  auto_flagged,
  session:practice_sessions!inner (
    id,
    season,
    session_date,
    type,
    status
  )
`;

// How many pages to request at once past the first.
const PAGE_BATCH = 4;

// PostgREST caps unpaginated selects at 1000 rows. A full season of attendance
// records comfortably exceeds that, so without paging the oldest sessions in
// the season would silently drop out of every stat on this page.
//
// The pages used to be fetched one at a time, each waiting on the last. They
// are now requested in parallel batches. Batching rather than deriving the page
// count from an exact count keeps this correct without asking Postgres to count
// the whole table on every page load - and an undercount would silently drop
// records, which is the exact bug the paging exists to prevent.
async function fetchAllAttendanceRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  season: string,
) {
  // response_timestamp alone is not a total order - ties would let a record
  // land in two ranges (or neither) once the pages stop being sequential, so
  // id breaks the tie and makes the ranges partition cleanly.
  const page = (offset: number) =>
    supabase
      .from("attendance_records")
      .select(STAT_COLUMNS)
      .eq("practice_sessions.season", season)
      .order("response_timestamp", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

  const all: AttendanceStatRecordWithSession[] = [];

  // Most seasons fit in a single page, so the first one goes out alone rather
  // than firing a whole batch of requests that would come back empty.
  const first = await page(0);

  if (first.error) {
    return { data: all, error: first.error };
  }

  const firstRows = (first.data ?? []) as unknown as AttendanceStatRecordWithSession[];
  all.push(...firstRows);

  let nextPage = 1;
  let mayHaveMore = firstRows.length === PAGE_SIZE;

  while (mayHaveMore) {
    const batch = await Promise.all(
      Array.from({ length: PAGE_BATCH }, (_, index) =>
        page((nextPage + index) * PAGE_SIZE),
      ),
    );

    mayHaveMore = false;

    for (const result of batch) {
      if (result.error) {
        return { data: all, error: result.error };
      }

      const rows = (result.data ?? []) as unknown as AttendanceStatRecordWithSession[];
      all.push(...rows);
      // Only a full final page means another batch could still be waiting.
      mayHaveMore = rows.length === PAGE_SIZE;
    }

    nextPage += PAGE_BATCH;
  }

  return { data: all, error: null };
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const showCreated = params.created === "1";
  const viewingSeason = await getViewingSeason(params.season);
  const season = viewingSeason.label;

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  // Auto-flagging normally happens via a pg_cron schedule. Opportunistically call the
  // same close function here too, so a dashboard visit closes any expired sessions
  // even if the cron job didn't run — cheap and safe to call repeatedly.
  await supabase.rpc("close_expired_practice_sessions");

  const canWrite =
    hasWriteAccess(userMember?.exec_title ?? null, "attendance") && viewingSeason.is_active;

  const [
    { data: sessionData, error: sessionError },
    { data: recordData, error: recordError },
    { data: memberData, error: memberError },
  ] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("*")
      .eq("season", season)
      .order("session_date", { ascending: false })
      .order("session_time", { ascending: false }),
    fetchAllAttendanceRecords(supabase, season),
    supabase
      .from("members")
      .select("id, first_name, last_name, email, roles")
      .eq("status", "active")
      .order("last_name", { ascending: true }),
  ]);

  const sessions = (sessionData ?? []) as PracticeSession[];
  const records = recordData;
  const members = (memberData ?? []) as MemberSummary[];
  const dancerMembers = members.filter((member) => member.roles.includes("dancer"));

  const sessionStats = buildSessionAttendanceStats(members, sessions, records);
  const dancerSummaries = summarizeDancerAttendance(dancerMembers, records, season);
  const alertGroups = buildAttendanceAlertGroups(dancerSummaries);
  const teamAttendancePercentage = getTeamAttendancePercentage(
    members,
    sessions,
    records,
    season,
  );
  const teamAttendanceTrend = getTeamAttendanceTrend(members, sessions, records, season);

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
              <AttendanceSeasonLabel season={season} />
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
            trendDeltaPoints={teamAttendanceTrend.deltaPoints}
          />

          <AttendanceAlertRow groups={alertGroups} />

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
            <AttendanceTrendsSection stats={sessionStats} />
          )}
        </>
      )}
    </div>
  );
}
