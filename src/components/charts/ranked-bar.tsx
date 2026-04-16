"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "./chart-theme";

export interface RankedBarDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

export function RankedBar({
  data,
  median,
  height = 320,
  valuePrefix = "",
  valueSuffix = "",
  valueFormat,
}: {
  data: RankedBarDatum[];
  median?: number | null;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  valueFormat?: (n: number) => string;
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ top: 6, right: 16, bottom: 6, left: 4 }}>
          <CartesianGrid horizontal={false} stroke={chartTheme.colors.grid} />
          <XAxis
            type="number"
            stroke={chartTheme.colors.axis}
            tickFormatter={valueFormat ?? ((v) => `${valuePrefix}${v.toLocaleString()}${valueSuffix}`)}
            tick={{ fontSize: chartTheme.font.size }}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke={chartTheme.colors.axis}
            width={180}
            tick={{ fontSize: chartTheme.font.size }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(v: number) => [
              valueFormat ? valueFormat(v) : `${valuePrefix}${v.toLocaleString()}${valueSuffix}`,
              "value",
            ]}
          />
          {median !== undefined && median !== null ? (
            <ReferenceLine x={median} stroke={chartTheme.colors.median} strokeDasharray="4 3" label={{
              value: "peer median", fill: chartTheme.colors.median, fontSize: 10, position: "insideTopRight",
            }} />
          ) : null}
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {sorted.map((d, i) => (
              <Cell
                key={i}
                fill={d.highlight ? chartTheme.colors.primary : chartTheme.colors.peer}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
