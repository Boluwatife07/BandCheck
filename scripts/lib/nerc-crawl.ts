/**
 * Finds this month's (or any month's) NERC monthly energy cap PDF link
 * for a given DisCo, by crawling nerc.gov.ng's resource archive rather
 * than guessing a URL — filenames aren't consistent across months (see
 * README), so guessing doesn't work.
 *
 * IMPORTANT — this file is unverified against the live site's actual
 * HTML. It was written against nerc.gov.ng's *rendered/markdown* content
 * (fetched during planning), not raw HTML source, because this dev
 * environment's network allowlist doesn't include nerc.gov.ng — only the
 * page's text content could be confirmed, not its markup. The category
 * archive itself is real and confirmed to exist and list the right
 * documents:
 *
 *   https://nerc.gov.ng/resource-category/monthly-energy-caps/
 *   https://nerc.gov.ng/resource-category/monthly-energy-caps/page/2/  (etc.)
 *
 * The link-extraction regex below is deliberately generic (any <a> tag
 * whose href ends in .pdf) rather than guessing specific CSS
 * classes/selectors I haven't actually seen, so it should survive small
 * markup differences — but run this for real against the live site and
 * sanity-check `findFeederPdfLinks()`'s output before trusting it in the
 * scheduled job.
 */

export interface DiscoveredPdf {
  url: string;
  /** Best-effort title guess pulled from link text/context, for logging. */
  title: string;
}

const PDF_LINK_RE =
  /<a\s+[^>]*href=(?:"([^"]+\.pdf)"|'([^']+\.pdf)')[^>]*>([\s\S]*?)<\/a>/gi;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Extracts every PDF link from a fetched HTML page, with its link text
 * as a rough title. Caller filters by DisCo/month.
 */
export function extractPdfLinks(html: string): DiscoveredPdf[] {
  const results: DiscoveredPdf[] = [];
  let match: RegExpExecArray | null;
  while ((match = PDF_LINK_RE.exec(html)) !== null) {
    const url = match[1] ?? match[2];
    results.push({ url, title: stripTags(match[3]) });
  }
  return results;
}

/**
 * Given the archive page's discovered links, find the ones that look
 * like they belong to a specific DisCo's monthly energy cap doc.
 * `discoAliases` should include every name variant seen in the wild —
 * e.g. Ikeja Electric shows up as "Ikeja Electric", "Ikeja Electricity
 * Distribution", and abbreviated "IE" across different months' filenames.
 */
export function filterByDisco(
  links: DiscoveredPdf[],
  discoAliases: string[]
): DiscoveredPdf[] {
  const aliasesLower = discoAliases.map((a) => a.toLowerCase());
  return links.filter((link) => {
    const haystack = `${link.title} ${link.url}`.toLowerCase();
    return aliasesLower.some((alias) => haystack.includes(alias));
  });
}

const DISCO_ALIASES: Record<string, string[]> = {
  "Ikeja Electric": ["ikeja", "ikejaelectric", "ie-", "ie_", "/ie "],
  EKEDC: ["ekedc", "ekedp", "eko electricity"],
};

export async function fetchArchivePage(pageUrl: string): Promise<string> {
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "BandChecker/1.0 (weekly data check)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${pageUrl}: ${res.status}`);
  }
  return res.text();
}

/**
 * Crawls the monthly-energy-caps archive (paginated) looking for a given
 * DisCo's PDFs, up to `maxPages` pages back. The archive is reverse-
 * chronological, so the current month's doc should appear on page 1 —
 * maxPages > 1 only matters for backfilling history or recovering from a
 * missed week.
 */
export async function findFeederPdfLinks(
  disco: "Ikeja Electric" | "EKEDC",
  maxPages = 2
): Promise<DiscoveredPdf[]> {
  const aliases = DISCO_ALIASES[disco];
  const found: DiscoveredPdf[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url =
      page === 1
        ? "https://nerc.gov.ng/resource-category/monthly-energy-caps/"
        : `https://nerc.gov.ng/resource-category/monthly-energy-caps/page/${page}/`;

    const html = await fetchArchivePage(url);
    const links = extractPdfLinks(html);
    found.push(...filterByDisco(links, aliases));
  }

  return found;
}
