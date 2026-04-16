import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityMap = {
  positive: { variant: "success", label: "Strength" },
  negative: { variant: "danger", label: "Risk" },
  neutral:  { variant: "muted",   label: "Neutral" },
  info:     { variant: "warning", label: "Note" },
} as const;

export function InsightList({
  insights,
  title = "What the data suggests",
  emptyText = "No rule-based signals fired for this selection.",
}: {
  insights: Insight[];
  title?: string;
  emptyText?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          insights.map((i) => <InsightCard key={i.id} insight={i} />)
        )}
      </CardContent>
    </Card>
  );
}

export function InsightCard({ insight }: { insight: Insight }) {
  const meta = severityMap[insight.severity];
  return (
    <div className={cn("rounded-md border p-3", borderFor(insight.severity))}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium leading-tight">{insight.headline}</div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{insight.detail}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground tabular">
        {insight.evidence.map((e, i) => (
          <span key={i}>
            <span className="font-medium text-foreground/80">{e.label}:</span> {String(e.value)}
            {e.threshold !== undefined ? (
              <span className="ml-1 opacity-70">(threshold {String(e.threshold)})</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function borderFor(sev: Insight["severity"]): string {
  switch (sev) {
    case "positive": return "border-success/30 bg-success/5";
    case "negative": return "border-destructive/30 bg-destructive/5";
    case "info":     return "border-warning/30 bg-warning/5";
    default:         return "border-border bg-muted/30";
  }
}
