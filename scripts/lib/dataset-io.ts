import fs from "node:fs/promises";
import path from "node:path";
import { FeedersDataset } from "@/lib/bands";
import { FeederDiff } from "./diff-feeders";

const DATA_PATH = path.join(process.cwd(), "src/data/feeders.json");
const FLAGGED_PATH = path.join(process.cwd(), "scripts/flagged.json");

export async function loadDataset(): Promise<FeedersDataset> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw) as FeedersDataset;
}

export async function saveDataset(dataset: FeedersDataset): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(dataset, null, 2) + "\n", "utf-8");
}

export interface FlaggedReport {
  generatedAt: string;
  /** Lines parseFeederPdfText couldn't confidently turn into a record. */
  unparsedLines: Array<{ disco: string; line: string }>;
  /** Diffs diffFeeders decided need a human look before publishing. */
  diffs: FeederDiff[];
}

export async function saveFlagged(report: FlaggedReport): Promise<void> {
  await fs.writeFile(FLAGGED_PATH, JSON.stringify(report, null, 2) + "\n", "utf-8");
}
