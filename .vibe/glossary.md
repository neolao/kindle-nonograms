# Ubiquitous Language

## Puzzle
A nonogram board: its id, name, dimensions, color palette, and solution grid (which cell holds which palette color, if any). It is the unit of content the player solves. Clues are never stored on it — they are always derived on demand from the solution grid.
**Do not confuse with:** PuzzleProgress, which is the player's mutable play state (cell-by-cell), not the puzzle definition.
_Sources: `packages/shared/src/puzzle.ts`_

## Cell
A single position on a puzzle's solution grid or on a player's progress grid. In the solution, its value is a palette color index or empty (`null`). In the player's progress, its play state is one of three: filled with a color, deliberately excluded ("marked"), or untouched (`null`).
**Do not confuse with:** PuzzleProgress, the grid of cell play states as a whole.
_Sources: `packages/shared/src/puzzle.ts`, `packages/shared/src/progress.ts`_

## PuzzleProgress
A player's progress on one puzzle: one play mark per cell, matching the puzzle's solution grid in shape. A puzzle is solved when every solution-filled cell was marked with its exact color and no solution-empty cell was incorrectly filled; marks never affect this result either way.
**Do not confuse with:** Puzzle, the immutable definition the progress is checked against.
_Sources: `packages/shared/src/progress.ts`_

## Clue
The sequence of runs attached to a row or column of a puzzle, each run carrying both a length and the palette color it must be filled with. A run always breaks on a color change, even without an empty cell between the two colors; two runs of the same color still require an empty gap to count as separate. Clues are never stored — they are always derived on demand from a puzzle's solution grid.
**Do not confuse with:** Puzzle, which owns the solution grid clues are derived from.
_Sources: `packages/shared/src/clues.ts`, `packages/client/src/main.ts`_

## Library page
The site's home page: a list of every puzzle a player can choose from, each linking to its own page, with an empty-state message when there are none, and a badge revealing which ones the player already solved. Its visible markup shows only enough of each puzzle to list and link to it (name, size); each puzzle's full data, including its solution, is also embedded in the page for client-side hydration to check saved progress against.
**Do not confuse with:** Puzzle, the single item each library entry links to.
_Sources: `packages/site/src/renderLibraryPage.ts`, `packages/client/src/hydrateLibraryPage.ts`_

## Locale
A supported display language for the app's UI text — currently English or French, with English as the default. Every UI string is looked up by a stable key against a locale, so the same interface can render in either language without duplicating markup.
**Do not confuse with:** TranslationKey, the identifier used to look a string up; Locale is the language it is looked up *in*.
_Sources: `packages/shared/src/i18n.ts`, `packages/client/src/i18n.ts`_

## Solvability (fairness check)
Whether a puzzle's solution can be fully worked out from its row/column clues by logical deduction alone, with no cell requiring a guess. Checked by repeatedly deriving each row's and column's forced cells from its clue until nothing new is forced; a puzzle is fair only if every cell ends up determined this way and matches its stored solution. A submitted puzzle failing this check is rejected the same way a structurally invalid one is.
**Do not confuse with:** Clue, the per-row/per-column data this check reasons over; Puzzle, the content being checked.
_Sources: `packages/shared/src/solvability.ts`_

## Puzzle editor
A contributor-facing page, distinct from the library and play pages, where a puzzle is authored rather than played: set a grid size, build a color palette, paint the solution cell by cell, name the puzzle, and export it as a ready-to-submit `Puzzle` JSON file. Runs entirely client-side in a normal desktop browser (not on Kindle) — there is no server to hand the exported file to, so the contributor still commits it manually.
**Do not confuse with:** Library page, which lists already-authored puzzles to play, not create.
_Sources: `packages/site/src/renderEditorPage.ts`, `packages/client/src/hydrateEditorPage.ts`_

## Boolean grid export
The plain puzzle format produced by the sibling `remarkable-nonogram-generator` project: dimensions plus a boolean solution grid, with no palette and no id. It is converted into this project's Puzzle before use, with `true` cells becoming the single palette color and `false` cells becoming empty.
**Do not confuse with:** Puzzle, the format it is converted into.
_Sources: `packages/shared/src/adapters.ts`_
