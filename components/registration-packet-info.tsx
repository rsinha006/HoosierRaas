"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  REGISTRATION_PACKETS_BUCKET,
  formatPacketUploadedAt,
  getPacketFilename,
} from "@/lib/registration-packets";

type RegistrationPacketInfoProps = {
  packetUrl: string | null;
  packetUploadedAt: string | null;
};

export default function RegistrationPacketInfo({
  packetUrl,
  packetUploadedAt,
}: RegistrationPacketInfoProps) {
  const [opening, setOpening] = useState(false);
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
      setError("Could not open the registration packet.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-900">Registration packet</h2>
      <p className="mt-2 text-sm text-zinc-700">{getPacketFilename(packetUrl)}</p>
      {packetUploadedAt ? (
        <p className="mt-1 text-xs text-zinc-500">
          Uploaded {formatPacketUploadedAt(packetUploadedAt)}
        </p>
      ) : null}
      <button
        type="button"
        onClick={openPacket}
        disabled={opening}
        className="mt-4 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
      >
        {opening ? "Opening..." : "View PDF"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
