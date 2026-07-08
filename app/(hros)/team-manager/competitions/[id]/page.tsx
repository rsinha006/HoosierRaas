import Link from "next/link";
import RegistrationPacketInfo from "@/components/registration-packet-info";
import RegistrationDetails, {
  type ContactRow,
  type FeeRow,
} from "@/components/registration-details";
import DeadlinesChecklist from "@/components/deadlines-checklist";
import type { DeadlineRow } from "@/lib/deadline-types";
import { getUserMember } from "@/lib/get-user-member";
import { hasWriteAccess } from "@/lib/rbac";
import { getActiveSeason } from "@/lib/seasons";
import { createClient } from "@/lib/supabase/server";
import {
  formatCompetitionDate,
  formatCompetitionStatus,
  type Competition,
} from "@/lib/competitions";

type CompetitionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompetitionDetailPage({
  params,
}: CompetitionDetailPageProps) {
  const { id } = await params;
  const [supabase, userMember, activeSeason] = await Promise.all([
    createClient(),
    getUserMember(),
    getActiveSeason(),
  ]);

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

  const [{ data: deadlinesData }, { data: feesData }, { data: contactsData }] =
    await Promise.all([
      supabase
        .from("deadlines")
        .select("*")
        .eq("competition_id", competition.id)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("fees")
        .select("id, name, amount, is_per_person, is_refundable, due_date")
        .eq("competition_id", competition.id)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("competition_contacts")
        .select("id, name, role, email, phone")
        .eq("competition_id", competition.id)
        .order("sort_order", { ascending: true }),
    ]);

  const deadlines = (deadlinesData ?? []) as DeadlineRow[];
  const fees = (feesData ?? []) as FeeRow[];
  const contacts = (contactsData ?? []) as ContactRow[];
  const canWrite =
    hasWriteAccess(userMember?.exec_title ?? null, "team-manager") &&
    competition.season === activeSeason.label;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <Link
          href="/team-manager/competitions"
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to competitions
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 sm:text-2xl">
          {competition.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {formatCompetitionDate(competition.competition_date)} ·{" "}
          {formatCompetitionStatus(competition.status)}
        </p>
      </div>

      <RegistrationDetails competition={competition} fees={fees} contacts={contacts} />

      <DeadlinesChecklist
        competitionId={competition.id}
        deadlines={deadlines}
        canWrite={canWrite}
      />

      <RegistrationPacketInfo
        competitionId={competition.id}
        competitionName={competition.name}
        packetUrl={competition.packet_url}
        packetUploadedAt={competition.packet_uploaded_at}
        canWrite={canWrite}
      />
    </div>
  );
}
