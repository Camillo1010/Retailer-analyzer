import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignalScore } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScoreCard({ score, subtitle }: { score: SignalScore; subtitle?: string }) {
  const tone =
    score.score >= 70 ? "text-success" :
    score.score >= 50 ? "text-foreground" :
    score.score >= 35 ? "text-warning" : "text-destructive";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
          <CardTitle>{score.name}</CardTitle>
          <div className={cn("text-3xl font-semibold tabular tracking-tight", tone)}>
            {score.score}
            <span className="ml-1 text-sm font-medium text-muted-foreground">/100</span>
          </div>
        </div>
        <CardDescription>
          {score.verdict}
          {subtitle ? ` · ${subtitle}` : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {score.components.map((c) => (
          <div key={c.label}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="tabular font-medium">
                {Math.round(c.value)}
                <span className="ml-1 text-muted-foreground">× {(c.weight * 100).toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  c.value >= 70 ? "bg-success" : c.value >= 50 ? "bg-primary" :
                  c.value >= 35 ? "bg-warning" : "bg-destructive",
                )}
                style={{ width: `${Math.max(0, Math.min(100, c.value))}%` }}
              />
            </div>
            {c.note ? <div className="mt-0.5 text-[11px] text-muted-foreground">{c.note}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
