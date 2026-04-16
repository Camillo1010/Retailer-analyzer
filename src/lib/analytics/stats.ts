/**
 * Pure statistical helpers. All skip null/undefined/NaN; never throw.
 */

export function clean(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
}

export function mean(values: Array<number | null | undefined>): number | null {
  const c = clean(values);
  if (c.length === 0) return null;
  return c.reduce((a, b) => a + b, 0) / c.length;
}

export function median(values: Array<number | null | undefined>): number | null {
  const c = clean(values).sort((a, b) => a - b);
  if (c.length === 0) return null;
  const mid = Math.floor(c.length / 2);
  return c.length % 2 ? c[mid] : (c[mid - 1] + c[mid]) / 2;
}

export function min(values: Array<number | null | undefined>): number | null {
  const c = clean(values);
  return c.length ? Math.min(...c) : null;
}

export function max(values: Array<number | null | undefined>): number | null {
  const c = clean(values);
  return c.length ? Math.max(...c) : null;
}

export function stdDev(values: Array<number | null | undefined>): number | null {
  const c = clean(values);
  if (c.length < 2) return null;
  const m = c.reduce((a, b) => a + b, 0) / c.length;
  const v = c.reduce((a, b) => a + (b - m) ** 2, 0) / (c.length - 1);
  return Math.sqrt(v);
}

export function variance(values: Array<number | null | undefined>): number | null {
  const sd = stdDev(values);
  return sd === null ? null : sd * sd;
}

export function weightedMean(
  values: Array<number | null | undefined>,
  weights: Array<number | null | undefined>,
): number | null {
  let wsum = 0;
  let vsum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const w = weights[i];
    if (
      typeof v === "number" && Number.isFinite(v) &&
      typeof w === "number" && Number.isFinite(w) && w > 0
    ) {
      vsum += v * w;
      wsum += w;
    }
  }
  return wsum > 0 ? vsum / wsum : null;
}

export interface Quartiles {
  q1: number;
  q2: number; // median
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
}

export function quartiles(values: Array<number | null | undefined>): Quartiles | null {
  const c = clean(values).sort((a, b) => a - b);
  if (c.length < 4) return null;
  const q = (p: number) => {
    const idx = p * (c.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return lo === hi ? c[lo] : c[lo] + (c[hi] - c[lo]) * (idx - lo);
  };
  const q1 = q(0.25);
  const q2 = q(0.5);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  return {
    q1, q2, q3, iqr,
    lowerFence: q1 - 1.5 * iqr,
    upperFence: q3 + 1.5 * iqr,
  };
}

/** Percentile rank of `value` within `distribution`, returned as 0..1. */
export function percentileRank(
  value: number | null | undefined,
  distribution: Array<number | null | undefined>,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const c = clean(distribution);
  if (c.length === 0) return null;
  const below = c.filter((v) => v < value).length;
  const equal = c.filter((v) => v === value).length;
  return (below + 0.5 * equal) / c.length;
}

export function zScore(
  value: number | null | undefined,
  distribution: Array<number | null | undefined>,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const m = mean(distribution);
  const sd = stdDev(distribution);
  if (m === null || sd === null || sd === 0) return null;
  return (value - m) / sd;
}

/** IQR outlier detection: returns { low, high } indices outside the fences. */
export function iqrOutliers(values: number[]): { low: number[]; high: number[] } {
  const q = quartiles(values);
  if (!q) return { low: [], high: [] };
  const low: number[] = [];
  const high: number[] = [];
  values.forEach((v, i) => {
    if (v < q.lowerFence) low.push(i);
    else if (v > q.upperFence) high.push(i);
  });
  return { low, high };
}

/** Linearly normalize `value` from [lo, hi] to [0, 100], clamped. */
export function normalize01to100(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value) || hi === lo) return 50;
  const t = (value - lo) / (hi - lo);
  return Math.max(0, Math.min(100, t * 100));
}
