---
status: done
depends_on: [001, 003]
---
# Discover And Validate Puzzle Sources

## Description
Add `packages/site/src/discoverPuzzles.ts` with `loadPuzzleSources(dir)`: lists `data/puzzles/*.json`, auto-detects whether each file is the project's native `Puzzle` shape or the reMarkable export shape (via `fromBooleanGridExport`), validates every file, and returns `Puzzle[]`. The puzzle id is the filename without extension.

## Acceptance Criteria
- [ ] Loads and validates both native-format and reMarkable-export-format fixture files correctly
- [ ] A malformed puzzle file throws a descriptive error (fail-fast — no silent skipping)
- [ ] An empty source directory returns an empty list without error

## Notes
Depends on `createPuzzle` (001) and `fromBooleanGridExport` (003). See plan section 2 (`discoverPuzzles.ts`).
