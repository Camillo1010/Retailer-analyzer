import type {
  Category,
  Insight,
  Property,
  Tenant,
  Workbook,
} from "@/lib/types";
import { mean, median, percentileRank } from "./stats";
import { THRESHOLDS } from "./thresholds";
import { PeerFrame } from "./peer-set";
import { subjectVsPeerCategory } from "./scoring";

/* ------------ PROPERTY-LEVEL RULES ------------ */

export function propertyInsights(
  wb: Workbook,
  property: Property,
  frame: PeerFrame,
): Insight[] {
  const out: Insight[] = [];
  if (frame.peerIds.length < THRESHOLDS.minPeerN) {
    out.push({
      id: "low-peer-n",
      severity: "info",
      scope: "property",
      headline: "Peer set is thin",
      detail: `Only ${frame.peerIds.length} comparable properties in the selected peer set. Inferences below should be read as directional rather than conclusive.`,
      evidence: [{ label: "peer count", value: frame.peerIds.length, threshold: `>= ${THRESHOLDS.minPeerN}` }],
    });
  }

  // per-category rules
  for (const c of wb.categories) {
    const v = subjectVsPeerCategory(frame, c.id);
    if (v.subjectPsf === null || v.peerMedian === null) continue;
    if (v.peerValues.length < THRESHOLDS.minPeerN) continue;

    if (v.percentile !== null && v.percentile >= THRESHOLDS.topQuartile) {
      out.push({
        id: `cat-strong-${c.id}`,
        severity: "positive",
        scope: "property",
        headline: `${c.name} materially outperforms peer median`,
        detail: `${c.name} sales psf at ${property.name} is in the top quartile of the peer set (${pct(v.percentile)}). This suggests strong customer productivity in this category at the center.`,
        evidence: [
          { label: "subject psf", value: usd(v.subjectPsf) },
          { label: "peer median", value: usd(v.peerMedian) },
          { label: "percentile", value: pct(v.percentile), threshold: `>= ${pct(THRESHOLDS.topQuartile)}` },
        ],
      });
    } else if (v.percentile !== null && v.percentile <= THRESHOLDS.bottomQuartile) {
      out.push({
        id: `cat-weak-${c.id}`,
        severity: "negative",
        scope: "property",
        headline: `${c.name} underperforms peers`,
        detail: `${c.name} sales psf sits in the bottom quartile of the peer set (${pct(v.percentile)}). This could reflect weaker merchandising depth, positioning mismatch, or a tenant-productivity issue in this category.`,
        evidence: [
          { label: "subject psf", value: usd(v.subjectPsf) },
          { label: "peer median", value: usd(v.peerMedian) },
          { label: "percentile", value: pct(v.percentile), threshold: `<= ${pct(THRESHOLDS.bottomQuartile)}` },
        ],
      });
    }

    // Sparse but strong -> white space
    const tenantCountInCategory = frame.subjectObs.filter((o) => o.categoryId === c.id).length;
    if (
      tenantCountInCategory > 0 &&
      tenantCountInCategory <= THRESHOLDS.sparseCategoryTenantCount &&
      v.percentile !== null &&
      v.percentile >= THRESHOLDS.strongPercentile
    ) {
      out.push({
        id: `cat-whitespace-${c.id}`,
        severity: "positive",
        scope: "property",
        headline: `${c.name} shows white-space potential`,
        detail: `${c.name} productivity is above the peer 66th percentile with only ${tenantCountInCategory} tenant(s) represented at this center. Limited supply + strong demand indicates room for additional merchandising.`,
        evidence: [
          { label: "tenants in category", value: tenantCountInCategory, threshold: `<= ${THRESHOLDS.sparseCategoryTenantCount}` },
          { label: "percentile", value: pct(v.percentile), threshold: `>= ${pct(THRESHOLDS.strongPercentile)}` },
        ],
      });
    }
  }

  // F&B as experiential lever
  const fb = findCategoryByFuzzy(wb.categories, ["food", "beverage", "f&b", "restaurant"]);
  if (fb) {
    const v = subjectVsPeerCategory(frame, fb.id);
    if (v.peerMedian !== null && v.subjectPsf !== null && v.subjectPsf >= v.peerMedian) {
      out.push({
        id: `fb-experiential`,
        severity: "positive",
        scope: "property",
        headline: `${fb.name} performance supports experiential leasing`,
        detail: `${fb.name} sales psf is at or above peer median, consistent with traffic that can support additional experiential or complementary uses (dining, entertainment, service).`,
        evidence: [
          { label: "subject psf", value: usd(v.subjectPsf) },
          { label: "peer median", value: usd(v.peerMedian) },
        ],
      });
    }
  }

  return out;
}

