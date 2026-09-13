# Band Checker

Look up the official NERC supply band for a Nigerian electricity feeder, and
see what hours/tariff that band is supposed to guarantee — so you can check
it against what you're actually billed.

See the PRD for full scope and reasoning. v1 scope: Ikeja Electric + EKEDC,
weekly automated data checks with a light manual review step.

## Stack

Next.js (App Router) + TypeScript + Tailwind, matching the setup already
used on the portfolio site.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Current state

**The ingestion pipeline is real and has run successfully against the live
site** (fetch, parse, and diff/publish/flag all confirmed working for both
DisCos). The one remaining gap is the Twitter/X reclassification check.

- **UI + search**: working. Search matches against feeder names in
  `src/data/feeders.json` and returns band, guaranteed hours, and
  approximate tariff. Footer shows per-DisCo data freshness from
  `meta.sources`.
- **Fetch & discover** (`scripts/lib/nerc-crawl.ts`): confirmed working
  live — correctly finds both DisCos' current-month PDFs by crawling
  `nerc.gov.ng/resource-category/monthly-energy-caps/`.
- **Parse** (`scripts/lib/parse-feeder-pdf.ts`): confirmed working live
  for both row formats —
  - Ikeja Electric: `<BUSINESS UNIT> BU <FEEDER NAME> <BAND> <CAP>`
  - EKEDC: `<STATE> <UNDERTAKING> <VOLTAGE>kV-<FEEDER NAME> <BAND> <CAP>`
    (no `BU` separator — split on the voltage prefix instead)

  Handles line-wrapped feeder names, the `"- Bilateral"` cap variant, and
  a page-header artifact (`"P a g e |1"`) that pdf-parse glues onto the
  start of the next real line. All confirmed against actual September
  2026 PDF text, not just synthetic samples.
- **Diff / publish / flag** (`scripts/lib/diff-feeders.ts`): compares a
  fresh parse against what's currently published, per DisCo. Policy:
  - Band changes on a known feeder → auto-published (this is the normal,
    expected monthly update NERC's data exists to capture).
  - A new feeder → auto-published, unless its name looks like parser
    garbage, in which case it's flagged.
  - A feeder that disappeared from this month's list → **always**
    flagged, never auto-deleted. The old record stays in place until a
    human confirms it's really gone.
  - If the new record count drops by more than half vs. last time →
    treat it as a likely parsing regression: flag everything, publish
    nothing.
  13 tests cover this policy directly.
- **`scripts/ingest.ts`**: runs the full pipeline end to end. Writes
  `src/data/feeders.json` (only ever adds/updates from the `clean` set —
  never overwrites with less than it started with) and
  `scripts/flagged.json` (everything that needs the weekly ~15-20 min
  manual review: unparsed lines + flagged diffs, per DisCo).
- **`.github/workflows/weekly-update.yml`**: cron shell ready to call
  `ingest.ts` on a schedule.

## Not yet done

- **Twitter/X reclassification check** — the PRD's plan for catching a
  DisCo announcing a feeder change mid-month, ahead of the next official
  PDF. Not started.
- **`flagged.json` has no UI or notification** yet — right now it's a
  file you'd check by hand after a run. Fine for weekly manual review at
  this scale; revisit if that becomes tedious.
- The real `src/data/feeders.json` in this repo is still the January
  2024 **sample data** until you actually run `npx tsx scripts/ingest.ts`
  for real — the ingest script updates it in place when you do.

## Notes on this build

Fonts (Source Serif 4 / IBM Plex Sans / IBM Plex Mono via
`next/font/google`) need real internet access to fetch on first build —
normal, will just work on your machine or on Vercel.
