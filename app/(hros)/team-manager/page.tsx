import Link from "next/link";
import PressingDeadlinesSection from "@/components/pressing-deadlines-section";
import { getUserMember } from "@/lib/get-user-member";
import { buildPressingDeadlineGroups } from "@/lib/pressing-deadlines";
import { hasWriteAccess } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export default async function TeamManagerPage() {
  const [supabase, userMember] = await Promise.all([
    createClient(),
    getUserMember(),
  ]);

  const canWrite = hasWriteAccess(userMember?.exec_title ?? null, "team-manager");

  const [{ count: competitionCount }, { data: deadlinesData }] = await Promise.all([
    supabase.from("competitions").select("*", { count: "exact", head: true }),
    supabase
      .from("deadlines")
      .select(
        `
        id,
        competition_id,
        name,
        due_date,
        fine_amount,
        is_hard_cutoff,
        status,
        completed_at,
        created_at,
        competitions (
          id,
          name
        )
      `,
      )
      .eq("status", "pending"),
  ]);

  const pressingDeadlineGroups = buildPressingDeadlineGroups(deadlinesData ?? []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Team Manager</h1>
        <p className="mt-2 text-zinc-600">
          Competition logistics and attendance.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Competitions</h2>
            <p className="mt-1 text-sm text-zinc-600">
              View schedules, manage registration packets, and track competition
              details.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {competitionCount ?? 0} competition
              {competitionCount === 1 ? "" : "s"} on file
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/team-manager/competitions"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              View competitions
            </Link>
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
      </section>

      <PressingDeadlinesSection groups={pressingDeadlineGroups} />
    </div>
  );
}
