export default function ViewingSeasonBanner({ label }: { label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-2.5 text-sm text-amber-900 lg:px-8">
      <p>
        You&apos;re viewing the archived <span className="font-semibold">{label}</span>{" "}
        season — read only.
      </p>
      <a
        href="/api/viewing-season"
        className="font-medium underline underline-offset-2 hover:text-amber-950"
      >
        Return to current season
      </a>
    </div>
  );
}
