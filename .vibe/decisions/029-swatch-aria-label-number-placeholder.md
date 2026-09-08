---
date: 2026-09-08
status: accepted
---
# Play page swatch `aria-label` uses a `{number}` placeholder substituted via `data-color-index`

**Context:** The play page's color swatch buttons (`renderPuzzlePage.ts`, attached to by `hydratePlayPage.ts`) had no accessible name. They need a numbered label ("Color 2") that survives both the static bake and a later client-side locale switch through the existing generic `applyLocale()` / `data-i18n-aria` retranslation mechanism (`.vibe/decisions/023-generic-aria-label-retranslation-attribute.md`), which until now only did a plain key→string swap with no parameters.

**Decision:** Add a translation key whose value carries a literal `{number}` token (`"Color {number}"` / `"Couleur {number}"`). Both the static bake (`renderDefaultToolbar`) and `applyLocale()`'s `data-i18n-aria` loop compute the finished label the same way: translate the key, then, only when the element also carries `data-color-index`, replace `{number}` with that attribute's value plus one (1-based). `String.prototype.replace` is a no-op when the token is absent, so every other `data-i18n-aria` element (including the editor's own `data-color-index`-bearing swatch, whose label has no `{number}` token) is unaffected.

**Reason:** Keeps the project's one existing rule intact — a single generic call re-walks the page and retranslates every tagged element — instead of adding a page-specific retranslation path. Reusing the swatch's existing `data-color-index` attribute (already baked for the click handler) avoids introducing a second, parallel indexing scheme just for the label.

**Rejected alternatives:** A fully generic templating mechanism (arbitrary named placeholders resolved from arbitrary data attributes) — rejected as speculative for a single current use site. Building the finished label once at bake/hydration time with no retranslation support — rejected because it would leave the label stuck in whichever locale was active when the page first loaded, unlike every other translated string on the page.
