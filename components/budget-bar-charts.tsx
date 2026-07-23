import {
  IU_CRIMSON,
  IU_CREAM,
  OVER_BUDGET_ALERT,
  sumBarAllocated,
  type BudgetBarSegment,
} from "@/lib/budget-bar";
import { formatCurrency } from "@/lib/finance";

type BudgetBarRowProps = {
  segment: BudgetBarSegment;
  maxAllocated: number;
};

function WarningIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={OVER_BUDGET_ALERT}
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.164c.75 1.333-.213 2.987-1.743 2.987H3.72c-1.53 0-2.493-1.654-1.743-2.987L8.257 3.1zM10 7a1 1 0 00-1 1v3a1 1 0 002 0V8a1 1 0 00-1-1zm0 7.25a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
  );
}

function BudgetBarRow({ segment, maxAllocated }: BudgetBarRowProps) {
  const overBudget = segment.spent > segment.allocated;
  const spentRatio =
    segment.allocated > 0
      ? Math.min(segment.spent / segment.allocated, 1)
      : 0;
  const trackWidthPercent =
    maxAllocated > 0 ? (segment.allocated / maxAllocated) * 100 : 0;
  const fillWidthPercent = overBudget ? 100 : spentRatio * 100;
  const overAmount = segment.spent - segment.allocated;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900"
          title={segment.label}
        >
          {segment.label}
        </span>
        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
          {formatCurrency(segment.spent)} / {formatCurrency(segment.allocated)}
          {overBudget ? (
            <span
              className="ml-1.5 inline-flex items-center gap-1 font-semibold"
              style={{ color: OVER_BUDGET_ALERT }}
            >
              <WarningIcon />
              {formatCurrency(overAmount)} over
            </span>
          ) : null}
        </span>
      </div>
      <div
        className="mt-1.5 h-4 rounded-full"
        style={{ width: `${Math.max(trackWidthPercent, 4)}%`, backgroundColor: IU_CREAM }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${fillWidthPercent}%`,
            backgroundColor: overBudget ? OVER_BUDGET_ALERT : IU_CRIMSON,
          }}
        />
      </div>
    </div>
  );
}

type BudgetBarChartProps = {
  title: string;
  subtitle: string;
  segments: BudgetBarSegment[];
};

function BudgetBarChart({ title, subtitle, segments }: BudgetBarChartProps) {
  const totalAllocated = sumBarAllocated(segments);
  const maxAllocated = Math.max(0, ...segments.map((segment) => segment.allocated));

  return (
    <section className="flex flex-col rounded-2xl border border-zinc-200 bg-white px-6 pt-6 pb-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 truncate text-sm text-zinc-600">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: IU_CRIMSON }}
            />
            Spent
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm border border-zinc-300"
              style={{ backgroundColor: IU_CREAM }}
            />
            Remaining
          </span>
        </div>
      </div>

      {totalAllocated <= 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
          No allocated budget yet. Set amounts in Budget Setup.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {segments.map((segment) => (
            <BudgetBarRow
              key={segment.label}
              segment={segment}
              maxAllocated={maxAllocated}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type BudgetBarChartsProps = {
  generalPoolSegments: BudgetBarSegment[];
  iufbSegments: BudgetBarSegment[];
};

export default function BudgetBarCharts({
  generalPoolSegments,
  iufbSegments,
}: BudgetBarChartsProps) {
  return (
    <section className="grid items-start gap-4 lg:grid-cols-2">
      <BudgetBarChart
        title="General Pool"
        subtitle="Allocated budget by category with proportional spend."
        segments={generalPoolSegments}
      />
      <BudgetBarChart
        title="IUFB"
        subtitle="Allocated line items with proportional spend."
        segments={iufbSegments}
      />
    </section>
  );
}
