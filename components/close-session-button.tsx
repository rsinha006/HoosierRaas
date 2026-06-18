"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CloseSessionButtonProps = {
  sessionId: string;
};

export default function CloseSessionButton({ sessionId }: CloseSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClose() {
    const confirmed = window.confirm(
      "Close this session now? Non-responders will be marked absent (unexcused). This cannot be undone without a Captain or Team Manager override.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: closeError } = await supabase.rpc("close_practice_session_manually", {
      p_session_id: sessionId,
    });

    setLoading(false);

    if (closeError) {
      setError(closeError.message ?? "Could not close this session.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClose}
        disabled={loading}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Closing..." : "Close session"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
