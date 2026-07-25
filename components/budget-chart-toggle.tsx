"use client";

import { useRef } from "react";

export type BudgetChartView = "bars" | "pie";

function BarsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="4" width="14" height="3" rx="1.5" />
      <rect x="3" y="8.5" width="10" height="3" rx="1.5" />
      <rect x="3" y="13" width="6" height="3" rx="1.5" />
    </svg>
  );
}

function PieIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M9.25 2.55a7.5 7.5 0 1 0 8.2 8.2h-8.2v-8.2Z" />
      <path d="M10.75 2.55v6.7h6.7a7.51 7.51 0 0 0-6.7-6.7Z" />
    </svg>
  );
}

const OPTIONS: { key: BudgetChartView; label: string; Icon: () => React.ReactElement }[] = [
  { key: "bars", label: "Bar chart", Icon: BarsIcon },
  { key: "pie", label: "Pie chart", Icon: PieIcon },
];

type BudgetChartToggleProps = {
  value: BudgetChartView;
  onChange: (view: BudgetChartView) => void;
  /** Names the chart this toggle belongs to, so both cards' controls stay
   *  distinguishable to a screen reader. */
  chartLabel: string;
};

export default function BudgetChartToggle({
  value,
  onChange,
  chartLabel,
}: BudgetChartToggleProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = OPTIONS.findIndex((option) => option.key === value);

  // A radiogroup is a single tab stop; the arrow keys move between its options
  // and move the selection with them, so focus has to follow programmatically.
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    if (step === 0) {
      return;
    }

    event.preventDefault();
    const nextIndex = (activeIndex + step + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[nextIndex].key);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={`${chartLabel} chart type`}
      className="relative inline-flex shrink-0 rounded-lg bg-zinc-100 p-0.5"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-md bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          // The pill is exactly one button wide, so a full translate lands it
          // squarely over the second option at any container width.
          width: "calc((100% - 4px) / 2)",
          transform: value === "pie" ? "translateX(100%)" : "translateX(0)",
        }}
      />
      {OPTIONS.map((option, index) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.key)}
            onKeyDown={handleKeyDown}
            className={`relative z-10 rounded-md px-2.5 py-1.5 transition-colors ${
              selected ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <option.Icon />
          </button>
        );
      })}
    </div>
  );
}
