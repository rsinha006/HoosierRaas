"use client";

import { useState } from "react";
import BudgetChartToggle, { type BudgetChartView } from "@/components/budget-chart-toggle";
import BudgetPieChart from "@/components/budget-pie-chart";
import OverBudgetIcon from "@/components/over-budget-icon";
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
              <OverBudgetIcon />
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

function BudgetBarList({ segments }: { segments: BudgetBarSegment[] }) {
  const maxAllocated = Math.max(0, ...segments.map((segment) => segment.allocated));

  return (
    <div className="mt-4 flex flex-col gap-4">
      {segments.map((segment) => (
        <BudgetBarRow
          key={segment.label}
          segment={segment}
          maxAllocated={maxAllocated}
        />
      ))}
    </div>
  );
}

type BudgetChartCardProps = {
  title: string;
  barSubtitle: string;
  pieSubtitle: string;
  segments: BudgetBarSegment[];
};

function BudgetChartCard({
  title,
  barSubtitle,
  pieSubtitle,
  segments,
}: BudgetChartCardProps) {
  const [view, setView] = useState<BudgetChartView>("bars");
  const totalAllocated = sumBarAllocated(segments);
  const hasBudget = totalAllocated > 0;

  return (
    <section className="flex flex-col rounded-2xl border border-zinc-200 bg-white px-6 pt-6 pb-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {view === "bars" ? barSubtitle : pieSubtitle}
          </p>
        </div>
        {hasBudget ? (
          <BudgetChartToggle value={view} onChange={setView} chartLabel={title} />
        ) : null}
      </div>

      {hasBudget && view === "bars" ? (
        // Only meaningful against the crimson/cream fill of the bar view; the
        // pie encodes category identity instead, and carries its own legend.
        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-600">
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
      ) : null}

      {!hasBudget ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
          No allocated budget yet. Set amounts in Budget Setup.
        </div>
      ) : view === "bars" ? (
        <BudgetBarList segments={segments} />
      ) : (
        <BudgetPieChart segments={segments} />
      )}
    </section>
  );
}

type BudgetChartsProps = {
  generalPoolSegments: BudgetBarSegment[];
  iufbSegments: BudgetBarSegment[];
};

export default function BudgetCharts({
  generalPoolSegments,
  iufbSegments,
}: BudgetChartsProps) {
  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <BudgetChartCard
        title="General Pool"
        barSubtitle="Allocated budget by category with proportional spend."
        pieSubtitle="Share of total allocated budget by category."
        segments={generalPoolSegments}
      />
      <BudgetChartCard
        title="IUFB"
        barSubtitle="Allocated line items with proportional spend."
        pieSubtitle="Share of total allocated budget by line item."
        segments={iufbSegments}
      />
    </section>
  );
}
