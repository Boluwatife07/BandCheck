/**
 * Weekly ingestion pipeline (PRD §6).
 *
 * This is a scaffold, not a finished pipeline — the pieces below are the
 * next real build task. Wiring it up needs:
 *
 * 1. Fetch: check nerc.gov.ng for a new Ikeja Electric / EKEDC monthly
 *    energy cap PDF since the last run (compare against meta.lastIngested
 *    in src/data/feeders.json). NERC's PDFs live under predictable-ish
 *    paths like /wp-content/uploads/<year>/<month>/<DiscoName>...pdf —
 *    worth checking whether they still publish an index page listing
 *    each month's file, since that's more reliable than guessing URLs.
 *
 * 2. Parse: extract the feeder/band table from the PDF. These are
 *    multi-page tables with merged cells (see the sample data note in
 *    feeders.json) — a library like `pdf-parse` or `pdf2json` will get
 *    the text out, but the table structure will likely need custom
 *    row-reconstruction logic. Budget real time for this step; it's the
 *    least predictable part of the whole pipeline.
 *
 * 3. Diff: compare newly parsed records against the current
 *    src/data/feeders.json, and produce a change list (added / removed /
 *    band-changed feeders).
 *
 * 4. Publish or flag: auto-write clean diffs back to feeders.json.
 *    Anything the parser couldn't confidently extract should be written
 *    to a `flagged.json` file instead, for the weekly ~15-20 min manual
 *    review (PRD §7) rather than silently dropped or guessed at.
 *
 * 5. Twitter/X check: separately poll Ikeja Electric's and EKEDC's
 *    accounts for reclassification announcements. Treat any hit as a
 *    flagged item for manual confirm — never auto-publish from a tweet.
 *
 * Run with: npx tsx scripts/ingest.ts
 */

async function main() {
  console.log("TODO: implement steps 1–5 above.");
}

main();
