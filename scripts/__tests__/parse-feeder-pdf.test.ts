import { parseFeederPdfText } from "../lib/parse-feeder-pdf";

// Real text as extracted from NERC's Jan 2024 Ikeja Electric PDF
// (nerc.gov.ng/wp-content/uploads/2024/02/IkejaElectricityDistributionPlcMonthlyEnergyCapJanuary2024.pdf).
// This sample deliberately includes a wrapped row ("ABEOKUTA \nEXPRESS")
// to prove the buffering logic works on the real messy case, not just
// the clean single-line case.
const SAMPLE_JAN_2024 = `
Ikeja Electricity Distribution Plc - Monthly Energy Cap (January 2024); Energy 
Consumed in December 2023 
Order No/NERC/307/2022 on the Methodology for the Determination of Monthly  
Energy Caps of Unmetered Customers of Successor Distribution Licensees in the 
Nigerian Electricity Supply Industry 
Business Unit Feeder Name Non- MD 
Service 
Band 
Cap 
(kWh) 
ABULE-EGBA BU 11-ABULE IROKOINJ-T1-ABULE IROKO D 207 
ABULE-EGBA BU 11-ABULE IROKOINJ-T1-ALAKUKO D 289 
ABULE-EGBA BU 11-AGEGEINJ-T1-IJU ROAD C 485 
ABULE-EGBA BU 11-BOLORUNPELUINJ-T3-GOVERNOR B 506 
ABULE-EGBA BU 11-IJAIYE OJOKOROINJ-T1-ABEOKUTA 
EXPRESS 
C 259 
IKEJA BU 11-OJODUINJ-T2-EXPRESS A - 
Bilateral 
918 
IKEJA BU 11-PTCINJ-T1-OPEBI A 929 
`;

// Real text as extracted from NERC's October 2025 Ikeja Electric PDF,
// which added a STATE column ahead of the business unit.
const SAMPLE_OCT_2025 = `
STATE BUSINESS UNIT FEEDER NAME NON-MD 
SERVICE 
BAND 
CAP 
(kWh) 
OGUN ABULE-EGBA BU 33-OtaTCN-AMJE A 794 
OGUN ABULE-EGBA BU 33-Oke-AroTCN-AKUTE B 360 
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
  const result = parseFeederPdfText(SAMPLE_JAN_2024, "Ikeja Electric");

  assertEqual(result.records.length, 7, "Jan 2024 sample: parses 7 records");

  assertEqual(
    result.records[0],
    {
      disco: "Ikeja Electric",
      businessUnit: "ABULE-EGBA",
      feederName: "11-ABULE IROKOINJ-T1-ABULE IROKO",
      band: "D",
    },
    "Jan 2024 sample: first record correct"
  );

  const wrapped = result.records.find((r) =>
    r.feederName.includes("ABEOKUTA")
  );
  assertEqual(
    wrapped,
    {
      disco: "Ikeja Electric",
      businessUnit: "ABULE-EGBA",
      feederName: "11-IJAIYE OJOKOROINJ-T1-ABEOKUTA EXPRESS",
      band: "C",
    },
    "Jan 2024 sample: line-wrapped feeder name reassembled correctly"
  );

  const bilateral = result.records.find((r) => r.feederName.includes("EXPRESS") && r.businessUnit === "IKEJA");
  assertEqual(
    bilateral?.band,
    "A",
    "Jan 2024 sample: '- Bilateral' cap line still resolves to correct band"
  );

  assertEqual(
    result.unparsedLines.length,
    0,
    "Jan 2024 sample: no unparsed lines"
  );

  const octResult = parseFeederPdfText(SAMPLE_OCT_2025, "Ikeja Electric");
  assertEqual(
    octResult.records[0],
    {
      disco: "Ikeja Electric",
      businessUnit: "OGUN ABULE-EGBA",
      feederName: "33-OtaTCN-AMJE",
      band: "A",
    },
    "Oct 2025 sample (STATE column): parses without crashing, state stays attached to businessUnit as documented"
  );
}

run();
