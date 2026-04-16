import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkbook } from "@/lib/data/store";
import {
  findCategory,
  findProperty,
  parsePeerScope,
  resolvePeers,
} from "@/lib/data/selectors";
import { buildPeerFrame } from "@/lib/analytics/peer-set";
import { categoryInsights } from "@/lib/analytics/insights";
import { subjectVsPeerCategory } from "@/lib/analytics/scoring";
import { median, percentileRank } from "@/lib/analytics/stats";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/kpi/kpi-card";
import { InsightList } from "@/components/insights/insight-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BoxPlot } from "@/components/charts/box-plot";
import { ScatterPlot } from "@/components/charts/scatter";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { subject?: string; peers?: string };
}) {
  const wb = await getWorkbook();
  if (!wb) return notFound();
  const category = findCategory(wb, params.slug);
  if (!category) return notFound();
  const subjectId = searchParams.subject ?? null;
  const subject = subjectId ? findProperty(wb, subjectId) : null;

  const allMetrics = wb.categoryMetrics.filter((m) => m.categoryId === category.id);
  const allPsfs = allMetrics.map((m) => m.salesPsf).filter((v): v is number => typeof v === "number");

  const peerScope = parsePeerScope(searchParams.peers ?? "all");
  const peerIds = subject ? resolvePeers(wb, subject.id, peerScope) : allMetrics.map((m) => m.propertyId);
  const frame = subject ? buildPeerFrame(wb, subject.id, peerIds) : null;

  const compare = subject && frame ? subjectVsPeerCategory(frame, category.id) : null;
  const subjectMetric = subject ? allMetrics.find((m) => m.propertyId === subject.id) : undefined;

  const rows = allMetrics
    .map((m) => ({
      m,
      property: wb.properties.find((p) => p.id === m.propertyId),
    }))
    .filter((r) => r.property)
    .sort((a, b) => (b.m.salesPsf ?? -1) - (a.m.salesPsf ?? -1));
  const ranks = rows.map((r, i) => ({ id: r.property!.id, rank: i + 1 }));
  const subjectRank = subject ? ranks.find((r) => r.id === subject.id)?.rank ?? null : null;

  const scatterData = rows
    .filter((r) => typeof r.m.salesPsf === "number" && typeof r.m.occCostPct === "number")
    .map((r) => ({
      x: r.m.salesPsf as number,
      y: (r.m.occCostPct as number) * 100,
      label: r.property!.name,
      highlight: subject ? r.property!.id === subject.id : false,
    }));

  const insights = subject && frame ? categoryInsights(wb, category, frame) : [];

  const peerMedian = compare?.peerMedian ?? median(allPsfs);

  return (
    <div>
      <PageHeader
        eyebrow="Category analysis"
        title={category.name}
        subtitle={subject ? `Subject: ${subject.name}` : "No subject selected — showing distribution only"}
        breadcrumbs={[
          { href: "/", label: "Analyze" },
          subject ? { href: `/property/${subject.id}?peers=${searchParams.peers ?? "all"}`, label: subject.name } : { label: "—" },
          { label: category.name },
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KpiCard
          label="Subject PSF"
          value={subjectMetric?.salesPsf !== undefined ? formatCurrency(subjectMetric.salesPsf!, 0) : "—"}
          sublabel={subject?.name}
        />
        <KpiCard
          label="Peer median PSF"
          value={peerMedian !== null ? formatCurrency(peerMedian, 0) : "—"}
          sublabel={`n=${allPsfs.length} properties`}
        />
        <KpiCard
          label="Percentile"
          value={compare?.percentile !== null && compare?.percentile !== undefined
            ? formatPercent(compare.percentile, 0)
            : subjectMetric?.salesPsf !== undefined
              ? formatPercent(percentileRank(subjectMetric.salesPsf!, allPsfs) ?? 0, 0)
              : "—"}
        />
        <KpiCard
          label="Rank"
          value={subjectRank !== null ? `#${subjectRank}` : "—"}
          sublabel={`of ${rows.length}`}
        />
        <KpiCard
          label="Subject SF"
          value={subjectMetric?.sqft !== undefined ? formatNumber(subjectMetric.sqft!) : "—"}
          sublabel={subjectMetric?.sales !== undefined ? `sales ${formatCurrency(subjectMetric.sales!, 0)}` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-5">
        <Card>
          <CardHeader>
            <CardTitle>PSF distribution</CardTitle>
            <CardDescription>Box plot of category sales PSF across all properties in the dataset.</CardDescription>
          </CardHeader>
          <CardContent>
            <BoxPlot
              values={allPsfs}
              subjectValue={subjectMetric?.salesPsf ?? null}
              label="sales PSF"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>PSF vs occupancy cost</CardTitle>
            <CardDescription>Each point is one property&apos;s category metric.</CardDescription>
          </CardHeader>
          <CardContent>
            {scatterData.length >= 3 ? (
              <ScatterPlot
                data={scatterData}
                xLabel="sales PSF"
                yLabel="occupancy %"
                xFormat="currency"
                yFormat="percent"
              />
            ) : (
              <div className="text-sm text-muted-foreground py-4">Not enough properties with both metrics to plot.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>All properties — {category.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead className="text-right">Sales PSF</TableHead>
                <TableHead className="text-right">Occ %</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">SF</TableHead>
                <TableHead className="text-right">Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.property!.id} className={subject && r.property!.id === subject.id ? "bg-primary/5" : undefined}>
                  <TableCell>
                    <Link href={`/property/${r.property!.id}?peers=${searchParams.peers ?? "all"}`} className="font-medium hover:underline">
                      {r.property!.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{typeof r.m.salesPsf === "number" ? formatCurrency(r.m.salesPsf, 0) : "—"}</TableCell>
                  <TableCell className="text-right">{typeof r.m.occCostPct === "number" ? formatPercent(r.m.occCostPct, 1) : "—"}</TableCell>
                  <TableCell className="text-right">{typeof r.m.sales === "number" ? formatCurrency(r.m.sales, 0) : "—"}</TableCell>
                  <TableCell className="text-right">{typeof r.m.sqft === "number" ? formatNumber(r.m.sqft) : "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">#{i + 1}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InsightList insights={insights} />
    </div>
  );
}
