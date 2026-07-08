import Link from "next/link";
import type { DancerAttendanceSummary } from "@/lib/attendance-stats";

type AttendanceAlertPanelsProps = {
  unexcusedFlags: DancerAttendanceSummary[];
  excusedWarnings: DancerAttendanceSummary[];
  excusedPolicyAlerts: DancerAttendanceSummary[];
  season: string;
};

function DancerAlertList({
  dancers,
  countLabel,
}: {
  dancers: DancerAttendanceSummary[];
  countLabel: (dancer: DancerAttendanceSummary) => string;
}) {
  if (dancers.length === 0) {
    return <p className="mt-4 text-sm opacity-80">No dancers in this alert group.</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {dancers.map((dancer) => (
        <li key={dancer.memberId}>
          <Link
            href={`/attendance/members/${dancer.memberId}`}
            className="text-sm font-medium underline-offset-2 hover:underline"
          >
            {dancer.name}
          </Link>
          <span className="ml-2 text-xs opacity-80">{countLabel(dancer)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AttendanceAlertPanels({
  unexcusedFlags,
  excusedWarnings,
  excusedPolicyAlerts,
  season,
}: AttendanceAlertPanelsProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm">
        <h2 className="text-lg font-semibold">Unexcused absences</h2>
        <p className="mt-1 text-sm opacity-80">
          Any unexcused absence is an immediate flag — no exceptions ({season}).
        </p>
        <DancerAlertList
          dancers={unexcusedFlags}
          countLabel={(dancer) =>
            `${dancer.unexcusedAbsences} unexcused absence${dancer.unexcusedAbsences === 1 ? "" : "s"}`
          }
        />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <h2 className="text-lg font-semibold">Approaching excused absence limit</h2>
        <p className="mt-1 text-sm opacity-80">
          Dancers with 2 excused absences this semester ({season}) — one more hits the
          policy limit.
        </p>
        <DancerAlertList
          dancers={excusedWarnings}
          countLabel={(dancer) => `${dancer.excusedAbsences} excused absences`}
        />
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm">
        <h2 className="text-lg font-semibold">At the excused absence limit</h2>
        <p className="mt-1 text-sm opacity-80">
          Dancers with 3 or more excused absences this semester ({season}).
        </p>
        <DancerAlertList
          dancers={excusedPolicyAlerts}
          countLabel={(dancer) => `${dancer.excusedAbsences} excused absences`}
        />
      </div>
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
