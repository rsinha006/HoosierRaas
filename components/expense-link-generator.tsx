"use client";

import { useState } from "react";

export default function ExpenseLinkGenerator() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setError(null);

    try {
      const url = `${window.location.origin}/expenses`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy the link. Please copy it manually from the address bar.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg bg-[#990000] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
      >
        Copy Expense Request Link
      </button>
      {copied ? (
        <span className="text-sm font-medium text-green-700">Copied to clipboard!</span>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
