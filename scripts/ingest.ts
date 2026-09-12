/**
 * Weekly ingestion pipeline (PRD §6).
 *
 * Status: fetch + parse are real and tested (see scripts/lib/ and
 * scripts/__tests__/). Diff / publish / flag / Twitter-check are still
 * TODO — see the end of this file.
 *
 * IMPORTANT before turning on the scheduled job: scripts/lib/nerc-crawl.ts
 * was written against nerc.gov.ng's rendered text content, not its raw
 * HTML source (this dev sandbox couldn't reach nerc.gov.ng to inspect
 * markup directly). Run `npx tsx scripts/ingest.ts` for real once, look
 * at what it finds, and adjust extractPdfLinks()/filterByDisco() if the
 * live markup doesn't match.
 *
 * Run with: npx tsx scripts/ingest.ts
 */

import { findFeederPdfLinks } from "./lib/nerc-crawl";
import { parseFeederPdfText } from "./lib/parse-feeder-pdf";
// @ts-expect-error -- pdf-parse has no bundled types
import pdfParse from "pdf-parse";

const DISCOS = ["Ikeja Electric", "EKEDC"] as const;

async function ingestDisco(disco: (typeof DISCOS)[number]) {
  console.log(`\n=== ${disco} ===`);

  const links = await findFeederPdfLinks(disco, /* maxPages */ 2);
  if (links.length === 0) {
    console.log(`No PDFs found for ${disco}. Check nerc-crawl.ts against the live markup.`);
    return;
  }

  // Most recent (page 1, first match) is what we care about weekly.
  const target = links[0];
  console.log(`Found: ${target.title}\n  ${target.url}`);

  const res = await fetch(target.url);
  if (!res.ok) {
    console.log(`Failed to download PDF: ${res.status}`);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  const { text } = await pdfParse(buffer);
  const { records, unparsedLines } = parseFeederPdfText(text, disco);

  console.log(`Parsed ${records.length} feeder records, ${unparsedLines.length} unparsed lines.`);
  if (unparsedLines.length > 0) {
    console.log("Unparsed (would go to flagged.json for manual review):");
    unparsedLines.slice(0, 10).forEach((l) => console.log(`  - ${l}`));
  }

  // TODO:
  // 1. Load current src/data/feeders.json for this disco.
  // 2. Diff `records` against it (added / removed / band-changed).
  // 3. Write clean diffs back to feeders.json; write unparsedLines +
  //    ambiguous diffs to a flagged.json for the weekly manual review.
  // 4. Update feeders.json's meta.lastIngested / sourceMonth.
}

async function main() {
  for (const disco of DISCOS) {
    try {
      await ingestDisco(disco);
    } catch (err) {
      console.error(`Error ingesting ${disco}:`, err);
    }
  }

  console.log(
    "\nNext: implement diff/publish/flag (see TODO in ingestDisco), then the separate X/Twitter check described in the module comment at the top of this file."
  );
}

main();
