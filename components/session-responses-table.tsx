import Link from "next/link";
import AttendanceRecordOverride from "@/components/attendance-record-override";
import {
  formatAttendanceStatus,
  formatResponseTimestamp,
  getAttendanceStatusStyle,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/lib/attendance";

export type SessionResponseRow = AttendanceRecord & {
  memberLinkId: string | null;
};

type SessionResponsesTableProps = {
  responses: SessionResponseRow[];
  canOverride: boolean;
};

function OverrideDetails({
  originalStatus,
  overrideReason,
}: {
  originalStatus: AttendanceStatus;
  overrideReason: string;
}) {
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p>
        <span className="font-medium">Original:</span> {formatAttendanceStatus(originalStatus)}
      </p>
      <p className="mt-1">
        <span className="font-medium">Override reason:</span> {overrideReason}
      </p>
    </div>
  );
}

export default function SessionResponsesTable({
  responses,
  canOverride,
}: SessionResponsesTableProps) {
  if (responses.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Responses received</h2>
        <p className="mt-2 text-sm text-zinc-600">No form responses yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Responses received</h2>
      </div>

      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Dancer
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
              {canOverride ? (
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {responses.map((response) => (
              <tr key={response.id} className="align-top">
                <td className="px-6 py-4 text-sm text-zinc-900">
                  {response.memberLinkId ? (
                    <Link
                      href={`/attendance/members/${response.memberLinkId}`}
                      className="font-medium text-[#990000] hover:underline"
                    >
                      {response.respondent_name}
                    </Link>
                  ) : (
                    response.respondent_name
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getAttendanceStatusStyle(response.attendance_status)}`}
                  >
                    {formatAttendanceStatus(response.attendance_status)}
                  </span>
                  {response.overridden && response.original_attendance_status ? (
                    <OverrideDetails
                      originalStatus={response.original_attendance_status}
                      overrideReason={response.override_reason ?? ""}
                    />
                  ) : null}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-700">
                  {formatResponseTimestamp(response.response_timestamp)}
                </td>
                <td className="max-w-xs px-6 py-4 text-sm text-zinc-700">
                  {response.excuse_text || "—"}
                </td>
                {canOverride ? (
                  <td className="px-6 py-4 text-sm">
                    <AttendanceRecordOverride
                      recordId={response.id}
                      currentStatus={response.attendance_status}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-zinc-200 md:hidden">
        {responses.map((response) => (
          <div key={response.id} className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              {response.memberLinkId ? (
                <Link
                  href={`/attendance/members/${response.memberLinkId}`}
                  className="text-base font-medium text-[#990000] hover:underline"
                >
                  {response.respondent_name}
                </Link>
              ) : (
                <p className="text-base font-medium text-zinc-900">{response.respondent_name}</p>
              )}
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getAttendanceStatusStyle(response.attendance_status)}`}
              >
                {formatAttendanceStatus(response.attendance_status)}
              </span>
            </div>
            <p className="text-sm text-zinc-600">
              {formatResponseTimestamp(response.response_timestamp)}
            </p>
            {response.excuse_text ? (
              <p className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Excuse:</span> {response.excuse_text}
              </p>
            ) : null}
            {response.overridden && response.original_attendance_status ? (
              <OverrideDetails
                originalStatus={response.original_attendance_status}
                overrideReason={response.override_reason ?? ""}
              />
            ) : null}
            {canOverride ? (
              <AttendanceRecordOverride
                recordId={response.id}
                currentStatus={response.attendance_status}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
