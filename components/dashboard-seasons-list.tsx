import type { Season } from "@/lib/seasons";

type DashboardSeasonsListProps = {
  seasons: Season[];
};

function formatSeasonRange(season: Season) {
  const start = new Date(`${season.starts_on}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const end = new Date(`${season.ends_on}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${start} – ${end}`;
}

export default function DashboardSeasonsList({ seasons }: DashboardSeasonsListProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-900">Seasons</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Open a past season read-only, or continue working in the current season.
      </p>

      <ul className="mt-6 divide-y divide-zinc-100">
        {seasons.map((season) => (
          <li
            key={season.id}
            className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-zinc-900">{season.label}</p>
              <p className="mt-1 text-sm text-zinc-500">{formatSeasonRange(season)}</p>
            </div>

            <div className="flex items-center gap-3">
              {season.is_active ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  Current Season
                </span>
              ) : season.is_archived ? (
                <a
                  href={`/api/viewing-season?season=${encodeURIComponent(season.label)}&redirect=${encodeURIComponent("/dashboard")}`}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-[#990000]/30 hover:bg-[#990000]/[0.03] hover:text-[#990000]"
                >
                  View {season.label} (archived)
                </a>
              ) : (
                <span className="text-sm text-zinc-500">Upcoming</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
