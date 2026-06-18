import Link from "next/link";
import {
  formatSessionTime,
  formatSessionType,
} from "@/lib/attendance";
import { buildSessionRates } from "@/lib/attendance-stats";

type AttendanceSessionsTableProps = {
  sessions: ReturnType<typeof buildSessionRates>;
};

function formatSessionDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export default function AttendanceSessionsTable({ sessions }: AttendanceSessionsTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-zinc-600">No practice sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Sessions</h2>
      </div>

      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Response rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {sessions.map(({ session, label, responseRatePercent }) => (
              <tr key={session.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                  <Link
                    href={`/attendance/${session.id}`}
                    className="font-medium text-[#990000] hover:underline"
                  >
                    {formatSessionDate(session.session_date)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                  {formatSessionTime(session.session_time)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                  {formatSessionType(session.type)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-700">
                  <div>{label}</div>
                  <div className="mt-1 text-xs text-zinc-500">{responseRatePercent}%</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      session.status === "open"
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {session.status === "open" ? "Open" : "Closed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-zinc-200 md:hidden">
        {sessions.map(({ session, label, responseRatePercent }) => (
          <Link
            key={session.id}
            href={`/attendance/${session.id}`}
            className="block space-y-2 px-4 py-4 hover:bg-zinc-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-[#990000]">
                  {formatSessionDate(session.session_date)}
                </p>
                <p className="text-sm text-zinc-600">
                  {formatSessionTime(session.session_time)} · {formatSessionType(session.type)}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  session.status === "open"
                    ? "bg-green-100 text-green-800"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {session.status === "open" ? "Open" : "Closed"}
              </span>
            </div>
            <p className="text-sm text-zinc-700">{label}</p>
            <p className="text-xs text-zinc-500">{responseRatePercent}% response rate</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
