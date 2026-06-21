import Link from "next/link";
import { notFound } from "next/navigation";
import DancerAttendanceHistory, {
  buildMemberAttendanceRecords,
} from "@/components/dancer-attendance-history";
import { summarizeDancerAttendance, type AttendanceRecordWithSession } from "@/lib/attendance-stats";
import { formatMemberName, type Member } from "@/lib/members";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";

type MemberAttendancePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function MemberAttendancePage({
  params,
  searchParams,
}: MemberAttendancePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { label: season } = await getViewingSeason(query.season);
  const supabase = await createClient();

  const [{ data: memberData }, { data: recordData }] = await Promise.all([
    supabase
      .from("members")
      .select("id, first_name, last_name, email, roles, status")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("attendance_records")
      .select(
        `
        *,
        session:practice_sessions!inner (
          id,
          season,
          session_date,
          session_time,
          type,
          status
        )
      `,
      )
      .eq("practice_sessions.season", season)
      .order("response_timestamp", { ascending: false }),
  ]);

  if (!memberData) {
    notFound();
  }

  const member = memberData as Member;
  const records = (recordData ?? []) as AttendanceRecordWithSession[];
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
