---
status: done
---
# "Fill" Renders A Solid Square

## Description
In `packages/client/src/hydratePlayPage.ts`, `paintCell()` currently paints a colored text glyph (`cell.style.color`) instead of a solid fill. Switch to `cell.style.backgroundColor = palette[mark]`, keeping the shape glyph (`● ▲ ■ ◆`) on top with a text color computed for readability via a new pure module `packages/client/src/contrastColor.ts` (`contrastingTextColor(hex)`, based on relative luminance). This preserves the non-color cue for grayscale e-ink documented in `.vibe/decisions/003-clue-color-plus-pattern-cue.md`. Also update the color swatch buttons in `buildToolbar()` to preview the same rendering (solid background + contrasting text).

## Acceptance Criteria
- [ ] A "fill" cell has a `background-color` matching the palette color, not just colored text
- [ ] The shape glyph stays visible on top, in a color guaranteeing sufficient contrast
- [ ] A "cross" (`marked`) cell stays visually distinct (no solid background)
- [ ] `contrastingTextColor` is unit-tested (light background → black text, dark background → white text, mid-tone cases)
- [ ] Existing `hydratePlayPage.test.ts` assertions updated accordingly

## Notes
Independent from i18n — could be built in parallel with item 015, numbered after it only to keep a logical delivery order. See the approved plan at `/home/neolao/.claude/plans/ajoute-une-passe-graphique-twinkling-dijkstra.md`.
