const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04",
  may: "05", june: "06", july: "07", august: "08",
  september: "09", october: "10", november: "11", december: "12",
};

const MONTH_YEAR_RE = new RegExp(
  `(${Object.keys(MONTHS).join("|")})[-_ ]?(\\d{4})`,
  "i"
);

/**
 * Best-effort "YYYY-MM" extraction from a PDF URL or title, e.g.
 * ".../Ikeja-Electric-Sept-2026.pdf" style names vary too much to
 * guarantee a match — falls back to the date this function is called
 * (i.e. when we actually fetched it) if nothing is found. That fallback
 * is honest: it's not the PDF's declared month, but it does tell you
 * accurately when this record was last refreshed.
 */
export function deriveSourceMonth(text: string, now: Date = new Date()): string {
  const match = MONTH_YEAR_RE.exec(text);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    const year = match[2];
    if (month && year) return `${year}-${month}`;
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
