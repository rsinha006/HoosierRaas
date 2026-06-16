import Link from "next/link";
import RegistrationPacketInfo from "@/components/registration-packet-info";
import { createClient } from "@/lib/supabase/server";
import {
  formatCompetitionDate,
  formatCompetitionStatus,
  formatDurationRange,
  formatRosterRange,
  type Competition,
} from "@/lib/competitions";

type CompetitionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompetitionDetailPage({
  params,
}: CompetitionDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const competition = data as Competition | null;

  if (error || !competition) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
          <h1 className="text-2xl font-semibold">Competition not found</h1>
          <p className="mt-2 text-sm">
            {error?.message ?? "This competition could not be loaded."}
          </p>
          <Link
            href="/team-manager/competitions"
            className="mt-4 inline-block text-sm font-medium text-[#990000] hover:underline"
          >
            Back to competitions
          </Link>
        </div>
      </div>
    );
  }

  const durationRange = formatDurationRange(
    competition.min_performance_duration,
    competition.max_performance_duration,
  );
  const rosterRange = formatRosterRange(
    competition.roster_min,
    competition.roster_max,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href="/team-manager/competitions"
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to competitions
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
          {competition.name}
        </h1>
        <p className="mt-2 text-zinc-600">
          {formatCompetitionDate(competition.competition_date)} ·{" "}
          {formatCompetitionStatus(competition.status)}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Venue
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {competition.venue || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Location
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {competition.location || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Performance duration
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{durationRange || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Mix format
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {competition.mix_format || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Roster size
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{rosterRange || "—"}</dd>
          </div>
        </dl>
      </div>

      <RegistrationPacketInfo
        packetUrl={competition.packet_url}
        packetUploadedAt={competition.packet_uploaded_at}
      />
    </div>
  );
}
