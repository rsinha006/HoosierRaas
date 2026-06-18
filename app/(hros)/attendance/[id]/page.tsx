import Link from "next/link";
import { notFound } from "next/navigation";
import CloseSessionButton from "@/components/close-session-button";
import SessionNonResponders, {
  type NonResponderRow,
} from "@/components/session-non-responders";
import SessionResponsesTable, {
  type SessionResponseRow,
} from "@/components/session-responses-table";
import ShareableSessionLink from "@/components/shareable-session-link";
import { getUserMember } from "@/lib/get-user-member";
import { formatMemberName } from "@/lib/members";
import {
  getAudienceLabel,
  formatSessionTime,
  formatSessionType,
  type AttendanceRecord,
  type PracticeSession,
} from "@/lib/attendance";
import {
  getNonResponderMembers,
  getSessionResponseRate,
  getVoluntaryResponses,
  type MemberSummary,
} from "@/lib/attendance-stats";
import { hasWriteAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

type PracticeSessionDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatClosesAt(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default async function PracticeSessionDetailPage({
  params,
  searchParams,
}: PracticeSessionDetailPageProps) {
  const { id } = await params;
  const { created } = await searchParams;
  const showCreated = created === "1";

  const supabase = await createClient();
  const userMember = await getUserMember();
  const canWrite = hasWriteAccess(userMember?.exec_title ?? null, "attendance");

  const [{ data: sessionData, error }, { data: attendanceData }, { data: memberData }] =
    await Promise.all([
      supabase.from("practice_sessions").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("attendance_records")
        .select("*")
        .eq("session_id", id)
        .order("respondent_name", { ascending: true }),
      supabase
        .from("members")
        .select("id, first_name, last_name, email, roles")
        .eq("status", "active")
        .order("last_name", { ascending: true }),
    ]);

  if (error || !sessionData) {
    notFound();
  }

  const session = sessionData as PracticeSession;
  const records = (attendanceData ?? []) as AttendanceRecord[];
  const members = (memberData ?? []) as MemberSummary[];
  const audienceLabel = getAudienceLabel(session.type);
  const responseRate = getSessionResponseRate(members, session, records);
  const voluntaryResponses = getVoluntaryResponses(records);

  const responses: SessionResponseRow[] = voluntaryResponses.map((record) => ({
    ...record,
    memberLinkId: record.member_id,
  }));

  let nonResponders: NonResponderRow[];

  if (session.status === "closed") {
    nonResponders = records
      .filter((record) => record.auto_flagged)
      .map((record) => ({
        id: record.id,
        memberId: record.member_id,
        name: record.respondent_name,
        attendanceRecordId: record.id,
        attendanceStatus: record.attendance_status,
        overridden: record.overridden,
        originalAttendanceStatus: record.original_attendance_status,
        overrideReason: record.override_reason,
      }));
  } else {
    nonResponders = getNonResponderMembers(members, session.type, records).map((member) => ({
      id: member.id,
      memberId: member.id,
      name: formatMemberName(member),
    }));
  }

  return (
    <div className="space-y-6">
      {showCreated ? (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800"
        >
          <p className="font-medium">Practice session created successfully.</p>
          <p className="mt-1 text-sm">
            Share the link below with your team to collect attendance responses.
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/attendance"
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to attendance
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {formatSessionType(session.type)}
            </h1>
            <p className="mt-2 text-zinc-600">
              {formatSessionDate(session.session_date)} at{" "}
              {formatSessionTime(session.session_time)}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              session.status === "open"
                ? "bg-green-100 text-green-800"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {session.status === "open" ? "Open" : "Closed"}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-zinc-500">Response rate</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">{responseRate.label}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Form responses</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {responseRate.responseCount}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">Response window closes</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3">
              <span className="text-sm text-zinc-900">
                {formatClosesAt(session.response_window_closes_at)}
              </span>
              {canWrite && session.status === "open" ? (
                <CloseSessionButton sessionId={session.id} />
              ) : null}
            </dd>
          </div>
        </dl>
      </div>

      {session.status === "open" ? (
        <ShareableSessionLink shareableToken={session.shareable_token} prominent />
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-zinc-600">
          <p className="text-sm">
            This session is closed. The shareable link is no longer accepting responses.
          </p>
        </div>
      )}

      <SessionResponsesTable responses={responses} canOverride={canWrite} />

      <SessionNonResponders
        nonResponders={nonResponders}
        audienceLabel={audienceLabel}
        sessionClosed={session.status === "closed"}
        canOverride={canWrite}
      />
    </div>
  );
}
