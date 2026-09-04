# Product — Kindle Nonograms

> Written by `/ux:discover`. Edit freely — re-run `/ux:discover` to refresh.
> Add `<!-- keep -->` on a section heading to preserve it on refresh.

## What it is

Kindle Nonograms is a nonogram (picross) puzzle game meant to be played directly in the built-in browser of a Kindle e-reader. A static site lists a library of puzzles; each puzzle has its own page with a color-coded clue grid the player fills in by tapping cells, with progress saved locally. A separate in-browser editor lets a contributor build a new puzzle and export it for submission via a GitHub pull request.

## Platform & surface

- **Platform:** web — a statically generated site (`packages/site`) with a small client-side hydration bundle (`packages/client`, Vite, `es2015` target); no backend/server.
- **Devices & input:** primarily a Kindle e-reader's touchscreen, e-ink display (slow refresh, no animations/transitions). Desktop/mobile browsers with mouse and keyboard are a secondary, best-effort concern only — the UI is not judged against desktop/keyboard expectations.
- **Runs with:** `npm run build` then `npm run preview` (static site, no dev server needed for the built output); `npm run dev:client` for the client bundle in isolation.

## Users

| Role | Expertise | Frequency of use | Context of use | Main goal |
|---|---|---|---|---|
| Player | Casual, no special skill | Regular / near-daily (currently mainly the project's own author) | On a Kindle e-reader's touch browser, casual solo reading-adjacent sessions | Browse the puzzle library and solve a puzzle |
| Contributor | Comfortable with git/GitHub | Rare, occasional | On a regular desktop browser, when preparing a new puzzle to submit | Build a puzzle in the editor and export it as a file for a GitHub PR |

## Jobs to be done

1. When picking up their Kindle, the player wants to find a puzzle they haven't solved yet (or resume one in progress), so that they can play a quick, low-effort game.
2. While solving a puzzle, the player wants clear feedback on whether a cell/color choice is right, so that they can finish without guessing blindly.
3. When a contributor wants to add new content, they want to draw or import an image into a grid and export a valid puzzle file, so that they can open a PR without hand-writing JSON.

## Constraints

- **Brand / design system:** none imposed — an in-house "cabinet" visual system (see `packages/site/src/theme.ts`, `.vibe/decisions/013-three-accent-cabinet-reskin.md`).
- **Accessibility target:** none stated. Explicitly out of scope for this audit's prioritization: the puzzle grid has no keyboard support at all (see `.ux/inventory.md` → Known gaps).
- **Localization:** English and French, switchable, browser-language-detected by default and persisted via a cookie (`packages/client/src/i18n.ts`). Expected to apply consistently across every page, including the editor.
- **Performance / other:** must stay usable on an old WebKit e-ink browser — no animations/transitions, conservative JS (`es2015`), minimum 44px tap targets.

## Vocabulary

- **Puzzle** — a single nonogram: a solution grid plus a color palette; clues are always derived, never stored.
- **Clue** — the numbers shown per row/column, indicating run lengths (and colors, for multi-color puzzles).
- **Fill mode / Cross mode** — the two paint tools on the puzzle page: fill a cell with the active color, or mark it as "known empty".
- **Check** — the action that validates the current grid against the solution, clearing any incorrectly filled cell.
- **Library** — the home page listing every puzzle.
- **Editor** — the "Create a puzzle" page for building and exporting a new puzzle file.
