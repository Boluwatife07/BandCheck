/**
 * Weekly ingestion pipeline (PRD §6).
 *
 * Status: fetch, parse, and diff/publish/flag are real, tested, and have
 * been run once against the live site (see the module comments in
 * scripts/lib/*.ts for what was verified vs. still assumed). The
 * Twitter/X reclassification check described in the PRD is the one
 * remaining piece — not started.
 *
 * What this does, per DisCo:
 *   1. Find this month's PDF (nerc-crawl.ts) — confirmed working live.
 *   2. Download + extract its text (pdf-parse) and parse it into
 *      records (parse-feeder-pdf.ts) — confirmed working live for both
 *      Ikeja Electric and EKEDC's row formats.
 *   3. Diff against what's currently in src/data/feeders.json
 *      (diff-feeders.ts) and split into "clean" (safe to auto-publish)
 *      and "flagged" (needs the weekly manual review).
 *   4. Write the updated dataset and a flagged.json report.
 *
 * Run with: npx tsx scripts/ingest.ts
 */

import { findFeederPdfLinks } from "./lib/nerc-crawl";
import { parseFeederPdfText } from "./lib/parse-feeder-pdf";
import { diffFeeders, applyCleanDiffs, FeederDiff } from "./lib/diff-feeders";
import { deriveSourceMonth } from "./lib/derive-source-month";
import { loadDataset, saveDataset, saveFlagged } from "./lib/dataset-io";
import { PDFParse } from "pdf-parse";
import { FeederRecord, DiscoSourceMeta } from "../src/lib/bands";

const DISCOS = ["Ikeja Electric", "EKEDC"] as const;

interface DiscoResult {
  disco: string;
  updatedRecords: FeederRecord[] | null; // null = nothing usable this run
  sourceMeta: DiscoSourceMeta | null;
  flaggedDiffs: FeederDiff[];
  unparsedLines: string[];
}

async function ingestDisco(
  disco: (typeof DISCOS)[number],
  currentRecordsForDisco: FeederRecord[]
): Promise<DiscoResult> {
  console.log(`\n=== ${disco} ===`);
  const empty: DiscoResult = {
    disco,
    updatedRecords: null,
    sourceMeta: null,
    flaggedDiffs: [],
    unparsedLines: [],
  };

  const links = await findFeederPdfLinks(disco, /* maxPages */ 2);
  if (links.length === 0) {
    console.log(`No PDFs found for ${disco}. Check nerc-crawl.ts against the live markup.`);
    return empty;
  }

  const target = links[0]; // archive is reverse-chronological — first match is current
  console.log(`Found: ${target.title}\n  ${target.url}`);

  const res = await fetch(target.url);
  if (!res.ok) {
    console.log(`Failed to download PDF: ${res.status}`);
    return empty;
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  await parser.destroy();
  const { records: freshRecords, unparsedLines } = parseFeederPdfText(text, disco);

  console.log(`Parsed ${freshRecords.length} feeder records, ${unparsedLines.length} unparsed lines.`);

  const diff = diffFeeders(currentRecordsForDisco, freshRecords, disco);
  console.log(
    `Diff: ${diff.clean.length} clean (auto-publish), ${diff.flagged.length} flagged (needs review), ${diff.unchangedCount} unchanged.`
  );

  const updatedRecords = applyCleanDiffs(currentRecordsForDisco, diff.clean);

  const sourceMeta: DiscoSourceMeta = {
    disco,
    source: target.url,
    sourceMonth: deriveSourceMonth(target.url),
    lastIngested: new Date().toISOString(),
  };

  return { disco, updatedRecords, sourceMeta, flaggedDiffs: diff.flagged, unparsedLines };
}

async function main() {
  const dataset = await loadDataset();
  const results: DiscoResult[] = [];

  for (const disco of DISCOS) {
    const currentForDisco = dataset.records.filter((r) => r.disco === disco);
    try {
      results.push(await ingestDisco(disco, currentForDisco));
    } catch (err) {
      console.error(`Error ingesting ${disco}:`, err);
      results.push({
        disco,
        updatedRecords: null,
        sourceMeta: null,
        flaggedDiffs: [],
        unparsedLines: [],
      });
    }
  }

  // Rebuild the full records list: for each DisCo, use this run's updated
  // records if we got any, otherwise leave whatever was already there
  // untouched (a failed fetch/parse should never wipe existing data).
  const otherDiscoRecords = dataset.records.filter(
    (r) => !DISCOS.includes(r.disco as (typeof DISCOS)[number])
  );
  const newRecords = [...otherDiscoRecords];
  for (const disco of DISCOS) {
    const result = results.find((r) => r.disco === disco);
    if (result?.updatedRecords) {
      newRecords.push(...result.updatedRecords);
    } else {
      newRecords.push(...dataset.records.filter((r) => r.disco === disco));
    }
  }

  const newSources = dataset.meta.sources.filter(
    (s) => !DISCOS.includes(s.disco as (typeof DISCOS)[number])
  );
  for (const result of results) {
    if (result.sourceMeta) newSources.push(result.sourceMeta);
    else {
      const existing = dataset.meta.sources.find((s) => s.disco === result.disco);
      if (existing) newSources.push(existing);
    }
  }

  const anySampleDataLeft = newSources.length === 0;
  await saveDataset({
    meta: {
      note: anySampleDataLeft
        ? dataset.meta.note
        : "Live data from NERC's monthly energy cap publications. See meta.sources for per-DisCo freshness.",
      sources: newSources,
    },
    records: newRecords,
  });

  await saveFlagged({
    generatedAt: new Date().toISOString(),
    unparsedLines: results.flatMap((r) =>
      r.unparsedLines.map((line) => ({ disco: r.disco, line }))
    ),
    diffs: results.flatMap((r) => r.flaggedDiffs),
  });

  const totalFlagged = results.reduce(
    (n, r) => n + r.flaggedDiffs.length + r.unparsedLines.length,
    0
  );
  console.log(
    `\nWrote src/data/feeders.json (${newRecords.length} total records) and scripts/flagged.json (${totalFlagged} items for review).`
  );
  console.log(
    "Still TODO: the separate weekly X/Twitter reclassification check described in the module comment above."
  );
}

main();
