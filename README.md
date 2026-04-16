# Retailer Analyzer

Internal web app for evaluating a shopping center against a peer set drawn
from an uploaded Excel workbook. Built for acquisitions, leasing, and
portfolio-strategy teams — institutional feel, analytical by default,
rules-based conclusions rather than free-text speculation.

## What it does

1. **Ingests** an Excel workbook with tenant-level sales, property/category
   summaries, and ranking sheets. Sheet and column names are fuzzy-matched
   against a synonym layer so the same app can consume variations.
2. **Normalizes** the data into five domain tables: `properties`, `tenants`,
   `categories`, `observations` (tenant × property), and
   `categoryMetrics` (property × category).
3. **Analyzes** on four pages:
   - **Property overview** — subject KPIs, category scorecards, rank, two
     score cards (Center Quality Signal, Lease-Up Signal), insights.
   - **Tenant analysis** — chain-wide productivity of a single tenant,
     subject-location percentile, scatter of PSF vs occupancy cost.
   - **Category analysis** — PSF distribution (box plot), scatter, ranked
     property table.
   - **Peer workspace** — scorecards, tenant overlap, strengths/weaknesses,
     percentile heatmap across categories.
4. **Writes conclusions** via a transparent rules engine
   (`src/lib/analytics/insights.ts`). Every bullet cites its metric and
   threshold; nothing is hallucinated.

## Getting started

```bash
npm install
# drop your workbook at data/workbook.xlsx (or use the uploader after launch)
npm run dev
# open http://localhost:3000
```

Production build / run:
```bash
npm run build
npm start
```

## Swapping workbooks

Two ways:

- **Local file** — drop any `.xlsx` / `.xlsm` / `.xls` into `data/`
  (canonical filename: `workbook.xlsx`). Restart or hit `/api/workbook?reset=1`.
- **Upload via UI** — on the homepage, use the "Swap the workbook" card.
  Server overwrites `data/workbook.xlsx` and invalidates the cache.

On first parse, the terminal prints which sheets mapped to which logical
tables and which columns mapped to which logical fields. The homepage shows
the same map. `GET /api/workbook?report=1` returns the full JSON including
any rejected rows with reasons.

## Where calculations live

- `src/lib/analytics/stats.ts` — mean, median, weighted mean, quartiles,
  percentile rank, z-score, IQR outlier detection. Pure functions;
  null-safe; never throw.
- `src/lib/analytics/scoring.ts` —
  `centerQualitySignal()` and `leaseUpSignal()` return a `SignalScore` with
  the numeric score **and** each weighted component so the breakdown is
  always visible in the UI.
- `src/lib/analytics/insights.ts` — rule registry. Each rule evaluates
  against a `PeerFrame` and returns a structured `Insight` (or nothing).
- `src/lib/analytics/thresholds.ts` — **single source of truth** for every
  tunable number (quartile cutoffs, minimum peer N, scoring weights,
  verdict buckets). Edit here to re-tune.
- `src/lib/analytics/peer-set.ts` — resolves subject + peer observations
  and metrics into a `PeerFrame` used throughout the analytics code.

## Where ingest lives

- `src/lib/ingest/parse-workbook.ts` — xlsx → array-of-object rows,
  with header-row auto-detection (handles a blank / title row above
  the real headers).
- `src/lib/ingest/sheet-mapping.ts` — sheet-name and column-header fuzzy
  matchers. **Add synonyms here** when a new workbook uses novel labels.
- `src/lib/ingest/validate.ts` — value coercion (`$`, `,`, `%`, `-`,
  `N/A`, blank → number | null).
- `src/lib/ingest/normalize.ts` — produces the five normalized tables.
  Unrecognized sheets that "look like" observations or category metrics
  are ingested via structural fallback.

## Assumptions

- Every row in a normalized table carries a `sourceRef` pointing back to
  its sheet + 1-based row number, for downstream traceability.
- Properties, tenants, categories are keyed by a slug of the name
  (lowercased, non-alphanumerics collapsed to `-`). Two spelling variants
  of a tenant in the workbook will currently be treated as two tenants —
  deliberate, since the alternative risks silent merges.
- `occCostPct` is stored as a fraction (0.12 = 12%). Values > 1 in the
  source are interpreted as percent units.
- Category "Food & Beverage" is identified heuristically (name contains
  "food", "beverage", "f&b", "restaurant"). If your workbook uses a
  different label, the F&B-specific insight rule won't fire.
- Insights only fire when the peer N meets `THRESHOLDS.minPeerN` (3).
- Score verdicts are labels on fixed bands; they are **not** a
  prediction. Every score shows its components with weights.

## Tech stack

Next.js 14 App Router · TypeScript (strict) · Tailwind · shadcn/ui
primitives · Recharts · SheetJS (xlsx) for server-side parsing.

## Folder map

```
app/                    # Next.js App Router pages + API
  api/workbook/route.ts  # POST upload, GET status/report
  property/[slug]
  tenant/[slug]
  category/[slug]
  peers
src/
  lib/
    ingest/   parse + fuzzy map + normalize + validate
    analytics/ stats, peer-set, scoring, insights, thresholds
    data/     store (cache), selectors
    types.ts  domain model
  components/
    ui/       shadcn primitives
    layout/   sidebar, page-header
    home/     homepage workspace, uploader, empty-state
    kpi/      KpiCard
    charts/   ranked-bar, scatter, box-plot, heatmap, chart-theme
    insights/ insight-card, score-card
data/                   # drop your workbook here
```

## What it intentionally doesn't do

- No authentication — single-team, local-use tool.
- No long-term persistence — the workbook in `data/` is the database.
- No LLM calls — all "what the data suggests" text comes from
  deterministic rules in `insights.ts`. The scoring model is fully
  transparent.
