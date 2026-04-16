"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WorkbookUploader } from "./workbook-uploader";
import { serializePeerScope } from "@/lib/data/selectors";
import type { MappingReport } from "@/lib/types";

type IdName = { id: string; name: string };
type TenantLite = IdName & { categoryId: string | null };

export function HomeWorkspace({
  properties,
  tenants,
  categories,
  mappingReport,
}: {
  properties: IdName[];
  tenants: TenantLite[];
  categories: IdName[];
  mappingReport: MappingReport;
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = React.useState<string | null>(null);
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<"property" | "tenant" | "category">("property");
  const [peerMode, setPeerMode] = React.useState<"all" | "manual">("all");
  const [manualPeers, setManualPeers] = React.useState<string[]>([]);

  const propertyOptions: ComboboxOption[] = properties
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ value: p.id, label: p.name }));
  const tenantOptions: ComboboxOption[] = tenants
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ value: t.id, label: t.name }));
  const categoryOptions: ComboboxOption[] = categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ value: c.id, label: c.name }));

  function togglePeer(id: string) {
    setManualPeers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function analyze() {
    const peerParam = serializePeerScope(
      peerMode === "all"
        ? { kind: "all" }
        : { kind: "manual", ids: manualPeers },
    );
    const sp = new URLSearchParams();
    if (subjectId) sp.set("subject", subjectId);
    sp.set("peers", peerParam);

    if (scope === "property") {
      if (!subjectId) return;
      router.push(`/property/${subjectId}?${sp.toString()}`);
    } else if (scope === "tenant") {
      if (!tenantId || !subjectId) return;
      router.push(`/tenant/${tenantId}?${sp.toString()}`);
    } else {
      if (!categoryId || !subjectId) return;
      router.push(`/category/${categoryId}?${sp.toString()}`);
    }
  }

  const canRun =
    subjectId &&
    (scope === "property" ||
      (scope === "tenant" && tenantId) ||
      (scope === "category" && categoryId));

  const rejected = mappingReport.summary.rejected;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analyze a shopping center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a subject property, optional tenant or category, and a peer universe.
          The app compares the subject against the rest of the workbook and produces
          rules-based conclusions alongside the charts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selection</CardTitle>
          <CardDescription>All fields route to the matching analysis page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-1.5 block">Subject property</Label>
              <Combobox
                options={propertyOptions}
                value={subjectId}
                onChange={setSubjectId}
                placeholder="Select property"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Tenant (for tenant analysis)</Label>
              <Combobox
                options={tenantOptions}
                value={tenantId}
                onChange={setTenantId}
                placeholder="Select tenant"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Category (for category analysis)</Label>
              <Combobox
                options={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Select category"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Analysis scope</Label>
            <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <TabsList>
                <TabsTrigger value="property">Property overview</TabsTrigger>
                <TabsTrigger value="tenant" disabled={!tenantId}>Tenant analysis</TabsTrigger>
                <TabsTrigger value="category" disabled={!categoryId}>Category analysis</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <Label className="mb-1.5 block">Peer universe</Label>
            <RadioGroup
              value={peerMode}
              onValueChange={(v) => setPeerMode(v as "all" | "manual")}
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="all" />
                <div>
                  <div className="text-sm font-medium">All properties in file</div>
                  <div className="text-xs text-muted-foreground">
                    Default. Uses every property in the dataset (minus the subject) as peers.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="manual" />
                <div>
                  <div className="text-sm font-medium">Manual peer picker</div>
                  <div className="text-xs text-muted-foreground">
                    Build a custom comp set from any subset of properties.
                  </div>
                </div>
              </label>
            </RadioGroup>

            {peerMode === "manual" ? (
              <div className="mt-3 rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">
                    Peers selected: <span className="font-semibold text-foreground tabular">{manualPeers.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setManualPeers(properties.map((p) => p.id).filter((id) => id !== subjectId))}>
                      Select all
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setManualPeers([])}>Clear</Button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto flex flex-wrap gap-1.5">
                  {properties
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter((p) => p.id !== subjectId)
                    .map((p) => {
                      const on = manualPeers.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePeer(p.id)}
                          className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                            on
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground hover:bg-accent"
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={analyze} disabled={!canRun} size="lg">Analyze</Button>
            {!canRun && (
              <span className="text-xs text-muted-foreground">
                Pick a subject property to begin{scope !== "property" ? `, plus a ${scope}` : ""}.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Workbook map</CardTitle>
            <CardDescription>How each sheet was interpreted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {mappingReport.sheets.map((s) => (
              <div key={s.sheetName} className="flex items-center justify-between gap-3 border-b last:border-b-0 py-1.5">
                <div>
                  <div className="font-medium">{s.sheetName}</div>
                  <div className="text-xs text-muted-foreground tabular">{s.rows} rows</div>
                </div>
                <Badge variant={s.logicalTable ? "secondary" : "outline"}>
                  {s.logicalTable ?? "ignored"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Swap the workbook</CardTitle>
            <CardDescription>Upload a new file to reparse without restarting.</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkbookUploader />
            {rejected > 0 ? (
              <div className="mt-3 text-xs text-warning">
                {rejected} row(s) in the current workbook were rejected during ingest. Check <code className="font-mono">/api/workbook?report=1</code> for details.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
