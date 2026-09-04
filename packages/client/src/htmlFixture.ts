/**
 * Extracts the `<body>` element's inner markup from a full HTML document
 * string, for tests that build their `document.body.innerHTML` fixture from
 * a real `render*Page()` call (`@kindle-nonograms/site`) instead of a
 * hand-retyped copy of its markup — the latter can silently drift out of
 * sync with the actual generated page (see
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`).
 */
export function extractBodyHtml(fullPageHtml: string): string {
  const match = /<body[^>]*>([\s\S]*)<\/body>/i.exec(fullPageHtml);
  if (!match) {
    throw new Error("extractBodyHtml: no <body> tag found in the given HTML");
  }

  return match[1];
}
