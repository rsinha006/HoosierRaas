import Link from "next/link";
import AttendanceRecordOverride from "@/components/attendance-record-override";
import {
  formatAttendanceStatus,
  getAttendanceStatusStyle,
  type AttendanceStatus,
} from "@/lib/attendance";

export type NonResponderRow = {
  id: string;
  memberId: string | null;
  name: string;
  attendanceRecordId?: string;
  attendanceStatus?: AttendanceStatus;
  overridden?: boolean;
  originalAttendanceStatus?: AttendanceStatus | null;
  overrideReason?: string | null;
};

type SessionNonRespondersProps = {
  nonResponders: NonResponderRow[];
  audienceLabel: string;
  sessionClosed: boolean;
  canOverride: boolean;
};

export default function SessionNonResponders({
  nonResponders,
  audienceLabel,
  sessionClosed,
  canOverride,
}: SessionNonRespondersProps) {
  if (nonResponders.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Non-responders</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Every expected {audienceLabel} has submitted a response.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-900">Non-responders</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {sessionClosed
          ? `Active ${audienceLabel} who did not submit before this session closed.`
          : `Active ${audienceLabel} who have not submitted yet.`}
      </p>

      <ul className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
        {nonResponders.map((person) => (
          <li key={person.id} className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {person.memberId ? (
                <Link
                  href={`/attendance/members/${person.memberId}`}
                  className="text-sm font-medium text-[#990000] hover:underline"
                >
                  {person.name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-zinc-900">{person.name}</span>
              )}

              {sessionClosed && person.attendanceStatus ? (
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getAttendanceStatusStyle(person.attendanceStatus)}`}
                >
                  {formatAttendanceStatus(person.attendanceStatus)}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                  No submission
                </span>
              )}
            </div>

            {person.overridden && person.originalAttendanceStatus ? (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p>
                  <span className="font-medium">Original:</span>{" "}
                  {formatAttendanceStatus(person.originalAttendanceStatus)}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Override reason:</span>{" "}
                  {person.overrideReason}
                </p>
              </div>
            ) : null}

            {canOverride && person.attendanceRecordId && person.attendanceStatus ? (
              <div className="mt-3">
                <AttendanceRecordOverride
                  recordId={person.attendanceRecordId}
                  currentStatus={person.attendanceStatus}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
