import type {
  CategoryMetric,
  Id,
  Observation,
  Workbook,
} from "@/lib/types";
import {
  categoryMetricsForProperty,
  observationsForProperty,
} from "@/lib/data/selectors";

export interface PeerFrame {
  subjectId: Id;
  peerIds: Id[];
  subjectObs: Observation[];
  peerObs: Observation[];
  subjectMetrics: CategoryMetric[];
  peerMetrics: CategoryMetric[];
}

export function buildPeerFrame(
  wb: Workbook,
  subjectId: Id,
  peerIds: Id[],
): PeerFrame {
  const peerSet = new Set(peerIds);
  return {
    subjectId,
    peerIds,
    subjectObs: observationsForProperty(wb, subjectId),
    peerObs: wb.observations.filter((o) => peerSet.has(o.propertyId)),
    subjectMetrics: categoryMetricsForProperty(wb, subjectId),
    peerMetrics: wb.categoryMetrics.filter((m) => peerSet.has(m.propertyId)),
  };
}
