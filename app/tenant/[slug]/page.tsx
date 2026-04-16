import { notFound } from "next/navigation";
import Link from "next/link";
import { getWorkbook } from "@/lib/data/store";
import {
  findProperty,
  findTenant,
  observationsForTenant,
} from "@/lib/data/selectors";
import { mean, median, percentileRank, zScore } from "@/lib/analytics/stats";
import { tenantInsights } from "@/lib/analytics/insights";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/kpi/kpi-card";
import { InsightList } from "@/components/insights/insight-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankedBar } from "@/components/charts/ranked-bar";
import { ScatterPlot } from "@/components/charts/scatter";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default async function TenantPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { subject?: string; peers?: string };
}) {
  const wb = await getWorkbook();
  if (!wb) return notFound();
  const tenant = findTenant(wb, params.slug);
  if (!tenant) return notFound();
  const subjectId = searchParams.subject ?? null;
  const subject = subjectId ? findProperty(wb, subjectId) : null;

  const all = observationsForTenant(wb, tenant.id);
  const psfs = all.map((o) => o.salesPsf).filter((v): v is number => typeof v === "number");
  const chainMean = mean(psfs);
  const chainMedian = median(psfs);

  const subjectObs = subject ? all.find((o) => o.propertyId === subject.id) : undefined;
  const pctile = subjectObs?.salesPsf !== undefined ? percentileRank(subjectObs.salesPsf, psfs) : null;
  const z = subjectObs?.salesPsf !== undefined ? zScore(subjectObs.salesPsf, psfs) : null;

  const rows = all
    .map((o) => {
      const p = wb.properties.find((pp) => pp.id === o.propertyId);
      return { obs: o, property: p };
    })
    .filter((r) => r.property);

  const sortedByPsf = rows
    .filter((r) => typeof r.obs.salesPsf === "number")
    .sort((a, b) => (b.obs.salesPsf! - a.obs.salesPsf!));

  const best3 = sortedByPsf.slice(0, 3);
  const worst3 = sortedByPsf.slice(-3).reverse();

  const rankedData = sortedByPsf.map((r) => ({
    label: r.property!.name,
    value: r.obs.salesPsf as number,
    highlight: r.property!.id === subjectId,
  }));

  const scatterData = rows
    .filter((r) => typeof r.obs.salesPsf === "number" && typeof r.obs.occCostPct === "number")
    .map((r) => ({
      x: r.obs.salesPsf as number,
      y: (r.obs.occCostPct as number) * 100,
      label: r.property!.name,
      highlight: r.property!.id === subjectId,
    }));

  const insights = tenantInsights(wb, tenant, subjectId ?? "__none__");

  return (
    <div>
      <PageHeader
        eyebrow="Tenant analysis"
        title={tenant.name}
        subtitle={subject ? `Subject location: ${subject.name}` : "No subject property selected — showing chain view only"}
        breadcrumbs={[
          { href: "/", label: "Analyze" },
          subject ? { href: `/property/${subject.id}?peers=${searchParams.peers ?? "all"}`, label: subject.name } : { label: "—" },
          { label: tenant.name },
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KpiCard
          label="Subject PSF"
          value={subjectObs?.salesPsf !== undefined ? formatCurrency(subjectObs.salesPsf, 0) : "—"}
          sublabel={subject?.name}
        />
        <KpiCard
          label="Chain mean PSF"
          value={chainMean !== null ? formatCurrency(chainMean, 0) : "—"}
          sublabel={`n=${psfs.length} locations`}
        />
        <KpiCard
          label="Chain median PSF"
          value={chainMedian !== null ? formatCurrency(chainMedian, 0) : "—"}
        />
        <KpiCard
          label="Percentile at subject"
          value={pctile !== null ? formatPercent(pctile, 0) : "—"}
          delta={pctile !== null ? { value: (pctile - 0.5) * 100, label: "pp vs median", positiveIsGood: true } : null}
        />
        <KpiCard
          label="Z-score"
          value={z !== null ? z.toFixed(2) : "—"}
          sublabel="vs chain distribution"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-5">
        <Card>
          <CardHeader>
            <CardTitle>Store productivity across chain</CardTitle>
            <CardDescription>All locations of {tenant.name} in the dataset.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBar
              data={rankedData}
              median={chainMedian ?? undefined}
              valueFormat="currency"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales PSF vs occupancy cost</CardTitle>
            <CardDescription>Each point is one location. Subject is highlighted.</CardDescription>
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
              <div className="text-sm text-muted-foreground py-4">Not enough locations with both sales PSF and occupancy cost to plot.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-5">
        <LocationTable title="Best-performing locations" rows={best3} />
        <LocationTable title="Worst-performing locations" rows={worst3} />
      </div>

      <InsightList insights={insights} />

      <p className="mt-4 text-[11px] text-muted-foreground">
        Verdict reflects rule-based thresholds in the analytics config — not an absolute assessment of tenant quality.
      </p>
    </div>
  );
}

function LocationTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ obs: { salesPsf?: number; occCostPct?: number }; property: { id: string; name: string } | undefined }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead className="text-right">Sales PSF</TableHead>
              <TableHead className="text-right">Occ %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Link href={`/property/${r.property!.id}`} className="hover:underline">
                    {r.property!.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {typeof r.obs.salesPsf === "number" ? formatCurrency(r.obs.salesPsf, 0) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {typeof r.obs.occCostPct === "number" ? formatPercent(r.obs.occCostPct, 1) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
