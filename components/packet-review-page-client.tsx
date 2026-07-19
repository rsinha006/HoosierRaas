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
};

export default function PacketReviewPageClient({
  competitionId,
  competitionName,
}: PacketReviewPageClientProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<PacketReviewFormState | null>(null);

  useEffect(() => {
    let cancelled = false;
    // sessionStorage isn't available during SSR, so this genuinely needs an
    // effect — the brief "Loading..." flash is an unavoidable consequence of
    // that, not a sign of a real bug.
    const draft = loadPacketReviewDraft(competitionId);
    if (!draft) {
      router.replace(`/team-manager/competitions/${competitionId}`);
      return;
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setFormState(draft);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [competitionId, router]);

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
