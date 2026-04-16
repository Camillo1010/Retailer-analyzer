"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function WorkbookUploader() {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/workbook", { method: "POST", body: fd });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Upload failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-3 rounded-md border border-dashed px-4 py-4 cursor-pointer hover:bg-muted/40">
        <div>
          <div className="text-sm font-medium">
            {file ? file.name : "Choose an .xlsx file"}
          </div>
          <div className="text-xs text-muted-foreground">
            Max 25 MB. Parsed server-side; never sent to a third party.
          </div>
        </div>
        <Upload className="h-4 w-4 text-muted-foreground" />
        <input
          type="file"
          accept=".xlsx,.xlsm,.xls"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
      <Button onClick={submit} disabled={!file || busy}>
        {busy ? "Parsing…" : "Upload & analyze"}
      </Button>
    </div>
  );
}
