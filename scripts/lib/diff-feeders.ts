import { BandLetter, FeederRecord } from "@/lib/bands";

export type DiffType = "added" | "removed" | "band-changed";

export interface FeederDiff {
  type: DiffType;
  disco: string;
  businessUnit: string;
  feederName: string;
  oldBand?: BandLetter;
  newBand?: BandLetter;
}

export interface DiffResult {
  /** Safe to write straight to feeders.json without a human looking first. */
  clean: FeederDiff[];
  /** Needs the weekly manual review (PRD §7) before it's trusted. */
  flagged: FeederDiff[];
  unchangedCount: number;
}

function feederKey(r: { businessUnit: string; feederName: string }): string {
  return `${r.businessUnit}|||${r.feederName}`.toLowerCase();
}

/**
 * A new-feeder name is "sane" enough to auto-publish without review.
 * Deliberately loose — this exists to catch obvious parser garbage
 * (e.g. a stray number or a fragment that slipped past parseFeederPdfText),
 * not to second-guess real feeder names we've just never seen before.
 */
function looksSane(r: { businessUnit: string; feederName: string }): boolean {
  if (r.businessUnit.trim().length < 2) return false;
  if (r.feederName.trim().length < 2) return false;
  if (/^\d+$/.test(r.feederName.trim())) return false;
  return true;
}

/**
 * Compares this run's freshly parsed records against what's currently
 * published for one DisCo.
 *
 * Deliberate policy choices (change here if the review-time tradeoff
 * should shift):
 * - Band changes on a feeder we already know about are auto-published.
 *   Bands changing month to month is the normal, expected case NERC's
 *   data exists to capture — flagging every one would make the weekly
 *   review meaningless.
 * - A brand-new feeder is auto-published UNLESS its name looks like
 *   parser garbage (looksSane), in which case it's flagged instead.
 * - A feeder that's disappeared from this month's list is ALWAYS
 *   flagged and never auto-removed. Silently dropping a feeder because
 *   it didn't appear in one month's parse is a bigger risk than
 *   briefly showing stale data — a human should confirm it's really
 *   gone (or that this was a parse gap) before it's deleted.
 * - If the new record count for this DisCo is less than half the old
 *   count, something upstream almost certainly broke (a parsing
 *   regression, a truncated PDF, a crawler picking up the wrong file).
 *   In that case everything is flagged and nothing is auto-published,
 *   regardless of how individual diffs looked.
 */
export function diffFeeders(
  oldRecords: FeederRecord[],
  newRecords: FeederRecord[],
  disco: string
): DiffResult {
  const oldMap = new Map(oldRecords.map((r) => [feederKey(r), r]));
  const newMap = new Map(newRecords.map((r) => [feederKey(r), r]));

  const clean: FeederDiff[] = [];
  const flagged: FeederDiff[] = [];
  let unchangedCount = 0;

  for (const [key, newRec] of newMap) {
    const oldRec = oldMap.get(key);
    if (!oldRec) {
      const diff: FeederDiff = {
        type: "added",
        disco,
        businessUnit: newRec.businessUnit,
        feederName: newRec.feederName,
        newBand: newRec.band,
      };
      (looksSane(newRec) ? clean : flagged).push(diff);
    } else if (oldRec.band !== newRec.band) {
      clean.push({
        type: "band-changed",
        disco,
        businessUnit: newRec.businessUnit,
        feederName: newRec.feederName,
        oldBand: oldRec.band,
        newBand: newRec.band,
      });
    } else {
      unchangedCount++;
    }
  }

  for (const [key, oldRec] of oldMap) {
    if (!newMap.has(key)) {
      flagged.push({
        type: "removed",
        disco,
        businessUnit: oldRec.businessUnit,
        feederName: oldRec.feederName,
        oldBand: oldRec.band,
      });
    }
  }

  if (oldRecords.length > 0 && newRecords.length < oldRecords.length * 0.5) {
    return { clean: [], flagged: [...clean, ...flagged], unchangedCount };
  }

  return { clean, flagged, unchangedCount };
}

/**
 * Applies only the `clean` diffs on top of the currently published
 * records for one DisCo. Flagged diffs (including removals) are never
 * applied here — the old record stays as-is until a human confirms the
 * change, per the policy above.
 */
export function applyCleanDiffs(
  oldRecords: FeederRecord[],
  clean: FeederDiff[]
): FeederRecord[] {
  const byKey = new Map(oldRecords.map((r) => [feederKey(r), r]));

  for (const diff of clean) {
    const key = feederKey(diff);
    if (diff.type === "band-changed" && diff.newBand) {
      const existing = byKey.get(key);
      if (existing) byKey.set(key, { ...existing, band: diff.newBand });
    } else if (diff.type === "added" && diff.newBand) {
      byKey.set(key, {
        disco: diff.disco,
        businessUnit: diff.businessUnit,
        feederName: diff.feederName,
        band: diff.newBand,
      });
    }
  }

  return Array.from(byKey.values());
}
