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
 * Two row formats are supported, both confirmed against real September
 * 2026 PDFs:
 * - Ikeja Electric: "<BUSINESS UNIT> BU <FEEDER NAME> <BAND> <CAP>" —
 *   split on the literal " BU " separator.
 * - EKEDC: "<STATE> <UNDERTAKING> <VOLTAGE>kV-<FEEDER NAME> <BAND> <CAP>"
 *   — no " BU " separator; feeder names instead start with a voltage
 *   prefix like "11kV-". Split there instead.
 *
 * Known rough edges (call these out to whoever reviews `unparsedLines`):
 * - Some Ikeja Electric months prefix rows with a STATE column (e.g.
 *   "OGUN ABULE-EGBA BU ..."). This parser keeps that prefix attached to
 *   businessUnit rather than splitting it out — fine for search/lookup,
 *   just means businessUnit isn't perfectly normalised across months.
 *   Same applies to EKEDC's leading state name.
 * - Only these two DisCos' formats have been seen for real. A third
 *   DisCo added later will likely need its own split rule here.
 */

import { BandLetter, FeederRecord } from "@/lib/bands";

const NOISE_PATTERNS: RegExp[] = [
  /^page\s*\|/i,
  /^p\s*a\s*g\s*e\s*\|/i, // PDF text extraction sometimes spaces out "Page | 1" as "P a g e |1"
  /^--\s*\d+\s*of\s*\d+\s*--$/i, // "-- 2 of 2 --" style page footers
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

// Ikeja Electric-style separator between business unit and feeder name.
const BU_SEPARATOR = " BU ";

// EKEDC feeder names start with a voltage prefix like "11kV-" — use the
// last occurrence as the split point when there's no " BU " separator.
const VOLTAGE_PREFIX = /\d+\s*k[vV]\s*-/;

function splitBusinessUnitAndFeeder(
  prefix: string
): { businessUnit: string; feederName: string } | null {
  const buIdx = prefix.lastIndexOf(BU_SEPARATOR);
  if (buIdx !== -1) {
    return {
      businessUnit: prefix.slice(0, buIdx).trim(),
      feederName: prefix.slice(buIdx + BU_SEPARATOR.length).trim(),
    };
  }

  const voltageMatch = VOLTAGE_PREFIX.exec(prefix);
  if (voltageMatch) {
    return {
      businessUnit: prefix.slice(0, voltageMatch.index).trim(),
      feederName: prefix.slice(voltageMatch.index).trim(),
    };
  }

  return null;
}

// Line (or accumulated buffer) ending in a band letter, optionally
// "- Bilateral", then a cap figure (may contain commas).
const RECORD_END = /(?:^|\s)([A-E])(?:\s*-\s*Bilateral)?\s+([\d,]+)\s*$/i;

// Page-header artifacts pdf-parse sometimes glues onto the start of the
// next real line rather than emitting on their own line — strip as a
// prefix, not just matched as a whole-line noise pattern.
const LEADING_PAGE_MARKER = /^(?:p\s*a\s*g\s*e|page)\s*\|\s*\d+\s*/i;

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(line));
}

function stripLeadingPageMarker(line: string): string {
  return line.replace(LEADING_PAGE_MARKER, "");
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

  for (const rawLine of lines) {
    const line = stripLeadingPageMarker(rawLine);
    if (!line || isNoise(line)) continue;

    const candidate = buffer ? `${buffer} ${line}` : line;
    const match = candidate.match(RECORD_END);

    if (!match) {
      buffer = candidate;
      continue;
    }

    const band = match[1].toUpperCase() as BandLetter;
    const prefix = candidate.slice(0, match.index).trim();
    const split = splitBusinessUnitAndFeeder(prefix);

    if (!split || !split.businessUnit || !split.feederName) {
      unparsedLines.push(candidate);
    } else {
      records.push({ disco, ...split, band });
    }
    buffer = "";
  }

  if (buffer) unparsedLines.push(buffer);

  return { records, unparsedLines };
}
