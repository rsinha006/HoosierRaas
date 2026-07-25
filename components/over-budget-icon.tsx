import { OVER_BUDGET_ALERT } from "@/lib/budget-bar";

/** Shared by the bar and pie views so an overspent category is flagged the same
 *  way whichever chart is on screen. */
export default function OverBudgetIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={OVER_BUDGET_ALERT}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.164c.75 1.333-.213 2.987-1.743 2.987H3.72c-1.53 0-2.493-1.654-1.743-2.987L8.257 3.1zM10 7a1 1 0 00-1 1v3a1 1 0 002 0V8a1 1 0 00-1-1zm0 7.25a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
  );
}
