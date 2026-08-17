---
status: todo
depends_on: [016, 017, 018]
---
# Visual Design Pass + No-Scroll Grid (Fit Available Width/Height)

## Description
Two parts. **Visual**: new modules `packages/site/src/theme.ts` (TS constants: colors, spacing scale, border widths, a conservative font stack such as `Helvetica Neue, Helvetica, Arial, sans-serif`) and `packages/site/src/sharedStyles.ts` (style fragment shared by both pages: base typography, language-switcher styling, button styling). No CSS custom properties (`var()`) — support on Kindle's old WebKit is uncertain, so stick to the repo's already-proven pattern of literal CSS strings generated in TS at build time (like the existing `.run-cN` classes). `renderPuzzlePage.ts` and `renderLibraryPage.ts` consume these tokens instead of hardcoded colors/sizes. **No-scroll**: replace `.grid-wrapper{overflow-x:auto}` with `overflow:hidden` (fails safe by clipping rather than exposing a scrollbar). Add `packages/client/src/fitGrid.ts`, a pure function `computeFitFontSizePx({naturalWidth, naturalHeight, availableWidth, availableHeight, baseFontSizePx, minScale, maxScale})` computing a single scale factor (min of both ratios, ~2% safety margin) — since the whole grid (cells, clues, text) is already `em`-sized, one `font-size` adjustment on the wrapper is enough to fit everything. Call it once at the end of `hydrate()` in `hydratePlayPage.ts` (after the switcher/toolbar/banner are inserted, so available space is measured accurately), plus a `resize` listener.

## Acceptance Criteria
- [ ] No horizontal or vertical scrollbar appears on the puzzle page, for any puzzle size within `minScale`/`maxScale` limits
- [ ] Grid and clues stay legible and proportioned after resizing (everything scales together via `font-size`)
- [ ] Colors, spacing and fonts are consistent between the library page and the puzzle page (shared tokens, no value drift/duplication)
- [ ] No CSS animations/transitions added (e-ink constraint)
- [ ] `computeFitFontSizePx` unit-tested (width-constrained, height-constrained, min-clamp, max-clamp, zero-size guard cases)
- [ ] Behavior manually verified on the target browser — jsdom has no real layout engine, so `scrollWidth`/`innerWidth` measurement is only smoke-testable in unit tests

## Notes
Visually depends on items 016/017/018 — the header must include the language switcher and check button before the available-space measurement makes sense. Broadest item, do last. See the approved plan at `/home/neolao/.claude/plans/ajoute-une-passe-graphique-twinkling-dijkstra.md`.
