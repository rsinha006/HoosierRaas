"use client";

import { useState } from "react";

export default function OnboardingLinkGenerator() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setError(null);

    try {
      const url = `${window.location.origin}/onboarding`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy the link. Please copy it manually from the address bar.");
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000] sm:min-h-0 sm:w-auto"
      >
        Generate Onboarding Link
      </button>
      {copied ? (
        <span className="text-sm font-medium text-green-700">Copied to clipboard!</span>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
