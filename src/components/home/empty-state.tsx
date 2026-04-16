import { Card, CardContent } from "@/components/ui/card";
import { WorkbookUploader } from "./workbook-uploader";

export function EmptyWorkbookState() {
  return (
    <div className="mx-auto max-w-2xl pt-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Retailer Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare tenant, category, and property performance across your internal retail dataset.
        </p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <div className="text-sm font-medium">No workbook loaded</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your .xlsx to get started. The app parses tenant-level sales,
              category summaries, and ranking sheets; fuzzy header matching tolerates
              small schema variations.
            </p>
          </div>
          <WorkbookUploader />
          <div className="text-xs text-muted-foreground">
            You can also drop the file at <code className="font-mono">data/workbook.xlsx</code> in the repo and refresh.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
