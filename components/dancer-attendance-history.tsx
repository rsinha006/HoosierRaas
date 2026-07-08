import Link from "next/link";
import {
  formatAttendanceStatus,
  formatResponseTimestamp,
  formatSessionTime,
  formatSessionType,
  getAttendanceStatusStyle,
  getPracticeVideoStatusLabel,
} from "@/lib/attendance";
import type { AttendanceRecordWithSession } from "@/lib/attendance-stats";

type DancerAttendanceHistoryProps = {
  memberName: string;
  records: AttendanceRecordWithSession[];
};

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export default function DancerAttendanceHistory({
  memberName,
  records,
}: DancerAttendanceHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-zinc-600">No attendance records found for {memberName}.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Attendance history</h2>
      </div>

      <div className="hidden lg:block">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Response time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Excuse
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Override
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {records.map((record) => (
              <tr key={record.id} className="align-top">
                <td className="px-6 py-4 text-sm text-zinc-900">
                  <Link
                    href={`/attendance/${record.session.id}`}
                    className="font-medium text-[#990000] hover:underline"
                  >
                    {formatSessionType(record.session.type)}
                  </Link>
                  <p className="mt-1 text-zinc-600">
                    {formatSessionDate(record.session.session_date)} at{" "}
                    {formatSessionTime(record.session.session_time)}
                  </p>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getAttendanceStatusStyle(record.attendance_status)}`}
                  >
                    {formatAttendanceStatus(record.attendance_status)}
                  </span>
                  {record.auto_flagged ? (
                    <p className="mt-1 text-xs text-zinc-500">Auto-flagged non-responder</p>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-700">
                  {formatResponseTimestamp(record.response_timestamp)}
                </td>
                <td className="max-w-sm px-6 py-4 text-sm text-zinc-700">
                  {record.excuse_text || "—"}
                  {record.practice_video_status ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Video: {getPracticeVideoStatusLabel(record.practice_video_status)}
                    </p>
                  ) : null}
                  {record.practice_video_excuse ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Video excuse: {record.practice_video_excuse}
                    </p>
                  ) : null}
                </td>
                <td className="max-w-sm px-6 py-4 text-sm text-zinc-700">
                  {record.overridden && record.original_attendance_status ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <p>
                        Original: {formatAttendanceStatus(record.original_attendance_status)}
                      </p>
                      <p className="mt-1">Reason: {record.override_reason}</p>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-zinc-200 lg:hidden">
        {records.map((record) => (
          <div key={record.id} className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/attendance/${record.session.id}`}
                  className="font-medium text-[#990000] hover:underline"
                >
                  {formatSessionType(record.session.type)}
                </Link>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatSessionDate(record.session.session_date)} at{" "}
                  {formatSessionTime(record.session.session_time)}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getAttendanceStatusStyle(record.attendance_status)}`}
              >
                {formatAttendanceStatus(record.attendance_status)}
              </span>
            </div>
            <p className="text-sm text-zinc-700">
              {formatResponseTimestamp(record.response_timestamp)}
            </p>
            {record.excuse_text ? (
              <p className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Excuse:</span> {record.excuse_text}
              </p>
            ) : null}
            {record.practice_video_status ? (
              <p className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Video:</span>{" "}
                {getPracticeVideoStatusLabel(record.practice_video_status)}
              </p>
            ) : null}
            {record.practice_video_excuse ? (
              <p className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Video excuse:</span>{" "}
                {record.practice_video_excuse}
              </p>
            ) : null}
            {record.auto_flagged ? (
              <p className="text-xs text-zinc-500">Auto-flagged non-responder</p>
            ) : null}
            {record.overridden && record.original_attendance_status ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p>
                  Original: {formatAttendanceStatus(record.original_attendance_status)}
                </p>
                <p className="mt-1">Reason: {record.override_reason}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function buildMemberAttendanceRecords(
  memberId: string,
  memberEmail: string,
  records: AttendanceRecordWithSession[],
) {
  const normalizedEmail = memberEmail.toLowerCase();

  return records
    .filter(
      (record) =>
        record.member_id === memberId ||
        record.respondent_email.toLowerCase() === normalizedEmail,
    )
    .sort((left, right) => {
      const leftDate = `${left.session.session_date}T${left.session.session_time}`;
      const rightDate = `${right.session.session_date}T${right.session.session_time}`;
      return rightDate.localeCompare(leftDate);
    });
}
