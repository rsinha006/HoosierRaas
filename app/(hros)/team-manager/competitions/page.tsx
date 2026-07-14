import Link from "next/link";
import CompetitionsList from "@/components/competitions-list";
import { getUserMember } from "@/lib/get-user-member";
import { hasWriteAccess } from "@/lib/rbac";
import { getViewingSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";
import type { Competition } from "@/lib/competitions";

type CompetitionsPageProps = {
  searchParams: Promise<{ created?: string; season?: string }>;
};

export default async function CompetitionsPage({
  searchParams,
}: CompetitionsPageProps) {
  const params = await searchParams;
  const showSuccess = params.created === "1";
  const viewingSeason = await getViewingSeason(params.season);
  const season = viewingSeason.label;

  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canWrite =
    hasWriteAccess(userMember?.exec_title ?? null, "team-manager") && viewingSeason.is_active;

  // Auto-closing normally happens via a pg_cron schedule. Opportunistically call the
  // same close function here too, so a page visit reflects a past competition_date
  // even if the cron job didn't run — cheap and safe to call repeatedly.
  await supabase.rpc("close_past_competitions");

  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("season", season)
    .order("competition_date", { ascending: true });

  const competitions = (data ?? []) as Competition[];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/team-manager"
              className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
            >
              ← Back to Team Manager
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-900">Competitions</h1>
            <p className="mt-2 text-zinc-600">
              Manage competition schedules, venues, and requirements.
            </p>
          </div>

          {canWrite ? (
            <Link
              href="/team-manager/competitions/new"
              className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
            >
              Add competition
            </Link>
          ) : null}
        </div>
      </div>

      {showSuccess ? (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-6 py-4 text-green-800"
        >
          <p className="font-medium">Competition created successfully.</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-medium">Could not load competitions</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <CompetitionsList competitions={competitions} />
        </div>
      )}
    </div>
  );
}
