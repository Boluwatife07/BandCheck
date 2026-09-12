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

- **UI + search**: working. Search matches against feeder names in
  `src/data/feeders.json` and returns band, guaranteed hours, and
  approximate tariff.
- **Data**: `src/data/feeders.json` holds **sample data only** — real
  records from NERC's January 2024 Ikeja Electric energy cap PDF, used to
  validate the schema. Flagged in the file's `meta.note` and in the page
  footer. **Not current** — the ingestion pipeline below replaces it.
- **EKEDC**: no data yet. UI shows "coming soon" until it has records.
- **Ingestion pipeline — fetch & parse are real and tested:**
  - `scripts/lib/parse-feeder-pdf.ts` — turns a NERC PDF's extracted text
    into feeder/band records. Tested against real PDF text, including the
    messy line-wrapped rows and the "- Bilateral" edge case
    (`scripts/__tests__/parse-feeder-pdf.test.ts`).
  - `scripts/lib/nerc-crawl.ts` — finds the current month's PDF link for a
    DisCo by crawling NERC's document archive at
    `nerc.gov.ng/resource-category/monthly-energy-caps/` (confirmed this
    page exists and lists the right documents — filenames aren't
    consistent across months, so guessing URLs doesn't work). **Not yet
    verified against the site's real HTML** — this sandbox's network
    allowlist doesn't include nerc.gov.ng, so the crawler was written
    against the page's rendered text content, not its markup. Run it for
    real once and check `extractPdfLinks()` finds what you expect before
    trusting the scheduled job.
  - `scripts/ingest.ts` — wires fetch → parse together and prints what it
    finds. **Diff / publish / flag / Twitter-check are still TODO** —
    see the comments at the bottom of the file.
  - `.github/workflows/weekly-update.yml` — cron shell ready to call
    `ingest.ts` once the TODOs above are done.

## Next steps, in order

1. Run `npx tsx scripts/ingest.ts` for real (needs real internet access —
   won't work from a sandboxed dev environment). Fix `nerc-crawl.ts`
   against whatever the actual markup turns out to be.
2. Get a real EKEDC monthly cap PDF and check whether
   `parse-feeder-pdf.ts` needs adjusting for their row format — it's only
   been tested against Ikeja Electric's.
3. Implement the diff/publish/flag split described in `ingest.ts`.
4. Turn on the GitHub Actions schedule.

## Notes on this build

Fonts (Source Serif 4 / IBM Plex Sans / IBM Plex Mono via
`next/font/google`) need real internet access to fetch on first build —
normal, will just work on your machine or on Vercel.
