import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  delta?: { value: number; label?: string; positiveIsGood?: boolean } | null;
  className?: string;
}

export function KpiCard({ label, value, sublabel, delta, className }: KpiCardProps) {
  const positiveIsGood = delta?.positiveIsGood ?? true;
  const sign = delta ? (delta.value > 0 ? "+" : "") : "";
  const good = delta
    ? (positiveIsGood ? delta.value >= 0 : delta.value <= 0)
    : undefined;
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-4 pb-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {sublabel ? <span className="truncate">{sublabel}</span> : null}
          {delta && Number.isFinite(delta.value) ? (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular",
                good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {sign}
              {Math.abs(delta.value) < 10
                ? delta.value.toFixed(1)
                : Math.round(delta.value).toLocaleString()}
              {delta.label ? ` ${delta.label}` : null}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
