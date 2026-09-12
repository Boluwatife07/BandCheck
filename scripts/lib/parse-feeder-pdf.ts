/**
 * Parses the extracted text of a NERC monthly energy cap PDF into
 * feeder/band records.
 *
 * These PDFs are not clean tables — pdf-parse (or any text extractor)
 * gives you the words in reading order, and long feeder names regularly
 * wrap onto a second line mid-row. This parser handles that by buffering
 * text until it sees a line ending in a band letter + a cap number, which
 * is the one part of every row that's structurally reliable.
 *
 * Known rough edges (call these out to whoever reviews `unparsedLines`):
 * - Some months prefix rows with a STATE column (e.g. "OGUN ABULE-EGBA BU
 *   ..."). This parser keeps that prefix attached to businessUnit rather
 *   than splitting it out — fine for search/lookup, just means
 *   businessUnit isn't perfectly normalised across months.
 * - This is tuned against Ikeja Electric's row format
 *   ("<BUSINESS UNIT> BU <FEEDER NAME> <BAND> <CAP>"). EKEDC's monthly
 *   cap PDFs haven't been inspected yet — do not assume this parser
 *   works on them unmodified. Grab a real EKEDC PDF and check before
 *   wiring it in.
 */

import { BandLetter, FeederRecord } from "@/lib/bands";

const NOISE_PATTERNS: RegExp[] = [
  /^page\s*\|/i,
  /^order no\/nerc/i,
  /^business unit/i,
  /^state\s/i,
  /^non-?\s*md/i,
  /^service\s*$/i,
  /^band\s*$/i,
  /^cap\s*$/i,
  /^cap\s*\(kwh\)/i,
  /nigerian electricity/i,
  /energy caps of unmetered/i,
  /methodology for the determination/i,
  /monthly energy cap/i, // catches the title line anywhere it appears, not just at line-start
  /distribution plc/i, // the title line always names "<Disco> Distribution Plc" — feeder names never do
  /consumed in/i,
  /^\(kwh\)/i,
];

// Line (or accumulated buffer) ending in a band letter, optionally
// "- Bilateral", then a cap figure (may contain commas).
const RECORD_END = /(?:^|\s)([A-E])(?:\s*-\s*Bilateral)?\s+([\d,]+)\s*$/i;

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(line));
}

export interface ParseResult {
  records: FeederRecord[];
  unparsedLines: string[];
}

export function parseFeederPdfText(text: string, disco: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const records: FeederRecord[] = [];
  const unparsedLines: string[] = [];
  let buffer = "";

  for (const line of lines) {
    if (isNoise(line)) continue;

    const candidate = buffer ? `${buffer} ${line}` : line;
    const match = candidate.match(RECORD_END);

    if (!match) {
      buffer = candidate;
      continue;
    }

    const band = match[1].toUpperCase() as BandLetter;
    const prefix = candidate.slice(0, match.index).trim();
    const buIdx = prefix.lastIndexOf(" BU ");

    if (buIdx === -1) {
      unparsedLines.push(candidate);
    } else {
      const businessUnit = prefix.slice(0, buIdx).trim();
      const feederName = prefix.slice(buIdx + 4).trim();
      if (businessUnit && feederName) {
        records.push({ disco, businessUnit, feederName, band });
      } else {
        unparsedLines.push(candidate);
      }
    }
    buffer = "";
  }

  if (buffer) unparsedLines.push(buffer);

  return { records, unparsedLines };
}
