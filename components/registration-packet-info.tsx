"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ExtractedPacketData } from "@/lib/packet-extraction-types";
import {
  buildMergedPacketReviewFormState,
  type ExistingContactRow,
  type ExistingDeadlineRow,
  type ExistingFeeRow,
  savePacketReviewDraft,
} from "@/lib/packet-review";
import {
  REGISTRATION_PACKETS_BUCKET,
  formatPacketUploadedAt,
  getPacketFilename,
} from "@/lib/registration-packets";
import {
  toUserFacingExtractionError,
  toUserFacingStorageError,
} from "@/lib/user-facing-errors";

type RegistrationPacketInfoProps = {
  competitionId: string;
  competitionName: string;
  packetUrl: string | null;
  packetUploadedAt: string | null;
  canWrite: boolean;
};

type ExtractPacketApiResponse = {
  data?: ExtractedPacketData;
  warnings?: string[];
  error?: string;
};

function isExtractedPacketData(value: unknown): value is ExtractedPacketData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.deadlines) &&
    Array.isArray(record.fees) &&
    typeof record.roster_rules === "object" &&
    record.roster_rules !== null &&
    typeof record.performance_rules === "object" &&
    record.performance_rules !== null &&
    Array.isArray(record.contacts)
  );
}

function parseExtractPacketResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as ExtractPacketApiResponse;

  if (record.data && isExtractedPacketData(record.data)) {
    return {
      data: record.data,
      warnings: Array.isArray(record.warnings)
        ? record.warnings.filter((warning): warning is string => typeof warning === "string")
        : [],
    };
  }

  if (isExtractedPacketData(payload)) {
    return { data: payload, warnings: [] as string[] };
  }

  return null;
}

export default function RegistrationPacketInfo({
  competitionId,
  competitionName,
  packetUrl,
  packetUploadedAt,
  canWrite,
}: RegistrationPacketInfoProps) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!packetUrl) {
    return null;
  }

  async function openPacket() {
    setOpening(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signedUrlError } = await supabase.storage
      .from(REGISTRATION_PACKETS_BUCKET)
      .createSignedUrl(packetUrl!, 3600);

    setOpening(false);

    if (signedUrlError || !data?.signedUrl) {
      setError(toUserFacingStorageError(signedUrlError ?? new Error("not found")));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function extractData() {
    if (!canWrite) {
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const response = await fetch("/api/extract-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: packetUrl }),
      });

      const payload = (await response.json()) as ExtractPacketApiResponse;

      if (!response.ok) {
        setError(
          typeof payload.error === "string"
            ? payload.error
            : toUserFacingExtractionError(new Error("extract failed")),
        );
        return;
      }

      const parsed = parseExtractPacketResponse(payload);
      if (!parsed) {
        setError(
          "We received data from the AI but could not read it. Please try again, or add deadlines manually on the review screen.",
        );
        return;
      }

      const supabase = createClient();
      const [
        { data: competitionData },
        { data: deadlinesData },
        { data: feesData },
        { data: contactsData },
      ] = await Promise.all([
        supabase
          .from("competitions")
          .select(
            "roster_min, roster_max, per_person_registration_cost, min_performance_duration, max_performance_duration, mix_format, tech_rehearsal_required",
          )
          .eq("id", competitionId)
          .maybeSingle(),
        supabase
          .from("deadlines")
          .select("id, name, due_date, fine_amount, is_hard_cutoff")
          .eq("competition_id", competitionId),
        supabase
          .from("fees")
          .select("id, name, amount, is_per_person, is_refundable, due_date")
          .eq("competition_id", competitionId),
        supabase
          .from("competition_contacts")
          .select("id, name, role, email, phone")
          .eq("competition_id", competitionId)
          .order("sort_order", { ascending: true }),
      ]);

      const reviewState = buildMergedPacketReviewFormState(
        competitionId,
        competitionName,
        parsed.data,
        {
          deadlines: (deadlinesData ?? []) as ExistingDeadlineRow[],
          fees: (feesData ?? []) as ExistingFeeRow[],
          contacts: (contactsData ?? []) as ExistingContactRow[],
          roster_rules: {
            min_size: competitionData?.roster_min ?? null,
            max_size: competitionData?.roster_max ?? null,
            per_person_registration_cost:
              competitionData?.per_person_registration_cost ?? null,
          },
          performance_rules: {
            min_duration_minutes: competitionData?.min_performance_duration ?? null,
            max_duration_minutes: competitionData?.max_performance_duration ?? null,
            mix_format: competitionData?.mix_format ?? null,
            tech_rehearsal_required: competitionData?.tech_rehearsal_required ?? null,
          },
        },
        parsed.warnings,
      );
      savePacketReviewDraft(reviewState);
      router.push(`/team-manager/competitions/${competitionId}/review-packet`);
    } catch (caughtError) {
      setError(toUserFacingExtractionError(caughtError));
    } finally {
      setExtracting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Registration packet</h2>
      <p className="mt-1 text-sm text-zinc-700">{getPacketFilename(packetUrl)}</p>
      {packetUploadedAt ? (
        <p className="mt-0.5 text-xs text-zinc-500">
          Uploaded {formatPacketUploadedAt(packetUploadedAt)}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openPacket}
          disabled={opening || extracting}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          {opening ? "Opening PDF..." : "View PDF"}
        </button>
        {canWrite ? (
          <button
            type="button"
            onClick={extractData}
            disabled={opening || extracting}
            className="rounded-lg bg-[#990000] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#7a0000] disabled:opacity-60"
          >
            {extracting ? "Reading packet..." : "Extract Data"}
          </button>
        ) : null}
      </div>
      {extracting ? (
        <p className="mt-2 text-sm text-zinc-600">
          The AI is reading your registration packet. This can take up to a minute.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
