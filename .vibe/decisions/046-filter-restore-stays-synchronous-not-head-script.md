---
date: 2026-09-14
status: accepted
---
# Filter/sort/status restoration stays inside synchronous hydration, not a head-placed blocking script

**Context:** A UX review of backlog item 072 flagged that restoring a saved color/status/sort cookie mutates the DOM (hides rows, reorders them) only once hydration runs, after the static HTML — always baked to "nothing filtered" — has been parsed, and suggested mirroring `earlyLangScript.ts`'s blocking inline `<script>` in `<head>` to fix it before paint, the same way the player's locale is corrected before paint.

**Decision:** Filter/sort/status restoration stays exactly where it already is: inside `hydrateLibraryPage.ts`'s single synchronous `hydrate()` call, applied as early in that call as the status filter's own data dependency allows — not moved to a head-placed blocking script.

**Reason:** `earlyLangScript.ts`'s technique only works for `document.documentElement.lang` because that attribute exists the instant the parser opens `<html>`, before any `<body>` content exists — a script placed in `<head>` runs before the puzzle `<li>` rows it would need to hide/reorder are even in the DOM, so the same technique cannot apply here. The mechanism that actually already covers "client-only-knowable state must not visibly pop in" for this page is the one solved badges and thumbnails already use (`.vibe/decisions/001-frozen-chrome-blocking-reconciliation.md`'s "frozen chrome" pattern, in `.ux/`): correct it synchronously, with no `await`/yield, inside the same hydration pass the browser runs before its first paint of the newly-parsed page. Filter restoration already follows this exact pattern. The residual risk isn't the *mechanism*, it's *how much synchronous work runs before it* — addressed by restoring filters as early as possible in `hydrate()`, not by relocating it somewhere structurally impossible.

**Rejected alternatives:** A `<head>`-placed blocking inline script mirroring `earlyLangScript.ts` was considered and rejected — infeasible, since the elements it would need to manipulate don't exist yet at that point in parsing. Baking a per-visitor initial state server-side was also considered and rejected — this is a static site with no per-request render, so no visitor cookie is ever knowable at build time.
