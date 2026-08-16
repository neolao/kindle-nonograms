---
status: done
depends_on: [004]
---
# Client Progress Local Storage

## Description
Add `packages/client/src/progressStorage.ts`: `loadProgress`/`saveProgress` persisting a puzzle's `PuzzleProgress` to the browser's `localStorage` under key `kindle-nonograms:progress:<puzzleId>`, with graceful degradation if storage is unavailable or throws.

## Acceptance Criteria
- [ ] `saveProgress` followed by `loadProgress` round-trips the same data for a given puzzle id
- [ ] `loadProgress` returns `undefined` when no entry exists for that puzzle id
- [ ] Corrupted JSON in storage is treated as "no progress" rather than throwing
- [ ] A `localStorage` that throws (quota, restricted mode) is caught and degrades silently instead of crashing

## Notes
Depends on `PuzzleProgress` from item 004. Needs `jsdom` as a new devDependency of `packages/client` (per-file `// @vitest-environment jsdom` pragma). See plan section 4 (`progressStorage.ts`).
