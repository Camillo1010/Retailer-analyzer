"use client";
import { quartiles } from "@/lib/analytics/stats";
import { chartTheme } from "./chart-theme";
import { formatCurrency } from "@/lib/utils";

/**
 * Minimal SVG box-plot. We build the visualization manually because Recharts
 * doesn't ship a native box plot.
 */
export function BoxPlot({
  values,
  subjectValue,
  height = 160,
  format = (n) => formatCurrency(n, 0),
  label = "sales psf",
}: {
  values: number[];
  subjectValue?: number | null;
  height?: number;
  format?: (n: number) => string;
  label?: string;
}) {
  if (values.length < 4) {
    return <div className="text-xs text-muted-foreground py-4">Too few peer data points for a box plot.</div>;
  }
  const q = quartiles(values);
  if (!q) return null;

  const lo = Math.min(q.lowerFence, ...(subjectValue !== null && subjectValue !== undefined ? [subjectValue] : []), Math.min(...values));
  const hi = Math.max(q.upperFence, ...(subjectValue !== null && subjectValue !== undefined ? [subjectValue] : []), Math.max(...values));
  const pad = (hi - lo) * 0.05 || 1;
  const min = lo - pad;
  const max = hi + pad;

  const width = 560;
  const margin = { left: 50, right: 30, top: 16, bottom: 36 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;
  const x = (v: number) => margin.left + ((v - min) / (max - min)) * w;

  const outliersLow = values.filter((v) => v < q.lowerFence);
  const outliersHigh = values.filter((v) => v > q.upperFence);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* axis */}
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + h} y2={margin.top + h} stroke={chartTheme.colors.axis} strokeWidth={0.5} />
        {tickValues(min, max, 5).map((tv, i) => (
          <g key={i}>
            <line x1={x(tv)} x2={x(tv)} y1={margin.top + h} y2={margin.top + h + 4} stroke={chartTheme.colors.axis} />
            <text x={x(tv)} y={margin.top + h + 18} fontSize={10} textAnchor="middle" fill={chartTheme.colors.axis}>
              {format(tv)}
            </text>
          </g>
        ))}

        {/* whiskers */}
        <line x1={x(Math.max(q.lowerFence, Math.min(...values)))} x2={x(Math.min(q.upperFence, Math.max(...values)))} y1={margin.top + h / 2} y2={margin.top + h / 2} stroke={chartTheme.colors.axis} />

        {/* box */}
        <rect
          x={x(q.q1)}
          y={margin.top + h / 2 - 18}
          width={Math.max(2, x(q.q3) - x(q.q1))}
          height={36}
          fill={chartTheme.colors.peerLight}
          stroke={chartTheme.colors.peer}
        />
        {/* median line */}
        <line x1={x(q.q2)} x2={x(q.q2)} y1={margin.top + h / 2 - 18} y2={margin.top + h / 2 + 18} stroke={chartTheme.colors.median} strokeWidth={2} />

        {/* outliers */}
        {[...outliersLow, ...outliersHigh].map((v, i) => (
          <circle key={i} cx={x(v)} cy={margin.top + h / 2} r={2.5} fill={chartTheme.colors.peer} />
        ))}

        {/* subject marker */}
        {typeof subjectValue === "number" && Number.isFinite(subjectValue) ? (
          <g>
            <circle cx={x(subjectValue)} cy={margin.top + h / 2} r={6} fill={chartTheme.colors.primary} />
            <text
              x={x(subjectValue)}
              y={margin.top + h / 2 - 14}
              fontSize={10}
              fontWeight={600}
              textAnchor="middle"
              fill={chartTheme.colors.primary}
            >
              subject {format(subjectValue)}
            </text>
          </g>
        ) : null}

        {/* axis label */}
        <text x={margin.left + w / 2} y={height - 4} fontSize={10} textAnchor="middle" fill={chartTheme.colors.axis}>
          {label}
        </text>
      </svg>
    </div>
  );
}

function tickValues(min: number, max: number, count: number): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}
