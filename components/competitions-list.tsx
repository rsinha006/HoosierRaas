import Link from "next/link";
import type { Competition, CompetitionStatus } from "@/lib/competitions";
import { formatCompetitionDate, formatCompetitionStatus } from "@/lib/competitions";

type CompetitionsListProps = {
  competitions: Competition[];
};

function StatusBadge({ status }: { status: CompetitionStatus }) {
  const styles: Record<CompetitionStatus, string> = {
    upcoming: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-green-50 text-green-700 border-green-200",
    complete: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {formatCompetitionStatus(status)}
    </span>
  );
}

export default function CompetitionsList({ competitions }: CompetitionsListProps) {
  if (competitions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-zinc-500">
        No competitions yet. Create your first competition to get started.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-4 py-3 font-medium text-zinc-700">Name</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Date</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Location</th>
            <th className="px-4 py-3 font-medium text-zinc-700">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white">
          {competitions.map((competition) => (
            <tr key={competition.id} className="hover:bg-zinc-50/80">
              <td className="px-4 py-3">
                <Link
                  href={`/team-manager/competitions/${competition.id}`}
                  className="font-medium text-[#990000] hover:underline"
                >
                  {competition.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {formatCompetitionDate(competition.competition_date)}
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {competition.location || competition.venue || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={competition.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
