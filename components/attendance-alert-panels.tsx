import Link from "next/link";
import type { DancerAttendanceSummary } from "@/lib/attendance-stats";

type AttendanceAlertPanelsProps = {
  approachingUnexcusedLimit: DancerAttendanceSummary[];
  season: string;
};

export default function AttendanceAlertPanels({
  approachingUnexcusedLimit,
  season,
}: AttendanceAlertPanelsProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm">
      <h2 className="text-lg font-semibold">Approaching unexcused absence limit</h2>
      <p className="mt-1 text-sm opacity-80">
        Dancers with 2 or more unexcused absences this semester ({season}).
      </p>

      {approachingUnexcusedLimit.length === 0 ? (
        <p className="mt-4 text-sm opacity-80">No dancers in this alert group.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {approachingUnexcusedLimit.map((dancer) => (
            <li key={dancer.memberId}>
              <Link
                href={`/attendance/members/${dancer.memberId}`}
                className="text-sm font-medium underline-offset-2 hover:underline"
              >
                {dancer.name}
              </Link>
              <span className="ml-2 text-xs opacity-80">
                {dancer.unexcusedAbsences} unexcused absence
                {dancer.unexcusedAbsences === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AttendanceTeamSummary({
  teamAttendancePercentage,
  season,
}: {
  teamAttendancePercentage: number | null;
  season: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Overall team attendance
      </p>
      <p className="mt-2 text-4xl font-semibold text-zinc-900">
        {teamAttendancePercentage === null ? "—" : `${teamAttendancePercentage}%`}
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        Present and late records across closed sessions in {season}.
      </p>
    </div>
  );
}

export function AttendanceSeasonLabel({ season }: { season: string }) {
  return (
    <p className="text-sm text-zinc-500">
      Semester stats use the {season} season.
    </p>
  );
}
