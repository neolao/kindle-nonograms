---
id: 001
date: 2026-09-04
status: accepted
flow: 001
---

# Freeze every page's default chrome into static HTML; reconcile client-only state with a blocking pre-paint check, not a visible loading state

**Context:** Audit finding F1 (`.ux/audit/2026-09-04.md`) found that the library's filters/pagination, the puzzle page's toolbar/swatches/win banner, and the editor's whole palette/canvas/toolbar are all built from scratch by client-side JS after the static page has already painted, causing a visible pop-in on every load — against the project's own "e-ink, slow refresh, no animations" constraint. This reopens `.vibe/decisions/005-play-page-hydration-builds-its-own-controls.md`, which accepted building the puzzle page's toolbar via JS specifically to avoid "a controls-less flash," but which — per this design's analysis — does not achieve that goal in practice: the static grid paints alone first, and the JS-inserted toolbar then pushes it down, the same runtime-injection flash `.vibe/decisions/004-library-page-reserves-solved-badge-node.md` identified and avoided for the solved badge.

**Options considered:**
- **A — Frozen default chrome, corrected by a blocking pre-paint check, no loading-state UI.** Every page's HTML already contains its final default markup (mirroring decision 004's badge pattern); a synchronous check at the very start of hydration corrects the handful of controls whose true state is only known client-side (win banner, solved badges) before the page is perceived as painted. Accepts a negligible window where a control looks tappable but isn't yet wired.
- **B — Same as A, plus a visual "not yet interactive" state** (dimmed/disabled look) on every control until hydration attaches its listeners, removing the dead-tap window at the cost of a second, deliberate visual transition (dimmed → active) on every page load.
- **C — Frozen default chrome, but reconciliation runs inside the normal (non-blocking) hydration flow** instead of a separate blocking pre-paint step — simpler to build, but reintroduces a brief risk of a visible "unsolved → solved" flash on already-solved puzzles, the exact failure mode decision 004 was written to avoid.

**Decision:** Option A.

**Reason:** The Player's primary device is explicitly an e-ink screen with slow refresh and a stated "no animations" constraint (`product.md`, `CLAUDE.md`) — any *visible* state transition after first paint (Option B's dimmed→active flip, Option C's occasional wrong→right flash) works directly against that constraint, while Option A's dead-tap window is invisible (nothing changes on screen) and, given the hydration bundle's small size (`es2015`, no framework), expected to be imperceptibly short in practice. Option A also directly extends the one pattern this codebase has already deliberately chosen and documented (decision 004's "real node + `hidden`, corrected before the user perceives it"), rather than introducing a new one (B) or quietly regressing the one page that already got this right (C, for the badge/banner specifically).

**Consequences:**
- `.vibe/decisions/005-play-page-hydration-builds-its-own-controls.md` is superseded for the toolbar/banner construction question (its glyph-vs-border player-mark reasoning, point 2, is unaffected and stands) — the implementer should mark it `status: superseded by .ux/decisions/001` when this flow is implemented.
- Six file pairs (`render*.ts` / `hydrate*.ts` for library, play, editor) now share a markup contract instead of just one (library's badge) — the drift risk this creates must be closed by testing each `hydrate*.test.ts` fixture against the real `render*.ts` output (not hand-retyped HTML strings) as part of implementation, per the UI/UX expert consultation for this flow.
- A no-JavaScript visitor now sees a fully-formed but entirely inert page on every screen, instead of today's visibly-incomplete one — an accepted regression in *signal* (it no longer looks broken, it just doesn't respond), not in capability, since the game requires JavaScript regardless.
- Any future change to what a page's "default" means (e.g. the editor remembering the last-used grid size) can no longer be a client-only change — it must update both `render*.ts` and `hydrate*.ts` by construction.
