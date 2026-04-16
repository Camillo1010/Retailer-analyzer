import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkbook } from "@/lib/data/store";
import {
  findProperty,
  parsePeerScope,
  resolvePeers,
} from "@/lib/data/selectors";
import { buildPeerFrame } from "@/lib/analytics/peer-set";
import { categoryBreakdown, subjectVsPeerCategory } from "@/lib/analytics/scoring";
import { percentileRank } from "@/lib/analytics/stats";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heatmap, type HeatmapCell } from "@/components/charts/heatmap";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default async function PeersPage({ searchParams }: { searchParams: { subject?: string; peers?: string } }) {
  const wb = await getWorkbook();
  if (!wb) return notFound();
  const subjectId = searchParams.subject ?? null;
  if (!subjectId) {
    return (
      <div className="max-w-xl">
        <PageHeader title="Peer workspace" subtitle="Pick a subject property on the homepage, then return here." />
        <Link href="/" className="text-sm text-primary hover:underline">Go to Analyze →</Link>
      </div>
    );
  }
  const subject = findProperty(wb, subjectId);
  if (!subject) return notFound();

  const peerScope = parsePeerScope(searchParams.peers ?? "all");
  const peerIds = resolvePeers(wb, subject.id, peerScope);
  const frame = buildPeerFrame(wb, subject.id, peerIds);
  const breakdown = categoryBreakdown(frame, wb.categories);

  // Tenant overlap
  const subjectTenants = new Set(frame.subjectObs.map((o) => o.tenantId));
  const peerTenants = new Set(frame.peerObs.map((o) => o.tenantId));
  const shared = [...subjectTenants].filter((t) => peerTenants.has(t));
  const uniqueToSubject = [...subjectTenants].filter((t) => !peerTenants.has(t));

  // Rank heatmap across subject + top N peers
  const topPeers = peerIds.slice(0, 8).map((id) => wb.properties.find((p) => p.id === id)!).filter(Boolean);
  const heatmapRows = [subject.name, ...topPeers.map((p) => p.name)];
  const heatmapCols = breakdown.items
    .filter((i) => i.subjectPsf !== null || i.peerMedian !== null)
    .slice(0, 10)
    .map((i) => i.category.name);
  const cells: HeatmapCell[] = [];
  for (const col of heatmapCols) {
    const cat = wb.categories.find((c) => c.name === col);
    if (!cat) continue;
    const universe = wb.categoryMetrics.filter((m) => m.categoryId === cat.id).map((m) => m.salesPsf).filter((v): v is number => typeof v === "number");
    for (const rowProp of [subject, ...topPeers]) {
      const m = wb.categoryMetrics.find((x) => x.propertyId === rowProp.id && x.categoryId === cat.id);
      const psf = m?.salesPsf ?? null;
      const p = psf !== null ? percentileRank(psf, universe) : null;
      cells.push({
        rowLabel: rowProp.name,
        colLabel: col,
        value: p === null ? null : p * 2 - 1,
        display: psf !== null ? `$${Math.round(psf)}` : "—",
      });
    }
  }

  const sortedDeltas = breakdown.items
    .map((i) => {
      const v = subjectVsPeerCategory(frame, i.category.id);
      if (v.subjectPsf === null || v.peerMedian === null) return null;
      return { name: i.category.name, id: i.category.id, delta: v.subjectPsf - v.peerMedian, percentile: v.percentile };
    })
    .filter((x): x is { name: string; id: string; delta: number; percentile: number | null } => !!x)
    .sort((a, b) => b.delta - a.delta);
  const strengths = sortedDeltas.slice(0, 5);
  const weaknesses = sortedDeltas.slice(-5).reverse();

  return (
    <div>
      <PageHeader
        eyebrow="Peer workspace"
        title={subject.name}
        subtitle={`${peerIds.length} peers · ${peerScope.kind === "all" ? "all properties" : "manual selection"}`}
        breadcrumbs={[{ href: "/", label: "Analyze" }, { label: "Peer workspace" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category scorecards</CardTitle>
            <CardDescription>Subject sales PSF vs peer median, per category.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Subject</TableHead>
                  <TableHead className="text-right">Peer median</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.items
                  .filter((i) => i.subjectPsf !== null || i.peerMedian !== null)
                  .map((i) => {
                    const delta = i.subjectPsf !== null && i.peerMedian !== null ? i.subjectPsf - i.peerMedian : null;
                    return (
                      <TableRow key={i.category.id}>
                        <TableCell>
                          <Link href={`/category/${i.category.id}?subject=${subject.id}&peers=${searchParams.peers ?? "all"}`} className="hover:underline font-medium">
                            {i.category.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{i.subjectPsf !== null ? formatCurrency(i.subjectPsf, 0) : "—"}</TableCell>
                        <TableCell className="text-right">{i.peerMedian !== null ? formatCurrency(i.peerMedian, 0) : "—"}</TableCell>
                        <TableCell className="text-right">
                          {delta !== null ? (
                            <span className={delta >= 0 ? "text-success" : "text-destructive"}>
                              {delta >= 0 ? "+" : ""}{formatCurrency(delta, 0)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {i.percentile !== null && i.percentile >= 0.75 ? (
                            <Badge variant="success">Top Q</Badge>
                          ) : i.percentile !== null && i.percentile <= 0.25 ? (
                            <Badge variant="danger">Bottom Q</Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top strengths</CardTitle>
              <CardDescription>Largest positive deltas vs peer median.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {strengths.length === 0 ? (
                <div className="text-sm text-muted-foreground">No positive deltas available.</div>
              ) : strengths.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <Link href={`/category/${s.id}?subject=${subject.id}&peers=${searchParams.peers ?? "all"}`} className="truncate hover:underline">
                    {s.name}
                  </Link>
                  <span className="text-success tabular">+{formatCurrency(s.delta, 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top weaknesses</CardTitle>
              <CardDescription>Largest negative deltas vs peer median.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {weaknesses.length === 0 ? (
                <div className="text-sm text-muted-foreground">No negative deltas available.</div>
              ) : weaknesses.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <Link href={`/category/${s.id}?subject=${subject.id}&peers=${searchParams.peers ?? "all"}`} className="truncate hover:underline">
                    {s.name}
                  </Link>
                  <span className="text-destructive tabular">{formatCurrency(s.delta, 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Tenant overlap</CardTitle>
          <CardDescription>How much of the subject tenant mix appears in the peer set.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Subject tenants</div>
            <div className="text-xl font-semibold tabular">{subjectTenants.size}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Shared w/ peers</div>
            <div className="text-xl font-semibold tabular">{shared.length}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Unique to subject</div>
            <div className="text-xl font-semibold tabular">{uniqueToSubject.length}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Peer-only tenants</div>
            <div className="text-xl font-semibold tabular">
              {[...peerTenants].filter((t) => !subjectTenants.has(t)).length}
            </div>
          </div>
        </CardContent>
      </Card>

      {heatmapCols.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Category percentile heatmap</CardTitle>
            <CardDescription>Percentile of each property&apos;s category PSF vs full dataset.</CardDescription>
          </CardHeader>
          <CardContent>
            <Heatmap cells={cells} rowLabels={heatmapRows} colLabels={heatmapCols} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
