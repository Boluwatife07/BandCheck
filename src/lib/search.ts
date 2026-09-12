import feedersData from "@/data/feeders.json";
import { FeedersDataset, FeederRecord } from "./bands";

const dataset = feedersData as FeedersDataset;

export interface SearchResult extends FeederRecord {
  matchScore: number; // 0-1, 1 = exact feeder name match
}

/**
 * Naive substring/word-overlap matcher against official feeder names.
 *
 * This is deliberately NOT a "GPS-to-band" lookup — feeder names rarely
 * match how people describe where they live (see PRD §5, known accuracy
 * gap). We surface the matched feeder name in the UI so the user can
 * confirm it's really their area before trusting the result.
 */
export function searchFeeders(query: string, disco?: string): SearchResult[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const queryWords = q.split(/\s+/).filter(Boolean);

  const candidates = disco
    ? dataset.records.filter((r) => r.disco === disco)
    : dataset.records;

  const results: SearchResult[] = candidates
    .map((r) => {
      const name = r.feederName.toUpperCase();
      let score = 0;

      if (name === q) {
        score = 1;
      } else if (name.includes(q)) {
        score = 0.8;
      } else {
        const matchedWords = queryWords.filter((w) => name.includes(w));
        score = matchedWords.length / queryWords.length;
      }

      return { ...r, matchScore: score };
    })
    .filter((r) => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  return results.slice(0, 10);
}

export function listDiscos(): string[] {
  return Array.from(new Set(dataset.records.map((r) => r.disco)));
}

export function getDatasetMeta() {
  return dataset.meta;
}
