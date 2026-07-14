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
