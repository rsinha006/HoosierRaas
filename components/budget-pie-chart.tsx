"use client";

import { useMemo, useState } from "react";
import OverBudgetIcon from "@/components/over-budget-icon";
import { OVER_BUDGET_ALERT, type BudgetBarSegment } from "@/lib/budget-bar";
import {
  buildBudgetPieSpec,
  PIE_CENTER,
  PIE_INNER_RADIUS,
  PIE_OUTER_RADIUS,
  PIE_SIZE,
} from "@/lib/budget-pie";
import { formatCurrency } from "@/lib/finance";

/** The card is white, so a surface-coloured stroke reads as a gap between
 *  slices rather than an outline around them. */
const SLICE_GAP_COLOR = "#ffffff";
const SLICE_GAP_WIDTH = 2;

type BudgetPieChartProps = {
  segments: BudgetBarSegment[];
};

export default function BudgetPieChart({ segments }: BudgetPieChartProps) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const spec = useMemo(() => buildBudgetPieSpec(segments), [segments]);

  const hoveredSlice =
    spec.slices.find((slice) => slice.label === hoveredLabel) ?? null;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="relative mx-auto w-full max-w-[240px]">
        <svg
          viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}
          className="block w-full"
          role="img"
          aria-label={`Allocated budget split across ${spec.slices.length} ${
            spec.slices.length === 1 ? "category" : "categories"
          }, totalling ${formatCurrency(spec.total)}. The list below gives every figure.`}
        >
          {spec.isFullCircle ? (
            // A lone slice sweeps a full turn, where an arc's endpoints coincide
            // and the path draws nothing — a stroked circle is the ring instead.
            <circle
              cx={PIE_CENTER}
              cy={PIE_CENTER}
              r={(PIE_OUTER_RADIUS + PIE_INNER_RADIUS) / 2}
              fill="none"
              stroke={spec.slices[0]?.color}
              strokeWidth={PIE_OUTER_RADIUS - PIE_INNER_RADIUS}
            />
          ) : (
            spec.slices.map((slice) => (
              <path
                key={slice.label}
                d={slice.path}
                fill={slice.color}
                stroke={SLICE_GAP_COLOR}
                strokeWidth={SLICE_GAP_WIDTH}
                strokeLinejoin="round"
                opacity={hoveredSlice && hoveredSlice.label !== slice.label ? 0.35 : 1}
                className="transition-opacity"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredLabel(slice.label)}
                onMouseLeave={() => setHoveredLabel(null)}
              />
            ))
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
            Allocated
          </p>
          <p className="mt-0.5 w-full truncate text-base font-semibold text-zinc-900">
            {formatCurrency(spec.total)}
          </p>
        </div>

      </div>

      {/* A fixed panel rather than a floating tooltip: the donut sits directly
          under the card header, so anything anchored to a slice near twelve
          o'clock would escape the card. Reserving the height here also keeps
          the legend from jumping as the pointer moves across the ring. */}
      <div className="flex min-h-[72px] flex-col justify-center rounded-lg bg-zinc-50 px-3 py-2 text-center">
        {hoveredSlice ? (
          <>
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-900">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: hoveredSlice.color }}
              />
              <span className="truncate">{hoveredSlice.label}</span>
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {formatCurrency(hoveredSlice.allocated)} allocated ·{" "}
              {hoveredSlice.percentLabel}% · {formatCurrency(hoveredSlice.spent)} spent
              {hoveredSlice.overBudget ? (
                <span className="ml-1 font-semibold" style={{ color: OVER_BUDGET_ALERT }}>
                  — over budget
                </span>
              ) : null}
            </p>
            {hoveredSlice.isOther ? (
              // Kept to one line so the panel's height is the same in every
              // state and the legend below it never shifts on hover.
              <p
                className="mt-0.5 truncate text-[11px] leading-relaxed text-zinc-500"
                title={hoveredSlice.members.join(", ")}
              >
                {hoveredSlice.members.join(", ")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-zinc-500">
            {formatCurrency(spec.totalSpent)} spent of {formatCurrency(spec.total)}{" "}
            allocated
          </p>
        )}
      </div>

      {/* Doubles as the relief channel for the three palette slots that sit
          below 3:1 on white — every slice's identity and figures are readable
          here without relying on the fill colour. */}
      <ul className="flex flex-col gap-0.5">
        {spec.slices.map((slice) => (
          <li key={slice.label}>
            <button
              type="button"
              onMouseEnter={() => setHoveredLabel(slice.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              onFocus={() => setHoveredLabel(slice.label)}
              onBlur={() => setHoveredLabel(null)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                hoveredSlice?.label === slice.label ? "bg-zinc-100" : "hover:bg-zinc-50"
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                {slice.label}
                {slice.isOther ? (
                  <span className="ml-1 text-xs text-zinc-400">
                    ({slice.members.length})
                  </span>
                ) : null}
              </span>
              {slice.overBudget ? <OverBudgetIcon /> : null}
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                {formatCurrency(slice.allocated)}
              </span>
              <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-700">
                {slice.percentLabel}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
