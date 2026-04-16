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

export function ScatterPlot({
  data,
  xLabel,
  yLabel,
  height = 320,
  xFormat,
  yFormat,
}: {
  data: ScatterDatum[];
  xLabel: string;
  yLabel: string;
  height?: number;
  xFormat?: (n: number) => string;
  yFormat?: (n: number) => string;
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
            tickFormatter={xFormat}
          >
            <Label value={xLabel} offset={-10} position="insideBottom" fontSize={11} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            stroke={chartTheme.colors.axis}
            tick={{ fontSize: chartTheme.font.size }}
            tickFormatter={yFormat}
          >
            <Label value={yLabel} angle={-90} position="insideLeft" fontSize={11} />
          </YAxis>
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(v: number, name: string) => {
              const f = name === "x" ? xFormat : name === "y" ? yFormat : undefined;
              return [f ? f(v) : v.toLocaleString(), name === "x" ? xLabel : name === "y" ? yLabel : name];
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
