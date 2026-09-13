import { deriveSourceMonth } from "../lib/derive-source-month";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    console.error(`FAIL: ${label}\n  expected: ${expected}\n  actual:   ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label}`);
  }
}

function run() {
  assertEqual(
    deriveSourceMonth("https://nerc.gov.ng/wp-content/uploads/2026/09/IE-Monthly-Energy-Cap-September-2026.pdf"),
    "2026-09",
    "real Sept 2026 Ikeja Electric filename"
  );
  assertEqual(
    deriveSourceMonth("https://nerc.gov.ng/wp-content/uploads/2026/09/EKEDP-Monthly-Energy-Cap-September-2026.pdf"),
    "2026-09",
    "real Sept 2026 EKEDC filename"
  );
  assertEqual(
    deriveSourceMonth("https://nerc.gov.ng/wp-content/uploads/2024/02/IkejaElectricityDistributionPlcMonthlyEnergyCapJanuary2024.pdf"),
    "2024-01",
    "real Jan 2024 filename with no separators"
  );
  assertEqual(
    deriveSourceMonth("no month info here at all", new Date("2026-09-13T00:00:00Z")),
    "2026-09",
    "falls back to the given 'now' date when nothing matches"
  );
}

run();
