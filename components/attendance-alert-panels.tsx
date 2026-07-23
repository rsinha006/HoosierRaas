function TrendIndicator({ deltaPoints }: { deltaPoints: number | null }) {
  if (deltaPoints === null) {
    return null;
  }

  if (deltaPoints === 0) {
    return <p className="mt-1 text-sm font-medium text-zinc-500">→ No change from last month</p>;
  }

  const isUp = deltaPoints > 0;

  return (
    <p className={`mt-1 text-sm font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
      {isUp ? "↑" : "↓"} {Math.abs(deltaPoints)}% from last month
    </p>
  );
}

export function AttendanceTeamSummary({
  teamAttendancePercentage,
  season,
  trendDeltaPoints = null,
}: {
  teamAttendancePercentage: number | null;
  season: string;
  trendDeltaPoints?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Overall team attendance
      </p>
      <p className="mt-2 text-4xl font-semibold text-zinc-900">
        {teamAttendancePercentage === null ? "—" : `${teamAttendancePercentage}%`}
      </p>
      <TrendIndicator deltaPoints={trendDeltaPoints} />
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
