---
date: 2026-08-20
status: accepted
---
# Line-solver fairness check for puzzle solvability

**Context:** Backlog item 023 requires rejecting a submitted puzzle whose solution can't be reached by logical deduction alone ("no guessing required"), without requiring a full solving engine.

**Decision:** Solvability is checked with a fixpoint line-solver: repeatedly enumerate every placement of each row's/column's clue runs that is consistent with the cells already known, intersect those placements to force any newly-determined cells, and repeat until nothing changes. The puzzle passes only if every cell ends up forced and matches the stored solution.

**Reason:** This is the standard nonogram line-solving technique and directly implements "no guessing required": any cell it can't force really does require a guess to fill in a normal solving session. Existing puzzles are small (≤ 15×15 per the backlog notes), so brute-force placement enumeration per line stays fast; no need for constraint propagation tricks or a compiled solver.

**Rejected alternatives:** A full backtracking solver that counts the number of distinct valid solutions (true "unique solution" verification) was rejected as out of scope — counting solutions is NP-hard in general and adds real implementation and runtime cost for a guarantee stronger than what "fair, no-guessing" actually requires.
