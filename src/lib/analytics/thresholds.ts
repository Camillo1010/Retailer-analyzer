/**
 * Every tunable number in the analytics engine. Edit here only.
 */
export const THRESHOLDS = {
  // percentile thresholds, 0..1
  topQuartile: 0.75,
  bottomQuartile: 0.25,
  strongPercentile: 0.66,
  weakPercentile: 0.33,

  // a peer set of fewer than this is considered too thin for confident inference
  minPeerN: 3,

  // categories with fewer tenants than this at the subject are flagged as sparse
  sparseCategoryTenantCount: 2,

  // dollar-delta thresholds used in insight wording
  materialPsfDelta: 50,

  // center quality signal weights (must sum roughly to 1)
  centerQualityWeights: {
    tenantProductivityVsPeers: 0.25,
    categoryBreadth: 0.15,
    shareCategoriesAboveMedian: 0.20,
    topQuartileTenantCount: 0.15,
    crossCategoryConsistency: 0.10,
    veryWeakCategoryPenalty: 0.15,
  },

  // lease-up signal weights
  leaseUpWeights: {
    tenantProductivity: 0.35,
    strongCategoryBreadth: 0.25,
    nationalTenantOutperformance: 0.25,
    categoryStrengthConsistency: 0.15,
  },

  // scoring buckets -> verdicts
  scoreVerdicts: [
    { min: 75, label: "Strong" },
    { min: 55, label: "Above Average" },
    { min: 40, label: "Mixed" },
    { min: 25, label: "Below Average" },
    { min: 0,  label: "Weak" },
  ],
} as const;

export function verdictFor(score: number): string {
  for (const b of THRESHOLDS.scoreVerdicts) if (score >= b.min) return b.label;
  return "Weak";
}
