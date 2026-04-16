import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkbook } from "@/lib/data/store";
import { findProperty, parsePeerScope, resolvePeers } from "@/lib/data/selectors";
import { buildPeerFrame } from "@/lib/analytics/peer-set";
import { categoryBreakdown, centerQualitySignal, leaseUpSignal, subjectVsPeerCategory } from "@/lib/analytics/scoring";
import { propertyInsights } from "@/lib/analytics/insights";
import { median, percentileRank, weightedMean } from "@/lib/analytics/stats";
import { THRESHOLDS } from "@/lib/analytics/thresholds";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/kpi/kpi-card";
import { ScoreCard } from "@/components/insights/score-card";
import { InsightList } from "@/components/insights/insight-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankedBar } from "@/components/charts/ranked-bar";
import { Heatmap, type HeatmapCell } from "@/components/charts/heatmap";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { peers?: string };
}) {
  const wb = await getWorkbook();
  if (!wb) return notFound();
  const property = findProperty(wb, params.slug);
  if (!property) return notFound();

  const peerScope = parsePeerScope(searchParams.peers ?? "all");
  const peerIds = resolvePeers(wb, property.id, peerScope);
  const frame = buildPeerFrame(wb, property.id, peerIds);

  // Headline KPIs
  const tenantCount = new Set(frame.subjectObs.map((o) => o.tenantId)).size;
  const totalSqft = frame.subjectObs
    .map((o) => o.sqft ?? 0)
    .reduce((a, b) => a + b, 0) || property.totalSqft || null;

  const subjectWeightedPsf = weightedMean(
    frame.subjectObs.map((o) => o.salesPsf),
    frame.subjectObs.map((o) => o.sqft),
  );
  const peerWeightedPsfs = peerIds.map((pid) => {
    const obs = wb.observations.filter((o) => o.propertyId === pid);
    return weightedMean(obs.map((o) => o.salesPsf), obs.map((o) => o.sqft));
  }).filter((v): v is number => typeof v === "number");
  const peerWeightedMedian = median(peerWeightedPsfs);
  const propertyRank = subjectWeightedPsf !== null
    ? [subjectWeightedPsf, ...peerWeightedPsfs].sort((a, b) => b - a).indexOf(subjectWeightedPsf) + 1
    : null;
  const propertyPercentile = percentileRank(subjectWeightedPsf, peerWeightedPsfs);

  const subjectWeightedOcc = weightedMean(
    frame.subjectObs.map((o) => o.occCostPct),
    frame.subjectObs.map((o) => o.sqft),
  );
  const peerWeightedOccs = peerIds.map((pid) => {
    const obs = wb.observations.filter((o) => o.propertyId === pid);
    return weightedMean(obs.map((o) => o.occCostPct), obs.map((o) => o.sqft));
  }).filter((v): v is number => typeof v === "number");
  const peerOccMedian = median(peerWeightedOccs);

  const breakdown = categoryBreakdown(frame, wb.categories);
  const aboveShare = breakdown.above + breakdown.below > 0
    ? breakdown.above / (breakdown.above + breakdown.below)
    : null;

  // Category table rows
  const categoryRows = breakdown.items
    .filter((i) => i.subjectPsf !== null || i.peerMedian !== null)
    .map((i) => {
      const v = subjectVsPeerCategory(frame, i.category.id);
      const delta = i.subjectPsf !== null && i.peerMedian !== null ? i.subjectPsf - i.peerMedian : null;
      return {
        id: i.category.id,
        name: i.category.name,
        subjectPsf: i.subjectPsf,
        peerMedian: i.peerMedian,
        delta,
        percentile: v.percentile,
        peerN: v.peerValues.length,
      };
    })
    .sort((a, b) => (b.percentile ?? -1) - (a.percentile ?? -1));

  // Ranked bar data for category psf
  const rankedData = categoryRows
    .filter((r) => r.subjectPsf !== null)
    .map((r) => ({
      label: r.name,
      value: r.subjectPsf as number,
      highlight: (r.percentile ?? 0) >= THRESHOLDS.topQuartile,
    }));
  const overallPeerMedianPsf = median(categoryRows.map((r) => r.peerMedian));

  // Heatmap vs top few peers
  const topPeers = peerIds
    .map((pid) => {
      const obs = wb.observations.filter((o) => o.propertyId === pid);
      const w = weightedMean(obs.map((o) => o.salesPsf), obs.map((o) => o.sqft));
      const p = wb.properties.find((p) => p.id === pid)!;
      return { id: p.id, name: p.name, weightedPsf: w };
    })
    .filter((p) => typeof p.weightedPsf === "number")
    .sort((a, b) => (b.weightedPsf! - a.weightedPsf!))
    .slice(0, 6);
  const heatmapRows = [property.name, ...topPeers.map((p) => p.name)];
  const heatmapCols = breakdown.items
    .filter((i) => i.subjectPsf !== null || i.peerMedian !== null)
    .slice(0, 12)
    .map((i) => i.category.name);

  const heatmapCells: HeatmapCell[] = [];
  for (const c of heatmapCols) {
    const cat = wb.categories.find((cc) => cc.name === c);
    if (!cat) continue;
    const allPsfs = wb.categoryMetrics.filter((m) => m.categoryId === cat.id).map((m) => m.salesPsf).filter((v): v is number => typeof v === "number");
    const pushCell = (propId: string, rowLabel: string) => {
      const m = wb.categoryMetrics.find((x) => x.propertyId === propId && x.categoryId === cat.id);
      const psf = m?.salesPsf ?? null;
      const pctile = psf !== null ? percentileRank(psf, allPsfs) : null;
      heatmapCells.push({
        rowLabel,
        colLabel: c,
        value: pctile === null ? null : pctile * 2 - 1,
        display: psf !== null ? `$${Math.round(psf)}` : "—",
      });
    };
    pushCell(property.id, property.name);
    for (const p of topPeers) pushCell(p.id, p.name);
  }

  const cqs = centerQualitySignal(wb, frame);
  const lus = leaseUpSignal(wb, frame);
  const insights = propertyInsights(wb, property, frame);

  const peerDescriptor = peerScope.kind === "all"
    ? `vs ${peerIds.length} peer properties`
    : `vs ${peerIds.length} manually selected peers`;

  return (
    <div>
      <PageHeader
        eyebrow="Property overview"
        title={property.name}
        subtitle={peerDescriptor}
        breadcrumbs={[{ href: "/", label: "Analyze" }, { label: property.name }]}
        rightSlot={
          <div className="flex items-center gap-2">
            <Link href={`/peers?subject=${property.id}&peers=${searchParams.peers ?? "all"}`} className="text-xs text-primary hover:underline">
              Open peer workspace →
            </Link>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Tenants" value={formatNumber(tenantCount)} sublabel="in dataset" />
        <KpiCard label="Total SF" value={totalSqft ? formatNumber(totalSqft) : "—"} sublabel="sum of observed" />
        <KpiCard
          label="Wtd sales PSF"
          value={subjectWeightedPsf !== null ? formatCurrency(subjectWeightedPsf, 0) : "—"}
          sublabel={peerWeightedMedian !== null ? `peer median ${formatCurrency(peerWeightedMedian, 0)}` : undefined}
          delta={subjectWeightedPsf !== null && peerWeightedMedian !== null ? {
            value: subjectWeightedPsf - peerWeightedMedian, label: "vs median", positiveIsGood: true,
          } : null}
        />
        <KpiCard
          label="Wtd occ cost"
          value={subjectWeightedOcc !== null ? formatPercent(subjectWeightedOcc, 1) : "—"}
          sublabel={peerOccMedian !== null ? `peer median ${formatPercent(peerOccMedian, 1)}` : undefined}
          delta={subjectWeightedOcc !== null && peerOccMedian !== null ? {
            value: (subjectWeightedOcc - peerOccMedian) * 100, label: "pp vs median", positiveIsGood: false,
          } : null}
        />
        <KpiCard
          label="Property rank"
          value={propertyRank !== null ? `#${propertyRank}` : "—"}
          sublabel={propertyPercentile !== null ? `${Math.round(propertyPercentile * 100)}th pctile` : undefined}
        />
        <KpiCard
          label="Cats above median"
          value={aboveShare !== null ? formatPercent(aboveShare, 0) : "—"}
          sublabel={`${breakdown.above} of ${breakdown.above + breakdown.below} categories`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-5">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category performance vs peers</CardTitle>
              <CardDescription>Bars show subject sales PSF. Highlighted bars sit in the top quartile of peers.</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBar
                data={rankedData}
                median={overallPeerMedianPsf}
                valueFormat="currency"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category detail</CardTitle>
              <CardDescription>Subject vs peer median with percentile rank and peer N.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Subject PSF</TableHead>
                    <TableHead className="text-right">Peer median</TableHead>
                    <TableHead className="text-right">Δ vs median</TableHead>
                    <TableHead className="text-right">Percentile</TableHead>
                    <TableHead className="text-right">Peer N</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/category/${r.id}?subject=${property.id}&peers=${searchParams.peers ?? "all"}`} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{r.subjectPsf !== null ? formatCurrency(r.subjectPsf, 0) : "—"}</TableCell>
                      <TableCell className="text-right">{r.peerMedian !== null ? formatCurrency(r.peerMedian, 0) : "—"}</TableCell>
                      <TableCell className="text-right">
                        {r.delta !== null ? (
                          <span className={r.delta >= 0 ? "text-success" : "text-destructive"}>
                            {r.delta >= 0 ? "+" : ""}{formatCurrency(r.delta, 0)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{r.percentile !== null ? formatPercent(r.percentile, 0) : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.peerN}</TableCell>
                      <TableCell>
                        {r.percentile !== null && r.percentile >= THRESHOLDS.topQuartile ? (
                          <Badge variant="success">Top Q</Badge>
                        ) : r.percentile !== null && r.percentile <= THRESHOLDS.bottomQuartile ? (
                          <Badge variant="danger">Bottom Q</Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {heatmapCols.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Category percentile heatmap</CardTitle>
                <CardDescription>Subject and top-performing peers across categories. Color = percentile vs full peer set.</CardDescription>
              </CardHeader>
              <CardContent>
                <Heatmap cells={heatmapCells} rowLabels={heatmapRows} colLabels={heatmapCols} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <ScoreCard score={cqs} />
          <ScoreCard score={lus} subtitle="Inference — not certainty" />
        </div>
      </div>

      <InsightList insights={insights} title="What the data suggests" />

      <p className="mt-4 text-[11px] text-muted-foreground">
        All numbers are derived from the uploaded workbook. Scores and insights are rules-based
        and traceable to the thresholds in <code className="font-mono">src/lib/analytics/thresholds.ts</code>.
        None of the verdicts are guarantees of future leasing or investment outcomes.
      </p>
    </div>
  );
}
