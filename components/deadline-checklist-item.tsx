import type { DeadlineRow } from "@/lib/deadline-types";
import {
  formatCompletedAt,
  formatCurrency,
  formatDueDate,
  getRowTone,
} from "@/lib/deadline-checklist";

type DeadlineChecklistItemProps = {
  deadline: DeadlineRow;
  onToggle: (deadline: DeadlineRow) => void;
  compact?: boolean;
  showCompletedTimestamp?: boolean;
  syncing?: boolean;
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 text-green-600"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.3a1 1 0 0 1-1.414-.006l-3.25-3.25a1 1 0 1 1 1.414-1.414l2.543 2.543 6.543-6.57a1 1 0 0 1 1.412-.007Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function DeadlineChecklistItem({
  deadline,
  onToggle,
  compact = false,
  showCompletedTimestamp = true,
  syncing = false,
}: DeadlineChecklistItemProps) {
  const tone = getRowTone(deadline);
  const fine = formatCurrency(deadline.fine_amount);
  const isComplete = deadline.status === "complete";

  return (
    <div
      className={`rounded-xl border transition-colors ${
        compact ? "p-2.5" : "p-3"
      } ${tone}`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onToggle(deadline)}
          disabled={syncing}
          aria-label={
            syncing
              ? `Saving ${deadline.name}`
              : isComplete
                ? `Mark ${deadline.name} as pending`
                : `Mark ${deadline.name} as complete`
          }
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition disabled:cursor-wait disabled:opacity-60 ${
            isComplete
              ? "border-green-500 bg-green-100"
              : "border-zinc-300 bg-white hover:border-[#990000]"
          }`}
        >
          {isComplete ? <CheckIcon /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`font-semibold ${
                compact ? "text-xs" : "text-sm"
              } ${
                isComplete ? "text-zinc-500 line-through" : "text-zinc-900"
              }`}
            >
              {deadline.name}
            </p>
            {deadline.is_hard_cutoff ? (
              <span className="inline-flex rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                Hard cutoff
              </span>
            ) : null}
          </div>

          <p className={`text-zinc-700 ${compact ? "text-xs" : "text-sm"}`}>
            Due {formatDueDate(deadline.due_date)}
            {fine ? ` · Fine ${fine}` : ""}
          </p>

          {isComplete && deadline.completed_at && showCompletedTimestamp ? (
            <p
              className={`mt-1.5 font-medium text-green-700 ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              {formatCompletedAt(deadline.completed_at)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
