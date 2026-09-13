"use client";

import { useState, useMemo } from "react";
import { BAND_REFERENCE, BandLetter } from "@/lib/bands";
import { listDiscos, getDatasetMeta } from "@/lib/search";
import type { SearchResult } from "@/lib/search";

const BAND_ORDER: BandLetter[] = ["A", "B", "C", "D", "E"];

function BandChip({ band }: { band: BandLetter }) {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm font-[family-name:var(--font-data)] text-sm font-medium text-white"
      style={{ backgroundColor: `var(--band-${band.toLowerCase()})` }}
    >
      {band}
    </span>
  );
}

export default function Home() {
  const discos = useMemo(() => listDiscos(), []);
  const meta = useMemo(() => getDatasetMeta(), []);

  const [disco, setDisco] = useState(discos[0] ?? "Ikeja Electric");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&disco=${encodeURIComponent(disco)}`
      );
      const data = await res.json();
      setResults(data.results);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-14">
      <header className="mb-10 border-b border-hairline pb-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-ink">
          Band Checker
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink/70">
          Find the official NERC supply band for a feeder, and see what hours
          and tariff it&apos;s supposed to guarantee — so you can check that
          against what you&apos;re actually billed.
        </p>
      </header>

      <section aria-label="Search">
        <div className="mb-4 flex gap-2">
          {["Ikeja Electric", "EKEDC"].map((d) => {
            const available = discos.includes(d);
            const active = disco === d;
            return (
              <button
                key={d}
                type="button"
                disabled={!available}
                onClick={() => {
                  setDisco(d);
                  setResults(null);
                }}
                className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-hairline text-ink/70 hover:border-ink/40"
                } ${!available ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {d}
                {!available && " — coming soon"}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your feeder name or area, e.g. Ogba, Opebi, Iju Road"
            className="flex-1 rounded-sm border border-hairline bg-white px-3 py-2 text-[15px] text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Check band"}
          </button>
        </form>
      </section>

      <section aria-label="Results" className="mt-8">
        {results === null && (
          <p className="text-sm text-ink/50">
            Results will show the closest official feeder match — confirm the
            feeder name matches your bill before trusting the result.
          </p>
        )}

        {results !== null && results.length === 0 && (
          <p className="text-sm text-ink/70">
            No feeder matched &quot;{query}&quot; in {disco}&apos;s published
            list. Try a shorter piece of the name, or check your latest bill
            for the exact feeder name and search that instead.
          </p>
        )}

        {results !== null && results.length > 0 && (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {results.map((r, i) => {
              const info = BAND_REFERENCE[r.band];
              return (
                <li key={i} className="flex items-center gap-4 py-3">
                  <BandChip band={r.band} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--font-data)] text-sm text-ink">
                      {r.feederName}
                    </p>
                    <p className="text-xs text-ink/50">
                      {r.businessUnit} business unit
                      {r.matchScore < 0.99 && " · closest match, confirm on your bill"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-ink">{info.hoursRange}</p>
                    <p className="text-ink/50">{info.tariffRange}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Band reference" className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
          What each band means
        </h2>
        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            {BAND_ORDER.map((b) => {
              const info = BAND_REFERENCE[b];
              return (
                <tr key={b} className="border-b border-hairline last:border-0">
                  <td className="py-2.5 pr-3">
                    <BandChip band={b} />
                  </td>
                  <td className="py-2.5 pr-3 text-ink">{info.hoursRange}</td>
                  <td className="py-2.5 text-ink/60">{info.tariffRange}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <footer className="mt-14 border-t border-hairline pt-6 text-xs leading-relaxed text-ink/50">
        <p className="mb-1">{meta.note.startsWith("SAMPLE DATA") ? meta.note.split(".")[0] + "." : meta.note}</p>
        {meta.sources.map((s) => (
          <p key={s.disco}>
            {s.disco}: NERC data for {s.sourceMonth}
            {s.lastIngested && ` — last checked ${new Date(s.lastIngested).toLocaleDateString()}`}
          </p>
        ))}
        <p className="mt-1">
          Tariff figures are approximate; the exact rate on your bill can vary slightly by DisCo.
        </p>
      </footer>
    </main>
  );
}
