"use client";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
  Label,
} from "recharts";
import { chartTheme } from "./chart-theme";

export interface ScatterDatum {
  x: number;
  y: number;
  label: string;
  highlight?: boolean;
}

export type ScatterFormat = "currency" | "percent" | "number";

function format(v: number, mode: ScatterFormat): string {
  switch (mode) {
    case "currency": return `$${v.toFixed(0)}`;
    case "percent": return `${v.toFixed(1)}%`;
    default: return v.toLocaleString();
  }
}

export function ScatterPlot({
  data,
  xLabel,
  yLabel,
  height = 320,
  xFormat = "number",
  yFormat = "number",
}: {
  data: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  height?: number;
  xFormat?: ScatterFormat;
  yFormat?: ScatterFormat;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 10 }}>
          <CartesianGrid stroke={chartTheme.colors.grid} />
          <XAxis
            type="number"
            dataKey="x"
            stroke={chartTheme.colors.axis}
            tick={{ fontSize: chartTheme.font.size }}
            tickFormatter={(v: number) => format(v, xFormat)}
          >
            <Label value={xLabel} offset={-10} position="insideBottom" fontSize={11} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            stroke={chartTheme.colors.axis}
            tick={{ fontSize: chartTheme.font.size }}
            tickFormatter={(v: number) => format(v, yFormat)}
          >
            <Label value={yLabel} angle={-90} position="insideLeft" fontSize={11} />
          </YAxis>
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(v: number, name: string) => {
              const f = name === "x" ? xFormat : name === "y" ? yFormat : "number";
              return [format(v, f), name === "x" ? xLabel : name === "y" ? yLabel : name];
            }}
            labelFormatter={() => ""}
          />
          <Scatter data={data}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.highlight ? chartTheme.colors.primary : chartTheme.colors.peer} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
