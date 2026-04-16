import { slugify } from "@/lib/utils";
import {
  Category,
  CategoryMetric,
  Id,
  MappingReport,
  Observation,
  Property,
  RejectedRow,
  SourceRef,
  Tenant,
  Workbook,
} from "@/lib/types";
import { RawSheet } from "./parse-workbook";
import {
  buildHeaderMap,
  HeaderMap,
  LogicalField,
  LogicalTable,
  matchSheet,
  SheetMatch,
} from "./sheet-mapping";
import { toBool, toNumber, toPercent, toText } from "./validate";

interface NormalizeInput {
  fileName: string;
  sheets: RawSheet[];
}

export function normalizeWorkbook(input: NormalizeInput): Workbook {
  const propertiesMap = new Map<Id, Property>();
  const tenantsMap = new Map<Id, Tenant>();
  const categoriesMap = new Map<Id, Category>();
  const observations: Observation[] = [];
  const categoryMetrics: CategoryMetric[] = [];
  const rejected: RejectedRow[] = [];

  const sheetReports: MappingReport["sheets"] = [];

  // 1) classify sheets
  const classified: Array<{ sheet: RawSheet; table: LogicalTable | null; ignore: boolean; header: HeaderMap }> =
    input.sheets.map((s) => {
      const m: SheetMatch = matchSheet(s.name);
      return {
        sheet: s,
        table: m.table,
        ignore: m.ignore,
        header: buildHeaderMap(s.headers),
      };
    });

  // 2) ingest list sheets first so we seed canonical ids
  for (const c of classified) {
    if (c.table === "properties") ingestPropertyList(c.sheet, c.header, propertiesMap);
    if (c.table === "categories") ingestCategoryList(c.sheet, c.header, categoriesMap);
    if (c.table === "tenants")    ingestTenantList(c.sheet, c.header, tenantsMap, categoriesMap);
  }

  // 3) ingest data sheets, auto-discovering property/tenant/category ids as we go
  for (const c of classified) {
    if (c.table === "observations") {
      ingestObservations(
        c.sheet, c.header,
        { propertiesMap, tenantsMap, categoriesMap, observations, rejected },
      );
    }
    if (c.table === "categoryMetrics") {
      ingestCategoryMetrics(
        c.sheet, c.header,
        { propertiesMap, categoriesMap, categoryMetrics, rejected },
      );
    }
    if (c.table === "subjectRanking") {
      // Treat a ranking summary as categoryMetrics keyed to the sheet's "subject" property.
      ingestSubjectRanking(
        c.sheet, c.header,
        { propertiesMap, categoriesMap, categoryMetrics, rejected },
      );
    }
  }

  // 4) any unclassified, non-ignored sheet whose headers look like observations
  //    or categoryMetrics gets ingested via a structural fallback
  for (const c of classified) {
    if (c.table !== null) continue;
    if (c.ignore) continue;
    const looksLikeObservations =
      c.header.byField.property !== undefined &&
      c.header.byField.tenant !== undefined;
    const looksLikeCategoryMetrics =
      c.header.byField.property !== undefined &&
      c.header.byField.category !== undefined &&
      c.header.byField.tenant === undefined;
    if (looksLikeObservations) {
      ingestObservations(
        c.sheet, c.header,
        { propertiesMap, tenantsMap, categoriesMap, observations, rejected },
      );
      c.table = "observations";
    } else if (looksLikeCategoryMetrics) {
      ingestCategoryMetrics(
        c.sheet, c.header,
        { propertiesMap, categoriesMap, categoryMetrics, rejected },
      );
      c.table = "categoryMetrics";
    }
  }

  // 4b) derive category metrics from observations for any (property, category)
  //     pair that isn't already covered by an explicit metric. This keeps the
  //     category pages functional even when the workbook ships only a
  //     tenant-level data sheet.
  const haveMetric = new Set(
    categoryMetrics.map((m) => `${m.propertyId}|${m.categoryId}`),
  );
  type Acc = { sales: number; sqft: number; occWeightedSum: number; occWeightSum: number; source: SourceRef };
  const acc = new Map<string, Acc>();
  for (const o of observations) {
    if (!o.categoryId) continue;
    const key = `${o.propertyId}|${o.categoryId}`;
    if (haveMetric.has(key)) continue;
    if (!acc.has(key)) {
      acc.set(key, { sales: 0, sqft: 0, occWeightedSum: 0, occWeightSum: 0, source: o.source });
    }
    const a = acc.get(key)!;
    if (typeof o.sales === "number") a.sales += o.sales;
    if (typeof o.sqft === "number") a.sqft += o.sqft;
    if (typeof o.occCostPct === "number" && typeof o.sqft === "number") {
      a.occWeightedSum += o.occCostPct * o.sqft;
      a.occWeightSum += o.sqft;
    }
  }
  for (const [key, a] of acc.entries()) {
    const [propertyId, categoryId] = key.split("|");
    const salesPsf = a.sqft > 0 ? a.sales / a.sqft : undefined;
    const occCostPct = a.occWeightSum > 0 ? a.occWeightedSum / a.occWeightSum : undefined;
    categoryMetrics.push({
      propertyId,
      categoryId,
      salesPsf,
      occCostPct,
      sales: a.sales || undefined,
      sqft: a.sqft || undefined,
      source: { ...a.source, sheet: `${a.source.sheet} (derived)` },
    });
  }

  // 5) build the mapping report
  for (const c of classified) {
    sheetReports.push({
      sheetName: c.sheet.name,
      logicalTable: c.table,
      rows: c.sheet.rowCount,
      columns: c.sheet.headers.map((h, i) => ({
        header: h,
        mappedTo: c.header.byIndex[i]?.field ?? null,
      })),
    });
  }

  const properties = Array.from(propertiesMap.values());
  const tenants = Array.from(tenantsMap.values());
  const categories = Array.from(categoriesMap.values());

  return {
    fileName: input.fileName,
    parsedAt: new Date().toISOString(),
    properties,
    tenants,
    categories,
    observations,
    categoryMetrics,
    rejected,
    mappingReport: {
      sheets: sheetReports,
      summary: {
        properties: properties.length,
        tenants: tenants.length,
        categories: categories.length,
        observations: observations.length,
        categoryMetrics: categoryMetrics.length,
        rejected: rejected.length,
      },
    },
  };
}

