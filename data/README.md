# `data/` — workbook inputs

Drop your Excel workbook here as `workbook.xlsx`. The app parses it on first
load and caches the normalized tables in memory. To swap in a new workbook
without restarting, use the uploader on the homepage.

## Expected shape (fuzzy-matched)

The ingest layer does not require exact sheet or column names. It uses
synonym-based fuzzy matching defined in
`src/lib/ingest/sheet-mapping.ts`. A workbook usually contains a subset of:

| Logical table       | Matched sheet names (examples)                                                                 | Required per row                          |
| ------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `observations`      | "tenant sales", "tenant by property", "store sales", "tenant sales comparison"                 | property, tenant (+ any metrics)          |
| `categoryMetrics`   | "property category summary", "category by property"                                            | property, category (+ psf, occ%, sales…)  |
| `properties`        | "property list", "properties", "shopping centers"                                              | property (+ enclosed, total sqft…)        |
| `tenants`           | "tenant list", "retailers"                                                                     | tenant (+ category)                       |
| `categories`        | "category list"                                                                                | category                                  |
| `subjectRanking`    | "ranking", "clackamas ranking"                                                                 | category (+ psf) — subject inferred       |

### Column headers

Every logical field has a synonym list; pick whatever your analysts naturally
write. Examples:
- `sales psf` ← Sales PSF, Sales / SF, $/SF, PSF, PPSF
- `occCostPct` ← Occupancy %, Occ Cost %, Occ %, Occupancy Ratio
- `enclosed` ← Enclosed, Enclosed Y/N, Is Enclosed

If a column isn't recognized, it's ignored. The homepage shows the full map
for each sheet so you can verify interpretation at a glance.

### Values

- `$12,345`, `12.3%`, `N/A`, `-`, blank, `#N/A` are all handled.
- Percent cells > 1 (e.g. `12`) are treated as percent units (0.12); cells ≤ 1
  are treated as fractions.
- When `sales PSF` is missing but `sales` and `sqft` exist, PSF is derived.

### Diagnostics

`GET /api/workbook?report=1` returns the full sheet→logical-table map plus
every rejected row with its reason.
