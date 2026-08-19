---
status: todo
---
# Web-Based Puzzle Editor

## Description
Adding a puzzle today means hand-writing the `Puzzle` JSON shape (`packages/shared/src/puzzle.ts`) from scratch, or exporting from the sibling `remarkable-nonogram-generator` project, which requires owning a reMarkable tablet. Add a new page, following the project's existing static-render-plus-client-hydration pattern, where a contributor can set the grid size, build a color palette, click-paint the solution, name the puzzle, and export a ready-to-submit JSON file matching the `Puzzle` format exactly.

## Acceptance Criteria
- [ ] A new `renderEditorPage.ts` in `packages/site` (following the pattern of `renderPuzzlePage.ts`/`renderLibraryPage.ts`) renders a static editor page shell, wired into `build.ts`, and reachable via a link from the library page (or its footer, see [[026-language-switcher-and-contribution-footer]]).
- [ ] A new `hydrateEditorPage.ts` in `packages/client`, dispatched from `main.ts` like the other hydrate modules, provides: width/height controls that resize the grid, a palette editor (add/remove/edit hex colors, pick the active color), click-paint of cells with the active color or eraser (plain click/tap must work — drag-painting is a nice-to-have, not required), and name + filename/id fields.
- [ ] The tool validates state via `createPuzzle` (`@kindle-nonograms/shared`) and surfaces its thrown error message inline, so an invalid puzzle (empty name, etc.) is caught before export rather than producing a broken file.
- [ ] An "Export" action builds the `Puzzle` JSON — with `id` taken from the filename field, per [[001-puzzle-id-from-filename]] — and triggers a browser download of `<id>.json`, ready to be placed at `data/puzzles/<id>.json`.
- [ ] Grid, palette swatches, and inputs stay usable with plain click/tap only, and follow the project's static, no-animation styling (`sharedStyles.ts`).
- [ ] Tests: pure grid/palette/export logic covered in `hydrateEditorPage.test.ts`, page rendering covered in `renderEditorPage.test.ts`, following the existing test patterns in the same directories.

## Notes
Reuse `contrastingTextColor` (`packages/client/src/contrastColor.ts`) for swatch/cell contrast, and the fill/cross `PlayState` interaction model from `hydratePlayPage.ts` as a reference for click-painting. This tool runs in a contributor's normal desktop browser, not on a Kindle — the `es2015` build constraint remains about the deployed play/library experience, not this authoring tool, though there's no reason to reach for anything exotic either. Pairs with [[022-contributing-guide-for-puzzle-submissions]] (its `CONTRIBUTING.md` should link here as the recommended way to create a puzzle once this exists) and [[026-language-switcher-and-contribution-footer]] (footer link target). No server involved: the exported file still has to be committed and opened as a PR by the contributor, matching the project's git-committed-JSON, no-runtime-server model (see `.vibe/backlog/done/005-remove-express-server-package.md`).
