---
status: done
---
# Puzzle Solvability and Duplicate Validation

## Description
Puzzle validation today (`createPuzzle`) only checks structure — dimensions, palette range, non-empty id/name — nothing verifies that a submitted puzzle is actually a fair, logically solvable nonogram, or that it isn't an accidental duplicate of an existing one. Add content-level validation so bad submissions get rejected automatically instead of requiring a manual play-through.

## Acceptance Criteria
- [ ] A new pure function in `packages/shared` determines whether a puzzle's solution is fully derivable by line-based logical deduction alone (the standard "no guessing required" nonogram fairness check: repeatedly apply per-row/per-column clue inference until no cell changes; success = every cell is determined and matches the stored solution).
- [ ] The function returns a structured result (e.g. `{ ok: true }` or `{ ok: false, reason: string }`) instead of throwing, so callers decide how to report it.
- [ ] A second pure function detects duplicate puzzles already present in a puzzle list by comparing solution content (dimensions + cells), not just id — `loadPuzzleSources` already prevents id collisions implicitly via distinct filenames, this catches the same puzzle submitted under a different name.
- [ ] Tests cover: a trivially solvable puzzle (passes), a puzzle that requires guessing / has an ambiguous solution (fails with a reason), an empty/all-null grid (fails), a multi-color puzzle (works, not just monochrome), and duplicate vs. non-duplicate content.
- [ ] Both checks are wired into the puzzle loading/validation path used at build time (`packages/site/src/discoverPuzzles.ts` or a sibling validation script) so a submission failing either check fails the build the same way a structurally invalid file does today.

## Notes
Builds on `createPuzzle` (`packages/shared/src/puzzle.ts`) and reuses the run-length/color logic already computed by `computeLineClues`/`computePuzzleClues` (`packages/shared/src/clues.ts`) instead of reimplementing clue derivation. Keep the solver bounded and cheap: existing puzzles top out around 15×15, so a fixpoint line-solver (no backtracking, no full solution counting) is sufficient and stays fast in CI. Exact "unique solution" counting is NP-hard in general and intentionally out of scope — the logical-deduction check is the chosen fairness bar instead. Related to [[022-contributing-guide-for-puzzle-submissions]] (this is the validation contributors' submissions must pass) and [[024-pull-request-ci-check]] (this is what makes the PR check meaningful beyond structural validation).
