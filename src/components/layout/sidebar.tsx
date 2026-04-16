import Link from "next/link";
import { BarChart3, Building2, Home, Layers, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar({
  workbookMeta,
}: {
  workbookMeta: {
    fileName: string;
    parsedAt: string;
    counts: { properties: number; tenants: number; categories: number; observations: number; categoryMetrics: number; rejected: number };
  } | null;
}) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-primary text-primary-foreground grid place-items-center font-semibold">R</div>
          <div>
            <div className="text-sm font-semibold leading-tight">Retailer Analyzer</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Internal acquisitions tool</div>
          </div>
        </div>
      </div>

      <nav className="px-3 py-3 space-y-1 text-sm">
        <NavItem href="/" icon={<Home className="h-4 w-4" />}>Analyze</NavItem>
        <NavItem href="/peers" icon={<Users className="h-4 w-4" />}>Peer workspace</NavItem>
      </nav>

      <div className="mt-auto px-4 py-4 border-t">
        <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-2">Workbook</div>
        {workbookMeta ? (
          <>
            <div className="text-xs font-medium truncate">{workbookMeta.fileName}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              parsed {new Date(workbookMeta.parsedAt).toLocaleString()}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] tabular">
              <Stat icon={<Building2 className="h-3 w-3" />} label="properties" value={workbookMeta.counts.properties} />
              <Stat icon={<Users className="h-3 w-3" />} label="tenants" value={workbookMeta.counts.tenants} />
              <Stat icon={<Layers className="h-3 w-3" />} label="categories" value={workbookMeta.counts.categories} />
              <Stat icon={<BarChart3 className="h-3 w-3" />} label="obs" value={workbookMeta.counts.observations} />
            </div>
            {workbookMeta.counts.rejected > 0 && (
              <div className="mt-2 text-[11px] text-warning">
                {workbookMeta.counts.rejected} row(s) rejected
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            No workbook found.
            <div className="mt-2 text-[11px]">
              Drop an <code className="font-mono">.xlsx</code> into <code className="font-mono">data/</code>, or use the uploader on the homepage.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({ href, children, icon }: { href: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="font-medium text-foreground">{value.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  );
}
