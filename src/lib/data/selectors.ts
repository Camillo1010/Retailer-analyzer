import type {
  CategoryMetric,
  Id,
  Observation,
  PeerScope,
  Workbook,
} from "@/lib/types";

/** Parse a peer-scope query string into a structured selection. */
export function parsePeerScope(value: string | null | undefined): PeerScope {
  if (!value || value === "all") return { kind: "all" };
  if (value.startsWith("manual:")) {
    const ids = value.slice("manual:".length).split(",").filter(Boolean);
    return { kind: "manual", ids };
  }
  return { kind: "all" };
}

export function serializePeerScope(scope: PeerScope): string {
  if (scope.kind === "all") return "all";
  return `manual:${scope.ids.join(",")}`;
}

/** Resolve the set of peer property ids, excluding the subject. */
export function resolvePeers(
  wb: Workbook,
  subjectId: Id,
  scope: PeerScope,
): Id[] {
  const all = wb.properties.map((p) => p.id).filter((id) => id !== subjectId);
  if (scope.kind === "all") return all;
  return scope.ids.filter((id) => id !== subjectId && all.includes(id));
}

export function observationsForProperty(wb: Workbook, propertyId: Id): Observation[] {
  return wb.observations.filter((o) => o.propertyId === propertyId);
}

export function observationsForTenant(wb: Workbook, tenantId: Id): Observation[] {
  return wb.observations.filter((o) => o.tenantId === tenantId);
}

export function observationsForCategory(wb: Workbook, categoryId: Id): Observation[] {
  return wb.observations.filter((o) => o.categoryId === categoryId);
}

export function categoryMetricsForProperty(
  wb: Workbook,
  propertyId: Id,
): CategoryMetric[] {
  return wb.categoryMetrics.filter((m) => m.propertyId === propertyId);
}

export function categoryMetricsForCategory(
  wb: Workbook,
  categoryId: Id,
): CategoryMetric[] {
  return wb.categoryMetrics.filter((m) => m.categoryId === categoryId);
}

export function findProperty(wb: Workbook, id: Id) {
  return wb.properties.find((p) => p.id === id);
}
export function findTenant(wb: Workbook, id: Id) {
  return wb.tenants.find((t) => t.id === id);
}
export function findCategory(wb: Workbook, id: Id) {
  return wb.categories.find((c) => c.id === id);
}
