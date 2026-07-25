import Link from "next/link";

export default function BackToFinanceLink() {
  return (
    <Link
      href="/finance"
      aria-label="Back to Finance"
      title="Back to Finance"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12.5 15.5 7 10l5.5-5.5" />
      </svg>
    </Link>
  );
}