/* ------------ TENANT-LEVEL RULES ------------ */

export function tenantInsights(
  wb: Workbook,
  tenant: Tenant,
  subjectId: string,
): Insight[] {
  const out: Insight[] = [];
  const allObs = wb.observations.filter((o) => o.tenantId === tenant.id);
  const psfs = allObs.map((o) => o.salesPsf).filter((v): v is number => typeof v === "number");
  const subjectObs = allObs.find((o) => o.propertyId === subjectId);

  if (!subjectObs || typeof subjectObs.salesPsf !== "number") {
    out.push({
      id: "tenant-missing-subject-psf",
      severity: "info",
      scope: "tenant",
      headline: "No subject-location sales PSF available",
      detail: `${tenant.name} has no sales psf recorded at this center in the data. Cross-chain comparison cannot be drawn for this tenant at this property.`,
      evidence: [{ label: "subject psf", value: "—" }],
    });
    return out;
  }

  if (psfs.length < THRESHOLDS.minPeerN) {
    out.push({
      id: "tenant-low-n",
      severity: "info",
      scope: "tenant",
      headline: `${tenant.name} appears at only ${psfs.length} location(s)`,
      detail: `Chain-average comparisons require at least ${THRESHOLDS.minPeerN} locations; this tenant appears at fewer. Interpret individual-store comparisons with caution.`,
      evidence: [{ label: "locations", value: psfs.length, threshold: `>= ${THRESHOLDS.minPeerN}` }],
    });
    return out;
  }

  const pctile = percentileRank(subjectObs.salesPsf, psfs);
  const chainMedian = median(psfs);
  const chainMean = mean(psfs);

  if (pctile !== null && pctile >= THRESHOLDS.topQuartile) {
    out.push({
      id: "tenant-top-quartile",
      severity: "positive",
      scope: "tenant",
      headline: `${tenant.name} is a top-quartile store in its chain`,
      detail: `At this center, ${tenant.name} ranks in the top quartile across all its locations in the dataset. Strong chain-relative performance often correlates with higher renewal probability and can be a positive signal for the center.`,
      evidence: [
        { label: "subject psf", value: usd(subjectObs.salesPsf) },
        { label: "chain median", value: chainMedian !== null ? usd(chainMedian) : "—" },
        { label: "percentile", value: pct(pctile), threshold: `>= ${pct(THRESHOLDS.topQuartile)}` },
      ],
    });
  } else if (pctile !== null && pctile <= THRESHOLDS.bottomQuartile) {
    out.push({
      id: "tenant-bottom-quartile",
      severity: "negative",
      scope: "tenant",
      headline: `${tenant.name} is a bottom-quartile store in its chain`,
      detail: `${tenant.name} performs in the bottom quartile across its locations. This may indicate weaker store productivity or poor fit with the center and can elevate renewal or co-tenancy risk.`,
      evidence: [
        { label: "subject psf", value: usd(subjectObs.salesPsf) },
        { label: "chain median", value: chainMedian !== null ? usd(chainMedian) : "—" },
        { label: "percentile", value: pct(pctile), threshold: `<= ${pct(THRESHOLDS.bottomQuartile)}` },
      ],
    });
  } else {
    out.push({
      id: "tenant-middle",
      severity: "neutral",
      scope: "tenant",
      headline: `${tenant.name} performs in line with its chain`,
      detail: `${tenant.name} at this center falls in the mid-range of its chain's location productivity — neither a standout nor a laggard.`,
      evidence: [
        { label: "subject psf", value: usd(subjectObs.salesPsf) },
        { label: "chain mean", value: chainMean !== null ? usd(chainMean) : "—" },
        { label: "percentile", value: pct(pctile ?? 0) },
      ],
    });
  }

  return out;
}

