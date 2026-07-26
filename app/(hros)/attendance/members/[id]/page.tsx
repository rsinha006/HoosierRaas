import Link from "next/link";
import { notFound } from "next/navigation";
import DancerAttendanceHistory, {
  buildMemberAttendanceRecords,
} from "@/components/dancer-attendance-history";
import {
  ATTENDANCE_PAGE_SIZE,
  dedupeById,
  escapeLikePattern,
  fetchAllPages,
} from "@/lib/attendance-records";
import { summarizeDancerAttendance, type AttendanceRecordWithSession } from "@/lib/attendance-stats";
import { formatMemberName, type Member } from "@/lib/members";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type MemberAttendancePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
};

const RECORD_COLUMNS = `
  *,
  session:practice_sessions!inner (
    id,
    season,
    session_date,
    session_time,
    type,
    status
  )
`;

/**
 * This page used to pull every attendance record in the season and filter down
 * to one member in memory. PostgREST truncates that at 1000 rows without
 * saying so, so on a real season the page showed a slice of the team's most
 * recent records and undercounted the member's absences - the dashboard, which
 * pages properly, reported a different number for the same person.
 *
 * A record is tied to a member by member_id, or by the email they typed if the
 * roster never matched them, so both are queried and merged. Filtering in the
 * database rather than in memory keeps each read far below the page limit;
 * paging is kept as a safety net.
 */
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function fetchMemberAttendanceRecords(
  supabase: SupabaseServerClient,
  season: string,
  memberId: string,
  email: string,
) {
  const seasonRecords = (from: number, to: number) =>
    supabase
      .from("attendance_records")
      .select(RECORD_COLUMNS)
      .eq("practice_sessions.season", season)
      // response_timestamp alone is not a total order - id breaks ties so the
      // ranges partition cleanly.
      .order("response_timestamp", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

  const byMemberId = fetchAllPages<AttendanceRecordWithSession>(async (from, to) => {
    const { data, error } = await seasonRecords(from, to).eq("member_id", memberId);
    return { data: (data ?? []) as unknown as AttendanceRecordWithSession[], error };
  }, ATTENDANCE_PAGE_SIZE);

  // ilike so a differently-cased email still matches, escaped so % or _ in an
  // address cannot widen the match to other people's records.
  const byEmail = fetchAllPages<AttendanceRecordWithSession>(async (from, to) => {
    const { data, error } = await seasonRecords(from, to).ilike(
      "respondent_email",
      escapeLikePattern(email),
    );
    return { data: (data ?? []) as unknown as AttendanceRecordWithSession[], error };
  }, ATTENDANCE_PAGE_SIZE);

  return Promise.all([byMemberId, byEmail]);
}

export default async function MemberAttendancePage({
  params,
  searchParams,
}: MemberAttendancePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { label: season } = await getViewingSeason(query.season);
  const supabase = await createClient();

  const { data: memberData } = await supabase
    .from("members")
    .select("id, first_name, last_name, email, roles, status")
    .eq("id", id)
    .maybeSingle();

  if (!memberData) {
    notFound();
  }

  const member = memberData as Member;

  // The member's email is needed to build the query, so this cannot go out in
  // parallel with the lookup above.
  const [byMemberId, byEmail] = await fetchMemberAttendanceRecords(
    supabase,
    season,
    member.id,
    member.email,
  );

  const records = dedupeById(byMemberId.data, byEmail.data);
  const recordError = byMemberId.error ?? byEmail.error;
  const memberRecords = buildMemberAttendanceRecords(member.id, member.email, records);
  const summary = summarizeDancerAttendance(
    [
      {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        roles: member.roles,
      },
    ],
    records,
    season,
  )[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/attendance"
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to attendance
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
          {formatMemberName(member)}
        </h1>
        <p className="mt-2 text-zinc-600">Full attendance history for this team member.</p>

        {/* A partial read here reads as "this dancer has no absences", which is
            the worst possible way for this page to fail. Say so instead. */}
        {recordError ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">
              Could not load this member&apos;s full attendance history
            </p>
            <p className="mt-1">
              The counts below may be incomplete. {recordError.message}
            </p>
          </div>
        ) : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-zinc-500">Excused absences ({season})</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {summary?.excusedAbsences ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Unexcused absences ({season})</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {summary?.unexcusedAbsences ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Total records</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">{memberRecords.length}</dd>
          </div>
        </dl>
      </div>

      <DancerAttendanceHistory
        memberName={formatMemberName(member)}
        records={memberRecords}
      />
    </div>
  );
}
