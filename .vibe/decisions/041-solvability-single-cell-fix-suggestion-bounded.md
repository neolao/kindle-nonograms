---
date: 2026-09-13
status: accepted
---
# The editor's solvability check suggests a single-cell fix only for small, bounded ambiguities

**Context:** The editor's "check solvability" button reports every ambiguous row/column, but a contributor still has to guess what to actually change. A concrete, empirically-grounded question was whether a single-cell fix could be suggested automatically, and whether that's feasible at the scale of a real ambiguous region.

**Decision:** A new `suggestSolvabilityFix` tries, for each cell `diagnoseSolvability` reports as ambiguous, every other value it could hold, re-checking full solvability after each trial; it returns the first single-cell change that makes the puzzle fair, or nothing. It only attempts this when the ambiguous region has at most 6 cells, and gives up after at most 40 trial checks regardless — both bounds are hard caps, not tuned to any specific puzzle. No visual highlight is added for the suggested cell; the existing row/column numbering (see this same feature) is considered enough for a contributor to locate it.

**Reason:** Testing this exact approach against "Champignon" and "Renard" — the two puzzles actually removed for requiring guessing — found zero single-cell fixes among ~130 and ~70 candidates tried respectively, confirming a spread-out ambiguity has no single culprit cell worth searching for at that scale; the 6-cell cap reflects that reality rather than an arbitrary guess. Measured real-puzzle timings (a fair 45×45 puzzle takes ~1s to fully verify) meant an unbounded search over a larger region risked multi-second-to-minutes UI stalls; the 40-attempt cap keeps the worst case bounded regardless of a puzzle's palette size or grid dimensions.

**Rejected alternatives:** Searching multi-cell (pair/triple) fixes when no single-cell one exists — rejected: combinatorially far more expensive (confirmed by extrapolating the single-cell timings), and multiple simultaneous artwork changes are a redesign decision a human should make, not something to suggest silently. A visual highlight on the suggested cell — rejected per product decision, since the grid's own new row/column numbering already makes the named cell locatable without extra state to keep in sync across grid rebuilds.
