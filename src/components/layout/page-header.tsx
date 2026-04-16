import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  rightSlot,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ href?: string; label: string }>;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {b.href ? (
                <Link href={b.href} className="hover:text-foreground">{b.label}</Link>
              ) : (
                <span>{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wide">{eyebrow}</Badge>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {rightSlot}
      </div>
    </div>
  );
}
