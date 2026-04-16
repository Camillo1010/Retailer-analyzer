import * as XLSX from "xlsx";

export interface RawSheet {
  name: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

/**
 * Parse a workbook buffer into raw sheets with normalized headers.
 * Finds the header row heuristically: the first row where >=2 non-empty
 * string cells appear. This tolerates workbooks with a title row above
 * the actual headers.
 */
export function parseWorkbookBuffer(buffer: ArrayBuffer | Uint8Array): RawSheet[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const out: RawSheet[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      blankrows: false,
      raw: true,
    });
    if (!aoa.length) {
      out.push({ name: sheetName, headers: [], rows: [], rowCount: 0 });
      continue;
    }

    const headerIdx = detectHeaderRow(aoa);
    if (headerIdx === -1) {
      out.push({ name: sheetName, headers: [], rows: [], rowCount: 0 });
      continue;
    }
    const headerRow = aoa[headerIdx] ?? [];
    const rawHeaders = headerRow.map((c) => (c == null ? "" : String(c).trim()));
    // dedupe headers: empty -> __colN; duplicates get #2, #3 suffixes
    const seen = new Map<string, number>();
    const headers = rawHeaders.map((h, i) => {
      const base = h || `__col${i}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return count === 1 ? base : `${base}__${count}`;
    });

    const rows: Array<Record<string, unknown>> = [];
    for (let i = headerIdx + 1; i < aoa.length; i++) {
      const r = aoa[i];
      if (!r) continue;
      if (r.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
      const rec: Record<string, unknown> = {};
      for (let c = 0; c < headers.length; c++) {
        rec[headers[c]] = r[c] ?? null;
      }
      // stash the 1-based spreadsheet row number for traceability
      rec.__rowNum = i + 1;
      rows.push(rec);
    }

    out.push({ name: sheetName, headers: rawHeaders, rows, rowCount: rows.length });
  }
  return out;
}

function detectHeaderRow(aoa: unknown[][]): number {
  const maxScan = Math.min(aoa.length, 10);
  for (let i = 0; i < maxScan; i++) {
    const row = aoa[i];
    if (!row) continue;
    const textCells = row.filter(
      (c) => typeof c === "string" && c.trim().length > 0,
    ).length;
    const numCells = row.filter((c) => typeof c === "number").length;
    // header rows have lots of text and few numbers
    if (textCells >= 2 && textCells >= numCells) return i;
  }
  // fallback: first non-empty row
  for (let i = 0; i < aoa.length; i++) {
    if (aoa[i]?.some((c) => c !== null && c !== undefined && String(c).trim() !== "")) {
      return i;
    }
  }
  return -1;
}
