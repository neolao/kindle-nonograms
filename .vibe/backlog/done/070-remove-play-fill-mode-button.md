---
status: done
---
# Remove Play Fill Mode Button

## Description
The play page's toolbar has a separate "Fill" mode button (`play.modeFill` / `data-role="mode-fill"` in `hydratePlayPage.ts`) next to the color swatches and the "Cross" mode button. Tapping a palette color swatch already expresses the intent to fill with that color, so the dedicated "Fill" button is redundant — it should be removed, with color selection itself switching the grid back into fill mode. This mirrors backlog item 065, which removes the equivalent redundant "Paint" button from the editor.

## Acceptance Criteria
- [ ] The play page no longer renders a "Fill" mode button (`data-role="mode-fill"` removed from markup and hydration).
- [ ] Tapping any palette color swatch selects that color and puts the grid in fill mode, so the next cell tap fills it.
- [ ] The "Cross" mode button still exists and still switches the grid to cross (mark) mode.
- [ ] After switching to cross mode, tapping a palette color swatch switches back to fill mode with that color, without needing any other control.
- [ ] For single-color puzzles (no swatches rendered), a way to switch back to fill mode after using cross mode is preserved.

## Notes
Affects `packages/site/src/renderPuzzlePage.ts` and `packages/client/src/hydratePlayPage.ts` (`attachToolbar`). Remove the now-unused `play.modeFill` translation key from `packages/shared/src/i18n.ts` once no longer referenced. Update `.ux/screens/play.md`, which currently documents "Fill / Cross buttons" and `play.modeFill` in its toolbar/content/accessibility sections. The single-color case (no swatch buttons exist per `attachToolbar`) needs its own way back into fill mode — worth resolving before implementation, possibly by keeping a minimal fill affordance for that case only.
