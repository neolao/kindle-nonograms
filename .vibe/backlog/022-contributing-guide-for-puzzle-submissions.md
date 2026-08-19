---
status: todo
---
# Contributing Guide for Puzzle Submissions

## Description
Adding a new puzzle today means reverse-engineering the `Puzzle` JSON shape from `packages/shared/src/puzzle.ts` and the existing files in `data/puzzles/` — there is no documentation aimed at an external contributor. Add a `CONTRIBUTING.md`, a puzzle JSON template, and a PR checklist so someone can go from "I made a puzzle" to "here's my PR" without reading the source.

## Acceptance Criteria
- [ ] `CONTRIBUTING.md` at the repo root explains the `Puzzle` JSON shape (`id`/`name`/`width`/`height`/`palette`/`cells`), states clearly that the id always comes from the filename and not from any `id` field inside the JSON (per `.vibe/decisions/001-puzzle-id-from-filename.md`), gives the target location (`data/puzzles/<id>.json`), and lists the exact local commands to run before opening a PR (`npm test`, `npm run lint`, `npm run build`).
- [ ] A commented example/template puzzle file exists outside `data/puzzles/` (e.g. `docs/puzzle-template.json`, or embedded as a fenced code block directly in `CONTRIBUTING.md`) — `loadPuzzleSources` (`packages/site/src/discoverPuzzles.ts`) loads every `*.json` file under `data/puzzles/`, so a template placed there would break the build.
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` adds a checklist for puzzle submissions: filename is a sensible id (kebab-case, no spaces), palette entries are valid hex colors, the three local commands above were run, and the puzzle content is original or appropriately licensed.
- [ ] README links to `CONTRIBUTING.md` if it doesn't already.

## Notes
Document the exact validation rules enforced by `createPuzzle` (`packages/shared/src/puzzle.ts`): non-empty `id`/`name`, positive integer `width`/`height`, non-empty `palette`, `cells.length === height`, every row's `length === width`, and every cell value either `null` or a valid index into `palette`. Also mention the reMarkable-export shape (`BooleanGridExport` in `packages/shared/src/adapters.ts`) as an alternative format contributors coming from the sibling `remarkable-nonogram-generator` project can submit as-is.
