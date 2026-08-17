/**
 * Escapes text for safe use as HTML text content or inside a quoted
 * attribute value. Shared by every page renderer in this package.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Serializes a value for safe embedding inside a
 * `<script type="application/json">` tag. Escapes "<" so the payload can
 * never be parsed as HTML markup (e.g. a "</script>" sequence inside the
 * embedded content breaking out of the tag).
 */
export function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * Formats an optional asset version as a `?v=` query string suffix, or an
 * empty string when no version is given. Appended to the client bundle's
 * script `src` so a returning browser doesn't keep serving a stale cached
 * bundle after a rebuild — the bundle itself keeps a fixed, unhashed
 * filename (see .vibe/decisions/007-static-site-build-orchestrator-design.md).
 */
export function versionQuery(assetVersion: string | undefined): string {
  return assetVersion ? `?v=${assetVersion}` : "";
}
