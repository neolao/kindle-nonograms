---
status: todo
---
# Remove Editor Paint Mode Button

## Description
The editor's Canvas panel has a separate "Paint" mode toggle button next to "Erase" (`editor.modePaint` / `editor.modeErase` in `hydrateEditorPage.ts`). Tapping a palette color swatch already expresses the intent to paint with that color, so the dedicated "Paint" button is redundant — it should be removed, with color selection itself switching the canvas back into paint mode.

## Acceptance Criteria
- [ ] The editor no longer renders a "Paint" mode button (`data-role="mode-paint"` removed from markup and hydration).
- [ ] Tapping any palette color swatch selects that color and puts the canvas in paint mode, so the next cell tap paints with it.
- [ ] The "Erase" mode button still exists and still switches the canvas to erase mode.
- [ ] After erasing, tapping a palette color swatch switches back to paint mode with that color, without needing any other control.

## Notes
Affects `packages/site/src/renderEditorPage.ts` and `packages/client/src/hydrateEditorPage.ts`. Remove the now-unused `editor.modePaint` translation key from `packages/shared/src/i18n.ts` once no longer referenced. Related to the mode-dependent behavior described in `.ux/screens/editor.md` and backlog item 058 (keyboard operability of the canvas), which also references "current mode" — worth a quick check once that item is implemented.
