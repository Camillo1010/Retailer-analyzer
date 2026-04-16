import { getWorkbook } from "@/lib/data/store";
import { HomeWorkspace } from "@/components/home/workspace";
import { EmptyWorkbookState } from "@/components/home/empty-state";

export default async function HomePage() {
  const wb = await getWorkbook();
  if (!wb) return <EmptyWorkbookState />;

  return (
    <HomeWorkspace
      properties={wb.properties.map((p) => ({ id: p.id, name: p.name }))}
      tenants={wb.tenants.map((t) => ({ id: t.id, name: t.name, categoryId: t.categoryId ?? null }))}
      categories={wb.categories.map((c) => ({ id: c.id, name: c.name }))}
      mappingReport={wb.mappingReport}
    />
  );
}
