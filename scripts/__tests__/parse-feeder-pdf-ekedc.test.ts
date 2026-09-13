import { parseFeederPdfText } from "../lib/parse-feeder-pdf";

// Real text as extracted from NERC's September 2026 EKEDC PDF
// (captured from an actual `ingest.ts` run against the live site).
// Deliberately includes the mangled "P a g e |1" page-header artifact
// glued onto the first data line, exactly as it came out of pdf-parse.
const SAMPLE_SEPT_2026 = `
P a g e |1 OGUN AGBARA 11kV-AJARA B 304
OGUN AGBARA 11kV-BADAGRY D 301
OGUN AGBARA 11kV-ESTATE (AGBARA) A 634
OGUN AGBARA 11kV-FIVE STAR A 243
OGUN AGBARA 11kV-IBA D 331
`;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL: ${label}\n  expected: ${e}\n  actual:   ${a}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

function run() {
  const result = parseFeederPdfText(SAMPLE_SEPT_2026, "EKEDC");

  assertEqual(result.records.length, 5, "EKEDC sample: parses all 5 records");
  assertEqual(result.unparsedLines.length, 0, "EKEDC sample: no unparsed lines");

  assertEqual(
    result.records[0],
    {
      disco: "EKEDC",
      businessUnit: "OGUN AGBARA",
      feederName: "11kV-AJARA",
      band: "B",
    },
    "EKEDC sample: page-header artifact stripped, first record correct"
  );

  const withParens = result.records.find((r) => r.feederName.includes("ESTATE"));
  assertEqual(
    withParens,
    {
      disco: "EKEDC",
      businessUnit: "OGUN AGBARA",
      feederName: "11kV-ESTATE (AGBARA)",
      band: "A",
    },
    "EKEDC sample: feeder name with parenthetical and space parses correctly"
  );
}

run();
