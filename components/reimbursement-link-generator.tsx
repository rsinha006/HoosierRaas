"use client";

import { useState } from "react";
import PublicLinkNotice from "@/components/public-link-notice";
import { useOrigin } from "@/hooks/use-origin";
import { PUBLIC_LINK_PATHS } from "@/lib/public-links";

export default function ReimbursementLinkGenerator() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Empty on the server and through hydration, so this starts as the bare path
  // and fills in once mounted.
  const origin = useOrigin();

  const reimbursementUrl = `${origin}${PUBLIC_LINK_PATHS.reimbursements}`;

  async function handleCopy() {
    setError(null);

    try {
      const url = `${window.location.origin}${PUBLIC_LINK_PATHS.reimbursements}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy the link. Please copy it manually from the address bar.");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Reimbursement link</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Share this link with team members to submit out-of-pocket reimbursement
        requests. No portal login required.
      </p>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
        <p className="break-all font-mono text-sm text-zinc-800">{reimbursementUrl}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
        >
          Copy Reimbursement Link
        </button>
        {copied ? (
          <span className="text-sm font-medium text-green-700">Copied to clipboard!</span>
        ) : null}
      </div>
      <PublicLinkNotice path={PUBLIC_LINK_PATHS.reimbursements} className="mt-3" />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
