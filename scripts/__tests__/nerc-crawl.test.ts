import { extractPdfLinks, filterByDisco } from "../lib/nerc-crawl";

// Representative of what WordPress resource-archive markup typically
// looks like — real attribute soup, nested tags in link text, mixed
// quote styles. Not verified against nerc.gov.ng's actual source (see
// the warning comment in nerc-crawl.ts) but a reasonable stand-in to
// prove the regex doesn't fall over on realistic markup.
const SAMPLE_HTML = `
<div class="resource-item">
  <h3><a href="https://nerc.gov.ng/resource/ikeja-cap-sept-2026/">Ikeja Electric Distribution Plc. Monthly Energy Cap, September 2026</a></h3>
  <a class="btn btn-view" target="_blank" href="https://nerc.gov.ng/wp-content/uploads/2026/09/Ikeja-Electric-Sept-2026.pdf">View</a>
  <a class="btn btn-download" href="https://nerc.gov.ng/wp-content/uploads/2026/09/Ikeja-Electric-Sept-2026.pdf">Download</a>
</div>
<div class="resource-item">
  <h3><a href="https://nerc.gov.ng/resource/ekedc-cap-sept-2026/">Eko Electricity Distribution Plc. Monthly Energy Cap, September 2026</a></h3>
  <a href='https://nerc.gov.ng/wp-content/uploads/2026/09/EKEDC-Sept-2026.pdf'>View <span class="icon"></span></a>
</div>
<div class="resource-item">
  <h3><a href="https://nerc.gov.ng/resource/kano-cap-sept-2026/">Kano Electricity Distribution Plc. Monthly Energy Cap, September 2026</a></h3>
  <a href="https://nerc.gov.ng/wp-content/uploads/2026/09/Kano-Sept-2026.pdf">Download</a>
</div>
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
  const links = extractPdfLinks(SAMPLE_HTML);
  assertEqual(links.length, 4, "finds all 4 pdf links (Ikeja x2, EKEDC, Kano)");

  const ikeja = filterByDisco(links, ["ikeja"]);
  assertEqual(ikeja.length, 2, "filters to Ikeja's 2 links (view + download of same doc)");
  assertEqual(
    new Set(ikeja.map((l) => l.url)).size,
    1,
    "both Ikeja links point at the same PDF (caller should dedupe by url)"
  );

  const ekedc = filterByDisco(links, ["ekedc", "ekedp"]);
  assertEqual(ekedc.length, 1, "filters to EKEDC's 1 link");

  const kano = filterByDisco(links, ["kano"]);
  assertEqual(kano.length, 1, "does not accidentally match Ikeja/EKEDC filters against Kano");
}

run();
