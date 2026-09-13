import { diffFeeders, applyCleanDiffs } from "../lib/diff-feeders";
import { FeederRecord } from "../../src/lib/bands";

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

function rec(businessUnit: string, feederName: string, band: FeederRecord["band"]): FeederRecord {
  return { disco: "Ikeja Electric", businessUnit, feederName, band };
}

function run() {
  // --- Band change: auto-published ---
  {
    const old = [rec("IKEJA", "OPEBI", "B")];
    const fresh = [rec("IKEJA", "OPEBI", "A")];
    const diff = diffFeeders(old, fresh, "Ikeja Electric");
    assertEqual(diff.clean.length, 1, "band change: goes to clean");
    assertEqual(diff.flagged.length, 0, "band change: nothing flagged");
    assertEqual(diff.clean[0].type, "band-changed", "band change: correct diff type");

    const applied = applyCleanDiffs(old, diff.clean);
    assertEqual(applied, [rec("IKEJA", "OPEBI", "A")], "band change: applied dataset reflects new band");
  }

  // --- New sane feeder: auto-published ---
  {
    const old = [rec("IKEJA", "OPEBI", "B")];
    const fresh = [rec("IKEJA", "OPEBI", "B"), rec("IKEJA", "NEW ROAD", "C")];
    const diff = diffFeeders(old, fresh, "Ikeja Electric");
    assertEqual(diff.clean.length, 1, "new sane feeder: goes to clean");
    assertEqual(diff.unchangedCount, 1, "new sane feeder: existing untouched feeder counted as unchanged");
  }

  // --- New garbage-looking feeder: flagged, not published ---
  {
    const old = [rec("IKEJA", "OPEBI", "B")];
    const fresh = [rec("IKEJA", "OPEBI", "B"), rec("IK", "1", "C")];
    const diff = diffFeeders(old, fresh, "Ikeja Electric");
    assertEqual(diff.clean.length, 0, "garbage feeder: not in clean");
    assertEqual(diff.flagged.length, 1, "garbage feeder: goes to flagged");
  }

  // --- Removed feeder: always flagged, never auto-deleted ---
  {
    const old = [rec("IKEJA", "OPEBI", "B"), rec("IKEJA", "GONE", "C")];
    const fresh = [rec("IKEJA", "OPEBI", "B")];
    const diff = diffFeeders(old, fresh, "Ikeja Electric");
    assertEqual(diff.flagged.length, 1, "removed feeder: flagged");
    assertEqual(diff.flagged[0].type, "removed", "removed feeder: correct diff type");

    const applied = applyCleanDiffs(old, diff.clean);
    assertEqual(
      applied.some((r) => r.feederName === "GONE"),
      true,
      "removed feeder: old record still present after applying only clean diffs"
    );
  }

  // --- Mass drop-off (>50%): everything flagged, nothing published ---
  {
    const old = Array.from({ length: 10 }, (_, i) => rec("IKEJA", `F${i}`, "B"));
    const fresh = [rec("IKEJA", "F0", "A")]; // 1 of 10 — looks like a parse regression
    const diff = diffFeeders(old, fresh, "Ikeja Electric");
    assertEqual(diff.clean.length, 0, "mass drop-off: nothing auto-published");
    assertEqual(diff.flagged.length > 0, true, "mass drop-off: everything flagged instead");
  }
}

run();
