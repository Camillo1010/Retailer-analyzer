import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { parseWorkbookBuffer } from "@/lib/ingest/parse-workbook";
import { normalizeWorkbook } from "@/lib/ingest/normalize";
import type { Workbook } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DEFAULT_FILE = "workbook.xlsx";

let cache: Workbook | null = null;

/**
 * Load and cache the workbook in `data/`. The first .xlsx / .xlsm / .xls
 * file wins, preferring `workbook.xlsx` if present.
 */
export async function getWorkbook(): Promise<Workbook | null> {
  if (cache) return cache;
  try {
    const file = await findWorkbookFile();
    if (!file) return null;
    const buf = await fs.readFile(file);
    const sheets = parseWorkbookBuffer(buf);
    cache = normalizeWorkbook({
      fileName: path.basename(file),
      sheets,
    });
    // Print a compact mapping report on first load so the analyst swapping
    // in a new workbook sees exactly how columns were interpreted.
    console.log("[retailer-analyzer] parsed workbook:", cache.fileName);
    for (const s of cache.mappingReport.sheets) {
      console.log(
        `  ${s.sheetName} -> ${s.logicalTable ?? "(ignored)"} (${s.rows} rows)`,
      );
      for (const c of s.columns) {
        if (c.mappedTo) console.log(`    ${c.header} -> ${c.mappedTo}`);
      }
    }
    console.log("  summary:", cache.mappingReport.summary);
    return cache;
  } catch (err) {
    console.error("[retailer-analyzer] parse failed:", err);
    return null;
  }
}

export function invalidateWorkbookCache() {
  cache = null;
}

export async function writeWorkbook(fileName: string, buffer: Buffer): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, DEFAULT_FILE), buffer);
  invalidateWorkbookCache();
  // Touch a .txt sibling so users see the original uploaded name
  await fs.writeFile(path.join(DATA_DIR, "workbook.origname.txt"), fileName, "utf8");
}

async function findWorkbookFile(): Promise<string | null> {
  try {
    const files = await fs.readdir(DATA_DIR);
    const canonical = files.find((f) => f.toLowerCase() === DEFAULT_FILE);
    if (canonical) return path.join(DATA_DIR, canonical);
    const anyXlsx = files.find((f) => /\.(xlsx|xlsm|xls)$/i.test(f));
    return anyXlsx ? path.join(DATA_DIR, anyXlsx) : null;
  } catch {
    return null;
  }
}
