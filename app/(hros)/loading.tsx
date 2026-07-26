/**
 * Shared fallback for every route inside the authenticated shell.
 *
 * Its real job is navigation feel: with a loading boundary here, Next.js can
 * partially prefetch these dynamic routes and swap in this skeleton the moment
 * a sidebar link is clicked, instead of leaving the previous page on screen
 * while the server finishes querying. The sidebar stays interactive throughout.
 */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-48 rounded-md bg-zinc-200" />
          <div className="h-4 w-72 max-w-full rounded bg-zinc-100" />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-zinc-200" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="h-4 flex-1 rounded bg-zinc-100" />
                <div className="h-4 w-24 rounded bg-zinc-100" />
                <div className="h-4 w-16 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only">Loading page</span>
    </div>
  );
}
