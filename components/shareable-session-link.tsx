"use client";

import { useState } from "react";

type ShareableSessionLinkProps = {
  shareableToken: string;
  prominent?: boolean;
};

export default function ShareableSessionLink({
  shareableToken,
  prominent = false,
}: ShareableSessionLinkProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attendUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/attend/${shareableToken}`
      : `/attend/${shareableToken}`;

  async function handleCopy() {
    setError(null);

    try {
      const url = `${window.location.origin}/attend/${shareableToken}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy the link. Please copy it manually.");
    }
  }

  if (prominent) {
    return (
      <div className="rounded-2xl border-2 border-[#990000]/20 bg-[#990000]/5 p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Shareable attendance link</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Send this link to team members so they can submit their attendance response.
          Responses close 5 hours after the session is created.
        </p>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="break-all font-mono text-sm text-zinc-800">{attendUrl}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
          >
            Copy Link
          </button>
          {copied ? (
            <span className="text-sm font-medium text-green-700">Copied to clipboard!</span>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{attendUrl}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        {copied ? "Copied!" : "Copy Link"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