// ---------- helpers ----------

function pickByHeaderName<T>(
  row: Record<string, unknown>,
  header: HeaderMap,
  field: LogicalField,
  cast: (v: unknown) => T,
): T | null {
  const idx = header.byField[field];
  if (idx === undefined) return null;
  const keys = Object.keys(row).filter((k) => k !== "__rowNum");
  const key = keys[idx];
  if (!key) return null;
  return cast(row[key]);
}

function getOrCreateProperty(
  map: Map<Id, Property>,
  name: string,
  source: SourceRef,
): Property {
  const id = slugify(name);
  let p = map.get(id);
  if (!p) {
    p = { id, name, meta: {}, source };
    map.set(id, p);
  }
  return p;
}

function getOrCreateTenant(
  map: Map<Id, Tenant>,
  name: string,
  source: SourceRef,
  categoryId?: Id,
): Tenant {
  const id = slugify(name);
  let t = map.get(id);
  if (!t) {
    t = { id, name, source, categoryId };
    map.set(id, t);
  } else if (!t.categoryId && categoryId) {
    t.categoryId = categoryId;
  }
  return t;
}

function getOrCreateCategory(
  map: Map<Id, Category>,
  name: string,
  source: SourceRef,
): Category {
  const id = slugify(name);
  let c = map.get(id);
  if (!c) {
    c = { id, name, source };
    map.set(id, c);
  }
  return c;
}

// ---------- list sheet ingestors ----------

function ingestPropertyList(
  sheet: RawSheet,
  header: HeaderMap,
  map: Map<Id, Property>,
) {
  for (const row of sheet.rows) {
    const name = pickByHeaderName(row, header, "property", toText);
    if (!name) continue;
    const source: SourceRef = { sheet: sheet.name, row: Number(row.__rowNum) || 0 };
    const prop = getOrCreateProperty(map, name, source);
    const enclosed = pickByHeaderName(row, header, "enclosed", toBool);
    const sqft = pickByHeaderName(row, header, "sqft", toNumber);
    const include = pickByHeaderName(row, header, "include", toBool);
    if (enclosed !== null) prop.enclosed = enclosed;
    if (sqft !== null) prop.totalSqft = sqft;
    if (include !== null) prop.include = include;
  }
}

function ingestCategoryList(
  sheet: RawSheet,
  header: HeaderMap,
  map: Map<Id, Category>,
) {
  for (const row of sheet.rows) {
    const name = pickByHeaderName(row, header, "category", toText);
    if (!name) continue;
    const source: SourceRef = { sheet: sheet.name, row: Number(row.__rowNum) || 0 };
    getOrCreateCategory(map, name, source);
  }
}

function ingestTenantList(
  sheet: RawSheet,
  header: HeaderMap,
  tMap: Map<Id, Tenant>,
  cMap: Map<Id, Category>,
) {
  for (const row of sheet.rows) {
    const name = pickByHeaderName(row, header, "tenant", toText);
    if (!name) continue;
    const catName = pickByHeaderName(row, header, "category", toText);
    const source: SourceRef = { sheet: sheet.name, row: Number(row.__rowNum) || 0 };
    const categoryId = catName ? getOrCreateCategory(cMap, catName, source).id : undefined;
    getOrCreateTenant(tMap, name, source, categoryId);
  }
}

// ---------- data sheet ingestors ----------

interface ObsCtx {
  propertiesMap: Map<Id, Property>;
  tenantsMap: Map<Id, Tenant>;
  categoriesMap: Map<Id, Category>;
  observations: Observation[];
  rejected: RejectedRow[];
}