/* ------------ CATEGORY-LEVEL RULES ------------ */

export function categoryInsights(
  wb: Workbook,
  category: Category,
  frame: PeerFrame,
): Insight[] {
  const out: Insight[] = [];
  const v = subjectVsPeerCategory(frame, category.id);
  if (v.subjectPsf === null) {
    out.push({
      id: "cat-missing",
      severity: "info",
      scope: "category",
      headline: `${category.name} is not represented at the subject center`,
      detail: `No ${category.name} tenants with sales psf were found for the subject property. This may represent a merchandising gap.`,
      evidence: [{ label: "subject psf", value: "—" }],
    });
    return out;
  }
  if (v.peerValues.length < THRESHOLDS.minPeerN) {
    out.push({
      id: "cat-thin-peers",
      severity: "info",
      scope: "category",
      headline: `${category.name} has too few peer datapoints`,
      detail: `Only ${v.peerValues.length} peer properties have ${category.name} data. Relative comparison is directional.`,
      evidence: [{ label: "peer N", value: v.peerValues.length, threshold: `>= ${THRESHOLDS.minPeerN}` }],
    });
    return out;
  }
  if (v.percentile !== null && v.percentile >= THRESHOLDS.topQuartile) {
    out.push({
      id: `cat-strong-${category.id}`,
      severity: "positive",
      scope: "category",
      headline: `${category.name} is a strength at this center`,
      detail: `${category.name} psf sits in the top quartile of the peer set (${pct(v.percentile)}), evidence of strong demand and competitive merchandising depth in the category.`,
      evidence: [
        { label: "subject psf", value: usd(v.subjectPsf) },
        { label: "peer median", value: usd(v.peerMedian ?? 0) },
        { label: "percentile", value: pct(v.percentile) },
      ],
    });
  } else if (v.percentile !== null && v.percentile <= THRESHOLDS.bottomQuartile) {
    out.push({
      id: `cat-weak-${category.id}`,
      severity: "negative",
      scope: "category",
      headline: `${category.name} underperforms the peer set`,
      detail: `${category.name} psf is in the bottom quartile of peers. Could reflect weaker retailer mix, unmet demand, or customer-profile mismatch — review before underwriting category growth.`,
      evidence: [
        { label: "subject psf", value: usd(v.subjectPsf) },
        { label: "peer median", value: usd(v.peerMedian ?? 0) },
        { label: "percentile", value: pct(v.percentile) },
      ],
    });
  } else {
    out.push({
      id: `cat-middle-${category.id}`,
      severity: "neutral",
      scope: "category",
      headline: `${category.name} tracks the peer set`,
      detail: `${category.name} psf sits near the peer median. Category is neither a clear strength nor weakness at the subject center.`,
      evidence: [
        { label: "subject psf", value: usd(v.subjectPsf) },
        { label: "peer median", value: usd(v.peerMedian ?? 0) },
        { label: "percentile", value: pct(v.percentile ?? 0.5) },
      ],
    });
  }
  return out;
}

/* ------------ utils ------------ */

function pct(n: number) { return `${Math.round(n * 100)}%`; }
function usd(n: number) { return `$${Math.round(n).toLocaleString()}`; }

function findCategoryByFuzzy(cats: Category[], needles: string[]): Category | undefined {
  return cats.find((c) => {
    const low = c.name.toLowerCase();
    return needles.some((n) => low.includes(n));
  });
}

