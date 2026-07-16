"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PacketExtractionReviewForm from "@/components/packet-extraction-review-form";
import {
  clearPacketReviewDraft,
  loadPacketReviewDraft,
  PACKET_REVIEW_STORAGE_KEY,
  type PacketReviewFormState,
} from "@/lib/packet-review";

let cachedDraftCompetitionId: string | null = null;
let cachedDraftRaw: string | null = null;
let cachedDraft: PacketReviewFormState | null = null;

function subscribeToPacketReviewDraft() {
  return () => {};
}

function getServerPacketReviewDraftSnapshot() {
  return null;
}

function getPacketReviewDraftSnapshot(competitionId: string) {
  const rawDraft = sessionStorage.getItem(PACKET_REVIEW_STORAGE_KEY);

  if (cachedDraftCompetitionId !== competitionId || cachedDraftRaw !== rawDraft) {
    cachedDraftCompetitionId = competitionId;
    cachedDraftRaw = rawDraft;
    cachedDraft = loadPacketReviewDraft(competitionId);
  }

  return cachedDraft;
}

type PacketReviewPageClientProps = {
  competitionId: string;
  competitionName: string;
};

export default function PacketReviewPageClient({
  competitionId,
  competitionName,
}: PacketReviewPageClientProps) {
  const router = useRouter();
  const getSnapshot = useCallback(
    () => getPacketReviewDraftSnapshot(competitionId),
    [competitionId],
  );
  const formState = useSyncExternalStore(
    subscribeToPacketReviewDraft,
    getSnapshot,
    getServerPacketReviewDraftSnapshot,
  );

  useEffect(() => {
    if (!formState) {
      router.replace(`/team-manager/competitions/${competitionId}`);
    }
  }, [competitionId, formState, router]);

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