function ingestObservations(sheet: RawSheet, header: HeaderMap, ctx: ObsCtx) {
  for (const row of sheet.rows) {
    const rowNum = Number(row.__rowNum) || 0;
    const source: SourceRef = { sheet: sheet.name, row: rowNum };
    const propertyName = pickByHeaderName(row, header, "property", toText);
    const tenantName = pickByHeaderName(row, header, "tenant", toText);
    if (!propertyName || !tenantName) {
      ctx.rejected.push({
        sheet: sheet.name, row: rowNum,
        reason: !propertyName ? "missing property" : "missing tenant",
        raw: row,
      });
      continue;
    }
    const catName = pickByHeaderName(row, header, "category", toText);
    const categoryId = catName ? getOrCreateCategory(ctx.categoriesMap, catName, source).id : undefined;
    const property = getOrCreateProperty(ctx.propertiesMap, propertyName, source);
    const tenant = getOrCreateTenant(ctx.tenantsMap, tenantName, source, categoryId);

    const obs: Observation = {
      propertyId: property.id,
      tenantId: tenant.id,
      categoryId,
      sales:      pickByHeaderName(row, header, "sales",      toNumber)  ?? undefined,
      salesPsf:   pickByHeaderName(row, header, "salesPsf",   toNumber)  ?? undefined,
      occCost:    pickByHeaderName(row, header, "occCost",    toNumber)  ?? undefined,
      occCostPct: pickByHeaderName(row, header, "occCostPct", toPercent) ?? undefined,
      sqft:       pickByHeaderName(row, header, "sqft",       toNumber)  ?? undefined,
      rank:       pickByHeaderName(row, header, "rank",       toNumber)  ?? undefined,
      percentile: pickByHeaderName(row, header, "percentile", toPercent) ?? undefined,
      include:    pickByHeaderName(row, header, "include",    toBool)    ?? undefined,
      source,
    };
    // derive sales psf if missing but we have sales + sqft
    if (obs.salesPsf === undefined && obs.sales && obs.sqft && obs.sqft > 0) {
      obs.salesPsf = obs.sales / obs.sqft;
    }
    ctx.observations.push(obs);
  }
}

interface CmCtx {
  propertiesMap: Map<Id, Property>;
  categoriesMap: Map<Id, Category>;
  categoryMetrics: CategoryMetric[];
  rejected: RejectedRow[];
}

function ingestCategoryMetrics(sheet: RawSheet, header: HeaderMap, ctx: CmCtx) {
  for (const row of sheet.rows) {
    const rowNum = Number(row.__rowNum) || 0;
    const source: SourceRef = { sheet: sheet.name, row: rowNum };
    const propertyName = pickByHeaderName(row, header, "property", toText);
    const catName = pickByHeaderName(row, header, "category", toText);
    if (!propertyName || !catName) {
      ctx.rejected.push({
        sheet: sheet.name, row: rowNum,
        reason: !propertyName ? "missing property" : "missing category",
        raw: row,
      });
      continue;
    }
    const property = getOrCreateProperty(ctx.propertiesMap, propertyName, source);
    const category = getOrCreateCategory(ctx.categoriesMap, catName, source);
    ctx.categoryMetrics.push({
      propertyId: property.id,
      categoryId: category.id,
      salesPsf:   pickByHeaderName(row, header, "salesPsf",   toNumber)  ?? undefined,
      occCostPct: pickByHeaderName(row, header, "occCostPct", toPercent) ?? undefined,
      sales:      pickByHeaderName(row, header, "sales",      toNumber)  ?? undefined,
      sqft:       pickByHeaderName(row, header, "sqft",       toNumber)  ?? undefined,
      rank:       pickByHeaderName(row, header, "rank",       toNumber)  ?? undefined,
      source,
    });
  }
}

function ingestSubjectRanking(sheet: RawSheet, header: HeaderMap, ctx: CmCtx) {
  // If a "subject" header column exists, use it; else infer from sheet name.
  const subjectFromName = sheet.name.replace(/ranking|summary/gi, "").trim();
  for (const row of sheet.rows) {
    const rowNum = Number(row.__rowNum) || 0;
    const source: SourceRef = { sheet: sheet.name, row: rowNum };
    const propertyName =
      pickByHeaderName(row, header, "property", toText) ?? subjectFromName;
    const catName = pickByHeaderName(row, header, "category", toText);
    if (!propertyName || !catName) continue;
    const property = getOrCreateProperty(ctx.propertiesMap, propertyName, source);
    const category = getOrCreateCategory(ctx.categoriesMap, catName, source);
    ctx.categoryMetrics.push({
      propertyId: property.id,
      categoryId: category.id,
      salesPsf:   pickByHeaderName(row, header, "salesPsf",   toNumber)  ?? undefined,
      occCostPct: pickByHeaderName(row, header, "occCostPct", toPercent) ?? undefined,
      sales:      pickByHeaderName(row, header, "sales",      toNumber)  ?? undefined,
      sqft:       pickByHeaderName(row, header, "sqft",       toNumber)  ?? undefined,
      rank:       pickByHeaderName(row, header, "rank",       toNumber)  ?? undefined,
      source,
    });
  }
}
