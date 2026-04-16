import { NextRequest, NextResponse } from "next/server";
import { getWorkbook, invalidateWorkbookCache, writeWorkbook } from "@/lib/data/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("missing file", { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return new NextResponse("file exceeds 25 MB limit", { status: 413 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeWorkbook(file.name, buffer);
  // warm the cache so the next request is quick
  const wb = await getWorkbook();
  return NextResponse.json({
    ok: true,
    fileName: wb?.fileName,
    summary: wb?.mappingReport.summary,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("reset") === "1") {
    invalidateWorkbookCache();
  }
  const wb = await getWorkbook();
  if (!wb) return NextResponse.json({ ok: false, error: "no workbook" }, { status: 404 });
  if (url.searchParams.get("report") === "1") {
    return NextResponse.json({
      ok: true,
      fileName: wb.fileName,
      parsedAt: wb.parsedAt,
      mapping: wb.mappingReport,
      rejected: wb.rejected,
    });
  }
  return NextResponse.json({
    ok: true,
    fileName: wb.fileName,
    parsedAt: wb.parsedAt,
    summary: wb.mappingReport.summary,
  });
}
