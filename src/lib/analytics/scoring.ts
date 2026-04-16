import type { Category, ScoreComponent, SignalScore, Workbook } from "@/lib/types";
import { median, mean, stdDev, percentileRank } from "./stats";
import { THRESHOLDS, verdictFor } from "./thresholds";
import { PeerFrame } from "./peer-set";

/** Returns category-level subject psf vs peer median. */
export function subjectVsPeerCategory(frame: PeerFrame, categoryId: string): {
  subjectPsf: number | null;
  peerMedian: number | null;
  peerValues: number[];
  percentile: number | null;
} {
  const subjectMetric = frame.subjectMetrics.find((m) => m.categoryId === categoryId);
  const peerValues = frame.peerMetrics
    .filter((m) => m.categoryId === categoryId)
    .map((m) => m.salesPsf)
    .filter((v): v is number => typeof v === "number");
  const subjectPsf = subjectMetric?.salesPsf ?? null;
  return {
    subjectPsf,
    peerMedian: median(peerValues),
    peerValues,
    percentile: subjectPsf !== null ? percentileRank(subjectPsf, peerValues) : null,
  };
}

/** How many of the subject's categories are above / below the peer median. */
export function categoryBreakdown(frame: PeerFrame, categories: Category[]) {
  let above = 0;
  let below = 0;
  let topQuartile = 0;
  let bottomQuartile = 0;
  const items: Array<{
    category: Category;
    subjectPsf: number | null;
    peerMedian: number | null;
    percentile: number | null;
  }> = [];

  for (const c of categories) {
    const s = subjectVsPeerCategory(frame, c.id);
    items.push({ category: c, subjectPsf: s.subjectPsf, peerMedian: s.peerMedian, percentile: s.percentile });
    if (s.subjectPsf !== null && s.peerMedian !== null) {
      if (s.subjectPsf >= s.peerMedian) above++; else below++;
    }
    if (s.percentile !== null) {
      if (s.percentile >= THRESHOLDS.topQuartile) topQuartile++;
      if (s.percentile <= THRESHOLDS.bottomQuartile) bottomQuartile++;
    }
  }

  return { items, above, below, topQuartile, bottomQuartile };
}

/** Center Quality Signal — transparent, weighted. */
export function centerQualitySignal(
  wb: Workbook,
  frame: PeerFrame,
): SignalScore {
  const categories = wb.categories;
  const breakdown = categoryBreakdown(frame, categories);
  const observedCats = breakdown.items.filter((i) => i.subjectPsf !== null && i.peerMedian !== null);
  const nObs = observedCats.length;

  // 1. Tenant productivity vs peers — weighted mean psf subject vs peer median of the same
  const subjectPsfs = frame.subjectObs.map((o) => o.salesPsf).filter((v): v is number => typeof v === "number");
  const peerPsfs = frame.peerObs.map((o) => o.salesPsf).filter((v): v is number => typeof v === "number");
  const subjectMean = mean(subjectPsfs);
  const peerMean = mean(peerPsfs);
  const productivityScore = (() => {
    if (subjectMean === null || peerMean === null || peerMean === 0) return 50;
    const ratio = subjectMean / peerMean;
    return clamp((ratio - 0.6) / 0.8 * 100, 0, 100);
  })();

  // 2. Category breadth — how many categories the subject even participates in
  const categoryIdsAtSubject = new Set(observedCats.map((i) => i.category.id));
  const breadthScore = clamp((categoryIdsAtSubject.size / Math.max(1, categories.length)) * 100, 0, 100);

  // 3. Share of categories above peer median
  const aboveShareScore = nObs === 0 ? 50 : (breakdown.above / nObs) * 100;

  // 4. Top quartile category count (normalized by nObs)
  const topQuartileShare = nObs === 0 ? 0 : breakdown.topQuartile / nObs;
  const topQuartileScore = clamp(topQuartileShare * 150, 0, 100);

  // 5. Cross-category consistency — inverse std dev of percentile ranks
  const pctiles = observedCats.map((i) => i.percentile).filter((v): v is number => typeof v === "number");
  const sd = stdDev(pctiles);
  const consistencyScore = sd === null ? 50 : clamp(100 - sd * 200, 0, 100);

  // 6. Very weak category penalty (inverse) - how few bottom-quartile categories
  const bottomShare = nObs === 0 ? 0 : breakdown.bottomQuartile / nObs;
  const weaknessScore = clamp(100 - bottomShare * 150, 0, 100);

  const w = THRESHOLDS.centerQualityWeights;
  const components: ScoreComponent[] = [
    { label: "Tenant productivity vs peers",  value: productivityScore, weight: w.tenantProductivityVsPeers,
      note: peerMean && subjectMean ? `subject ${fmt(subjectMean)} vs peer ${fmt(peerMean)} avg psf` : "insufficient data" },
    { label: "Category breadth",              value: breadthScore,      weight: w.categoryBreadth,
      note: `${categoryIdsAtSubject.size} of ${categories.length} categories present` },
    { label: "% categories above peer median", value: aboveShareScore,   weight: w.shareCategoriesAboveMedian,
      note: `${breakdown.above} above / ${breakdown.below} below` },
    { label: "Top-quartile categories",        value: topQuartileScore,  weight: w.topQuartileTenantCount,
      note: `${breakdown.topQuartile} of ${nObs || "?"} categories in top quartile` },
    { label: "Cross-category consistency",     value: consistencyScore,  weight: w.crossCategoryConsistency,
      note: sd === null ? "insufficient data" : `percentile std dev ${(sd * 100).toFixed(1)}` },
    { label: "Weak-category resilience",       value: weaknessScore,     weight: w.veryWeakCategoryPenalty,
      note: `${breakdown.bottomQuartile} of ${nObs || "?"} categories in bottom quartile` },
  ];
  const score = weightedSum(components);
  return { name: "Center Quality Signal", score, components, verdict: verdictFor(score) };
}

