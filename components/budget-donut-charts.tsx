import {
  buildMatchedDonutChartSpecs,
  formatDonutViewBox,
  IU_CRIMSON,
  IU_CREAM,
  sumDonutAllocated,
  sumDonutSpent,
  type BudgetDonutSegment,
  type DonutChartSpec,
  type DonutChartViewBox,
} from "@/lib/budget-donut";
import { formatCurrency } from "@/lib/finance";

type BudgetDonutChartProps = {
  title: string;
  subtitle: string;
  segments: BudgetDonutSegment[];
  chart: DonutChartSpec;
  viewBox: DonutChartViewBox;
};

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function BudgetDonutChart({
  title,
  subtitle,
  segments,
  chart,
  viewBox,
}: BudgetDonutChartProps) {
  const totalAllocated = sumDonutAllocated(segments);
  const totalSpent = sumDonutSpent(segments);
  const spentPercent =
    totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white px-6 pt-6 pb-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-600">
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
        <div
          className="mt-2 w-full"
          style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}
        >
          <svg
            viewBox={formatDonutViewBox(viewBox)}
            role="img"
            aria-label={`${title} budget donut chart`}
            className="block h-full w-full"
            preserveAspectRatio="xMidYMin meet"
          >
            {chart.slices.map((slice) => (
              <path
                key={slice.key}
                d={slice.path}
                fill={slice.fill}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}
            <circle
              cx={chart.centerX}
              cy={chart.centerY}
              r={chart.innerRadius - 1}
              fill="#ffffff"
            />
            {chart.labels.map((label) => (
              <g key={label.key}>
                <path
                  d={label.linePath}
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth={1}
                />
                <text
                  x={label.textX}
                  y={label.textY}
                  textAnchor={label.textAnchor}
                  dominantBaseline="middle"
                  fill="#171717"
                  fontSize={chart.fontSize}
                  fontWeight={600}
                >
                  {label.label}
                </text>
              </g>
            ))}
            <text
              x={chart.centerX}
              y={chart.centerY - chart.fontSize * 1.4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#71717a"
              fontSize={chart.fontSize - 1}
              fontWeight={600}
              letterSpacing="0.08em"
            >
              SPENT
            </text>
            <text
              x={chart.centerX}
              y={chart.centerY + chart.fontSize * 0.4}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={IU_CRIMSON}
              fontSize={chart.fontSize + 10}
              fontWeight={700}
            >
              {formatPercent(spentPercent)}
            </text>
            <text
              x={chart.centerX}
              y={chart.centerY + chart.fontSize * 2.2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#71717a"
              fontSize={chart.fontSize - 1}
            >
              {formatCurrency(totalSpent)} / {formatCurrency(totalAllocated)}
            </text>
          </svg>
        </div>
      )}
    </section>
  );
}

type BudgetDonutChartsProps = {
  generalPoolSegments: BudgetDonutSegment[];
  iufbSegments: BudgetDonutSegment[];
};

export default function BudgetDonutCharts({
  generalPoolSegments,
  iufbSegments,
}: BudgetDonutChartsProps) {
  const { specs, viewBox } = buildMatchedDonutChartSpecs([
    generalPoolSegments,
    iufbSegments,
  ]);

  return (
    <section className="grid items-start gap-4 lg:grid-cols-2">
      <BudgetDonutChart
        title="General Pool"
        subtitle="Allocated budget by category with proportional spend."
        segments={generalPoolSegments}
        chart={specs[0]}
        viewBox={viewBox}
      />
      <BudgetDonutChart
        title="IUFB"
        subtitle="Allocated line items with proportional spend."
        segments={iufbSegments}
        chart={specs[1]}
        viewBox={viewBox}
      />
    </section>
  );
}
