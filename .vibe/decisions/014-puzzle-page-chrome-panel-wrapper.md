---
date: 2026-08-18
status: accepted
---
# Puzzle page chrome gets its own wrapping panel, distinct from the grid's frame

**Context:** Intensifying the cabinet reskin (see `.vibe/decisions/013-three-accent-cabinet-reskin.md`) to match the approved mockup more closely required giving the puzzle page's heading/back-link/toolbar/win-banner a single bordered, shadowed, rounded panel — previously each of those elements was only individually bordered, with no shared enclosing box.

**Decision:** A static wrapping element holds the heading, back-link row, and (once hydration builds them) the toolbar and win banner. Hydration now targets that wrapper directly to insert the toolbar/banner, instead of inserting them as siblings of the grid via the grid's own parent. The grid keeps its own separate bordered frame as a sibling of this wrapper, never nested inside it.

**Reason:** A shared panel needs its own border/background/shadow, which only works cleanly as one real wrapping element rather than styling every child individually. Since the wrapper is a sibling of the grid, not an ancestor, it can carry as much padding/border/shadow as the design calls for with zero effect on the grid's fit-to-viewport measurement — that measurement only cares about the grid's own container chain (see `.vibe/decisions/011-chrome-padding-excludes-grid-wrapper.md`), which stays untouched.

**Rejected alternatives:** Keep inserting the toolbar/banner relative to the grid's parent (today's approach) and simply style each element individually — rejected because it can't produce one shared enclosing panel around chrome that visually reads as a single card, which the approved design calls for.
