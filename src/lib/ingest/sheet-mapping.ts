/**
 * Fuzzy mapping from arbitrary workbook sheet/header strings to canonical
 * logical names. Case-insensitive, punctuation-stripped, substring match
 * against a synonym list.
 */

function normalize(s: string): string {
  return (s ?? "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type LogicalTable =
  | "observations"       // tenant x property sales rows
  | "categoryMetrics"    // property x category pre-aggregated rows
  | "categories"
  | "tenants"
  | "properties"
  | "subjectRanking";    // optional: per-property ranking summary sheet

const SHEET_SYNONYMS: Array<{ table: LogicalTable; patterns: string[] }> = [
  { table: "observations", patterns: [
    "tenant sales", "sales by tenant", "tenant by property", "tenant sales comparison",
    "tenant performance", "store sales", "tenant data",
  ] },
  { table: "categoryMetrics", patterns: [
    "property category", "category summary", "category by property", "property summary",
    "category metrics", "category data",
  ] },
  { table: "categories", patterns: [
    "category list", "categories", "list of categories", "category", "cat list",
  ] },
  { table: "tenants", patterns: [
    "tenant list", "tenants", "list of tenants", "retailers", "store list",
  ] },
  { table: "properties", patterns: [
    "property list", "properties", "list of properties", "centers", "shopping centers",
  ] },
  { table: "subjectRanking", patterns: [
    "ranking", "ranking summary", "clackamas ranking", "subject ranking", "rank summary",
  ] },
];

export function matchSheet(sheetName: string): LogicalTable | null {
  const n = normalize(sheetName);
  if (!n) return null;
  // Prefer the synonym with the longest matching pattern
  let best: { table: LogicalTable; score: number } | null = null;
  for (const entry of SHEET_SYNONYMS) {
    for (const p of entry.patterns) {
      const np = normalize(p);
      if (n.includes(np)) {
        const score = np.length;
        if (!best || score > best.score) best = { table: entry.table, score };
      }
    }
  }
  return best?.table ?? null;
}

/** Logical field names for header matching. */
export type LogicalField =
  | "property"
  | "tenant"
  | "category"
  | "sales"
  | "salesPsf"
  | "occCost"
  | "occCostPct"
  | "sqft"
  | "rank"
  | "percentile"
  | "enclosed"
  | "include";

const HEADER_SYNONYMS: Record<LogicalField, string[]> = {
  property:   ["property", "center", "shopping center", "mall", "site", "location", "asset"],
  tenant:     ["tenant", "retailer", "store", "store name", "tenant name"],
  category:   ["category", "merchandise category", "use", "segment", "cat"],
  sales:      ["sales", "total sales", "annual sales", "gross sales", "sales volume", "sales $"],
  salesPsf:   ["sales psf", "sales / sf", "sales per sf", "psf", "$/sf", "sales per square foot",
               "sales ppsf", "ppsf"],
  occCost:    ["occupancy cost", "occ cost", "occupancy $", "total occupancy"],
  occCostPct: ["occupancy cost %", "occ cost %", "occupancy %", "occ %", "occ cost ratio",
               "occupancy ratio", "occ cost pct"],
  sqft:       ["sqft", "sq ft", "square feet", "square footage", "gla", "sf"],
  rank:       ["rank", "ranking", "rank #"],
  percentile: ["percentile", "pctile", "pct rank"],
  enclosed:   ["enclosed", "enclosed mall", "enclosed y n", "is enclosed"],
  include:    ["include", "included", "in comp", "comp", "use in comp"],
};

export interface HeaderMap {
  byField: Partial<Record<LogicalField, number>>;
  byIndex: Record<number, { raw: string; field: LogicalField | null }>;
}

export function buildHeaderMap(headers: string[]): HeaderMap {
  const byField: Partial<Record<LogicalField, number>> = {};
  const byIndex: Record<number, { raw: string; field: LogicalField | null }> = {};
  headers.forEach((raw, i) => {
    const n = normalize(raw);
    let match: { field: LogicalField; score: number } | null = null;
    for (const [field, syns] of Object.entries(HEADER_SYNONYMS) as Array<[LogicalField, string[]]>) {
      for (const syn of syns) {
        const ns = normalize(syn);
        if (!ns) continue;
        if (n === ns || n.includes(ns)) {
          const score = ns.length + (n === ns ? 10 : 0);
          if (!match || score > match.score) match = { field, score };
        }
      }
    }
    byIndex[i] = { raw, field: match?.field ?? null };
    if (match && byField[match.field] === undefined) byField[match.field] = i;
  });
  return { byField, byIndex };
}
