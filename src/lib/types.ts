/**
 * Domain model. Kept intentionally wide — workbooks we consume vary in the
 * metrics they expose per row, so every numeric field is optional and every
 * row records a pointer back to its source for traceability.
 */

export type Id = string;

export interface SourceRef {
  sheet: string;
  row: number; // 1-based like spreadsheets, for human reference
}

export interface Property {
  id: Id;
  name: string;
  enclosed?: boolean;
  totalSqft?: number;
  include?: boolean;
  meta: Record<string, string | number | boolean | null>;
  source: SourceRef;
}

export interface Tenant {
  id: Id;
  name: string;
  categoryId?: Id;
  source: SourceRef;
}

export interface Category {
  id: Id;
  name: string;
  source: SourceRef;
}

/**
 * One tenant at one property. Most analytics scan this table.
 */
export interface Observation {
  propertyId: Id;
  tenantId: Id;
  categoryId?: Id;
  sales?: number;
  salesPsf?: number;
  occCost?: number;       // $ occupancy cost
  occCostPct?: number;    // % of sales, stored as a fraction (0.12 = 12%)
  sqft?: number;
  rank?: number;
  percentile?: number;    // 0..1
  include?: boolean;
  source: SourceRef;
}

/**
 * Pre-aggregated property x category row, typically sourced from a category
 * summary sheet rather than reconstructed from observations.
 */
export interface CategoryMetric {
  propertyId: Id;
  categoryId: Id;
  salesPsf?: number;
  occCostPct?: number;
  sales?: number;
  sqft?: number;
  rank?: number;
  source: SourceRef;
}

export type PeerScope =
  | { kind: "all" }
  | { kind: "manual"; ids: Id[] };

export interface Workbook {
  fileName: string;
  parsedAt: string;
  properties: Property[];
  tenants: Tenant[];
  categories: Category[];
  observations: Observation[];
  categoryMetrics: CategoryMetric[];
  mappingReport: MappingReport;
  rejected: RejectedRow[];
}

export interface MappingReport {
  sheets: Array<{
    sheetName: string;
    logicalTable: string | null;
    rows: number;
    columns: Array<{ header: string; mappedTo: string | null }>;
  }>;
  summary: {
    properties: number;
    tenants: number;
    categories: number;
    observations: number;
    categoryMetrics: number;
    rejected: number;
  };
}

export interface RejectedRow {
  sheet: string;
  row: number;
  reason: string;
  raw: Record<string, unknown>;
}

export interface Insight {
  id: string;
  severity: "positive" | "neutral" | "negative" | "info";
  scope: "property" | "tenant" | "category";
  headline: string;
  detail: string;
  evidence: Array<{ label: string; value: string | number; threshold?: string | number }>;
}

export interface ScoreComponent {
  label: string;
  value: number;       // 0..100 contribution value pre-weight
  weight: number;      // 0..1
  note?: string;
}

export interface SignalScore {
  name: string;
  score: number;                // 0..100
  components: ScoreComponent[];
  verdict: string;
}
