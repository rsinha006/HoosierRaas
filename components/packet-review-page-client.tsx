"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PacketExtractionReviewForm from "@/components/packet-extraction-review-form";
import {
  clearPacketReviewDraft,
  loadPacketReviewDraft,
  type PacketReviewFormState,
} from "@/lib/packet-review";

type PacketReviewPageClientProps = {
  competitionId: string;
  competitionName: string;
  serverDraft: PacketReviewFormState | null;
};

export default function PacketReviewPageClient({
  competitionId,
  competitionName,
  serverDraft,
}: PacketReviewPageClientProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<PacketReviewFormState | null>(null);

  useEffect(() => {
    // sessionStorage isn't available during SSR, so this genuinely needs an
    // effect — the brief "Loading..." flash is an unavoidable consequence of
    // that, not a sign of a real bug.
    //
    // sessionStorage is the fast path (same tab that just extracted); the
    // draft persisted on the competition row is the fallback for a second tab
    // or a browser crash, where sessionStorage never had it to begin with.
    const draft = loadPacketReviewDraft(competitionId) ?? serverDraft;
    if (!draft || draft.competitionId !== competitionId) {
      router.replace(`/team-manager/competitions/${competitionId}`);
      return;
    }

    setFormState(draft);
  }, [competitionId, router, serverDraft]);

  if (!formState) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-600 shadow-sm">
        Loading extracted packet data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href={`/team-manager/competitions/${competitionId}`}
          onClick={() => clearPacketReviewDraft()}
          className="text-sm font-medium text-[#990000] transition hover:text-[#7a0000]"
        >
          ← Back to competition
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
          Review extracted packet data
        </h1>
        <p className="mt-2 text-zinc-600">{competitionName}</p>
      </div>

      <PacketExtractionReviewForm initialState={formState} />
    </div>
  );
}
