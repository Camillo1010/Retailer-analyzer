"use client";
import { cn } from "@/lib/utils";

export interface HeatmapCell {
  rowLabel: string;
  colLabel: string;
  value: number | null;   // -1..1 where -1 = worst, 1 = best
  display?: string;
}

export function Heatmap({ cells, rowLabels, colLabels }: {
  cells: HeatmapCell[];
  rowLabels: string[];
  colLabels: string[];
}) {
  const byKey = new Map<string, HeatmapCell>();
  for (const c of cells) byKey.set(`${c.rowLabel}|${c.colLabel}`, c);

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full text-xs tabular">
        <thead>
          <tr>
            <th className="p-1.5 text-left font-medium text-muted-foreground"></th>
            {colLabels.map((c) => (
              <th key={c} className="p-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((r) => (
            <tr key={r}>
              <td className="p-1.5 text-right font-medium text-foreground whitespace-nowrap pr-3">{r}</td>
              {colLabels.map((c) => {
                const cell = byKey.get(`${r}|${c}`);
                return (
                  <td key={c} className="p-0.5">
                    <div
                      className={cn(
                        "flex h-8 min-w-[56px] items-center justify-center rounded text-[11px] font-medium",
                        cell ? colorFor(cell.value) : "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {cell?.display ?? "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function colorFor(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "bg-muted/40 text-muted-foreground";
  // clamp to -1..1
  const x = Math.max(-1, Math.min(1, v));
  if (x >= 0.5) return "bg-success/25 text-success";
  if (x >= 0.15) return "bg-success/10 text-success";
  if (x >= -0.15) return "bg-muted text-foreground";
  if (x >= -0.5) return "bg-destructive/10 text-destructive";
  return "bg-destructive/25 text-destructive";
}
