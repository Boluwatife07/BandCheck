# Band Checker

Look up the official NERC supply band for a Nigerian electricity feeder, and
see what hours/tariff that band is supposed to guarantee — so you can check
it against what you're actually billed.

See the PRD for full scope and reasoning. This repo is the v1 build:
Ikeja Electric + EKEDC, weekly automated data checks with a light manual
review step.

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

- **UI + search**: working. Search matches against feeder names in
  `src/data/feeders.json` and returns band, guaranteed hours, and
  approximate tariff.
- **Data**: `src/data/feeders.json` currently holds **sample data only** —
  real records pulled from NERC's January 2024 Ikeja Electric energy cap
  PDF, used to validate the schema. This is explicitly flagged in the
  file's `meta.note` and in the page footer. **Do not treat this as
  current** — see next steps.
- **EKEDC**: no data yet. The DiscoTabs UI already has a slot for it
  (shows "coming soon" until `feeders.json` has EKEDC records).
- **Ingestion pipeline**: scaffolded but not implemented —
  `scripts/ingest.ts` lays out the 5 steps (fetch → parse → diff →
  publish/flag → Twitter check) and `.github/workflows/weekly-update.yml`
  has the cron shell ready to call it. This is the next real chunk of
  work before this can show a live user anything trustworthy.

## Next steps, in order

1. Confirm whether NERC still publishes an index page for monthly PDFs
   (or whether URLs need to be found another way each month).
2. Implement PDF table extraction for one DisCo first (Ikeja Electric),
   get it reliably parsing before adding EKEDC.
3. Wire up the diff + flagged.json split described in `ingest.ts`.
4. Only then turn on the GitHub Actions schedule for real.

## Notes on this build

Fonts (Source Serif 4 / IBM Plex Sans / IBM Plex Mono via
`next/font/google`) need real internet access to fetch on first build —
this is normal and will just work on your machine or on Vercel.