/** Lease-Up Signal — estimates leasing attractiveness. */
export function leaseUpSignal(wb: Workbook, frame: PeerFrame): SignalScore {
  const categories = wb.categories;
  const breakdown = categoryBreakdown(frame, categories);
  const observedCats = breakdown.items.filter((i) => i.subjectPsf !== null && i.peerMedian !== null);
  const nObs = observedCats.length;

  // productivity (same signal shape as center quality, but higher weight)
  const subjectPsfs = frame.subjectObs.map((o) => o.salesPsf).filter((v): v is number => typeof v === "number");
  const peerPsfs = frame.peerObs.map((o) => o.salesPsf).filter((v): v is number => typeof v === "number");
  const subjectMean = mean(subjectPsfs);
  const peerMean = mean(peerPsfs);
  const productivity = (() => {
    if (subjectMean === null || peerMean === null || peerMean === 0) return 50;
    return clamp((subjectMean / peerMean - 0.6) / 0.8 * 100, 0, 100);
  })();

  // breadth of strong (top 66th pctile) categories
  const strong = observedCats.filter((i) => (i.percentile ?? 0) >= THRESHOLDS.strongPercentile).length;
  const strongShare = nObs === 0 ? 0 : strong / nObs;
  const strongBreadth = clamp(strongShare * 150, 0, 100);

  // national-tenant outperformance rate: tenants present at >=3 properties whose subject psf >= their tenant median
  const tenantsWithMany = new Map<string, number[]>();
  for (const o of wb.observations) {
    if (typeof o.salesPsf !== "number") continue;
    if (!tenantsWithMany.has(o.tenantId)) tenantsWithMany.set(o.tenantId, []);
    tenantsWithMany.get(o.tenantId)!.push(o.salesPsf);
  }
  let natEval = 0;
  let natWin = 0;
  for (const o of frame.subjectObs) {
    if (typeof o.salesPsf !== "number") continue;
    const all = tenantsWithMany.get(o.tenantId) ?? [];
    if (all.length < 3) continue;
    const med = median(all);
    if (med === null) continue;
    natEval++;
    if (o.salesPsf >= med) natWin++;
  }
  const natScore = natEval === 0 ? 50 : clamp((natWin / natEval) * 100, 0, 100);

  // consistency of strong categories (reuse stdDev of pctiles)
  const pctiles = observedCats.map((i) => i.percentile).filter((v): v is number => typeof v === "number");
  const sd = stdDev(pctiles);
  const consistency = sd === null ? 50 : clamp(100 - sd * 200, 0, 100);

  const w = THRESHOLDS.leaseUpWeights;
  const components: ScoreComponent[] = [
    { label: "Tenant productivity",        value: productivity,   weight: w.tenantProductivity,
      note: peerMean && subjectMean ? `subject ${fmt(subjectMean)} vs peer ${fmt(peerMean)} avg psf` : "insufficient data" },
    { label: "Strong-category breadth",    value: strongBreadth,  weight: w.strongCategoryBreadth,
      note: `${strong} of ${nObs || "?"} categories at / above peer 66th pctile` },
    { label: "National-tenant outperformance", value: natScore,   weight: w.nationalTenantOutperformance,
      note: natEval === 0 ? "no eligible multi-location tenants" : `${natWin}/${natEval} multi-location tenants at or above chain median` },
    { label: "Category strength consistency",  value: consistency, weight: w.categoryStrengthConsistency,
      note: sd === null ? "insufficient data" : `percentile std dev ${(sd * 100).toFixed(1)}` },
  ];
  const score = weightedSum(components);
  return { name: "Lease-Up Signal", score, components, verdict: verdictFor(score) };
}

// ---- helpers ----

function weightedSum(components: ScoreComponent[]): number {
  let num = 0;
  let den = 0;
  for (const c of components) {
    num += c.value * c.weight;
    den += c.weight;
  }
  return den === 0 ? 0 : Math.round(num / den);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function fmt(n: number) {
  return `$${n.toFixed(0)}`;
}
