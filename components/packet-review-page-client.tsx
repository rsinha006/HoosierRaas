"use client";

import { useEffect, useSyncExternalStore } from "react";
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

function getDraftSnapshot(
  competitionId: string,
  serverDraft: PacketReviewFormState | null,
): PacketReviewFormState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const draft = loadPacketReviewDraft(competitionId) ?? serverDraft;
  if (!draft || draft.competitionId !== competitionId) {
    return null;
  }

  return draft;
}

function getServerDraftSnapshot(
  competitionId: string,
  serverDraft: PacketReviewFormState | null,
): PacketReviewFormState | null {
  if (!serverDraft || serverDraft.competitionId !== competitionId) {
    return null;
  }

  return serverDraft;
}

export default function PacketReviewPageClient({
  competitionId,
  competitionName,
  serverDraft,
}: PacketReviewPageClientProps) {
  const router = useRouter();
  const formState = useSyncExternalStore(
    () => () => {},
    () => getDraftSnapshot(competitionId, serverDraft),
    () => getServerDraftSnapshot(competitionId, serverDraft),
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
