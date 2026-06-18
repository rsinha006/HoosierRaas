import Link from "next/link";
import { getCurrentSeason } from "@/lib/finance";
import type { DancerAttendanceSummary } from "@/lib/attendance-stats";

type AttendanceAlertPanelsProps = {
  approachingLimit: DancerAttendanceSummary[];
  unexcusedAbsences: DancerAttendanceSummary[];
  season: string;
};

function AlertList({
  title,
  description,
  items,
  tone,
}: {
  title: string;
  description: string;
  items: DancerAttendanceSummary[];
  tone: "amber" | "red";
}) {
  const styles =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-red-200 bg-red-50 text-red-950";

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${styles}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm opacity-80">{description}</p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm opacity-80">No dancers in this alert group.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((dancer) => (
            <li key={dancer.memberId}>
              <Link
                href={`/attendance/members/${dancer.memberId}`}
                className="text-sm font-medium underline-offset-2 hover:underline"
              >
                {dancer.name}
              </Link>
              {tone === "amber" ? (
                <span className="ml-2 text-xs opacity-80">
                  {dancer.excusedAbsences} excused absences
                </span>
              ) : (
                <span className="ml-2 text-xs opacity-80">
                  {dancer.unexcusedAbsences} unexcused absence
                  {dancer.unexcusedAbsences === 1 ? "" : "s"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AttendanceAlertPanels({
  approachingLimit,
  unexcusedAbsences,
  season,
}: AttendanceAlertPanelsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AlertList
        title="Approaching excused absence limit"
        description={`Dancers with 2 or more excused absences this semester (${season}).`}
        items={approachingLimit}
        tone="amber"
      />
      <AlertList
        title="Unexcused absences"
        description={`Dancers with any unexcused absence this semester (${season}).`}
        items={unexcusedAbsences}
        tone="red"
      />
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

export function AttendanceSeasonLabel() {
  return (
    <p className="text-sm text-zinc-500">
      Semester stats use the current academic season ({getCurrentSeason()}).
    </p>
  );
}
