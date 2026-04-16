/**
 * Value coercion helpers. Treats "-", "", "N/A", "NA", "n/a", null, undefined
 * as missing. Strips $, commas, %, and handles numeric strings.
 */

const BLANK_TOKENS = new Set(["", "-", "—", "–", "n/a", "na", "null", "#n/a", "#null!"]);

export function toText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (BLANK_TOKENS.has(s.toLowerCase())) return null;
  return s;
}

export function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (BLANK_TOKENS.has(s.toLowerCase())) return null;
  // strip $ , spaces, and thousands separators; record if it had a percent sign
  const cleaned = s.replace(/[\s,$]/g, "").replace(/%$/, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "+") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a percent-like cell. Returns a fraction (0..1).
 * "12%" -> 0.12
 * "12"  -> 0.12    (treated as percent, not fraction)
 * "0.12" -> 0.12   (treated as fraction)
 * The heuristic: a value > 1 is interpreted as percent units.
 */
export function toPercent(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return raw > 1 ? raw / 100 : raw;
  }
  const s = String(raw).trim();
  if (BLANK_TOKENS.has(s.toLowerCase())) return null;
  const hasPct = /%\s*$/.test(s);
  const n = toNumber(s);
  if (n === null) return null;
  if (hasPct) return n / 100;
  return n > 1 ? n / 100 : n;
}

export function toBool(raw: unknown): boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  if (BLANK_TOKENS.has(s)) return null;
  if (["y", "yes", "true", "t", "1", "x", "enclosed"].includes(s)) return true;
  if (["n", "no", "false", "f", "0", "open"].includes(s)) return false;
  return null;
}
