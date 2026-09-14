---
date: 2026-09-14
status: accepted
---
# Secondary filter/sort controls move below the puzzle list

**Context:** The library page's filter row (color filter, sort-by-recent) sat entirely above the puzzle list, growing every time a new filter was added — it had become too tall on Kindle's narrow viewport.

**Decision:** The color filter stays above the list, shortened and compacted; the new status filter and the existing sort-by-recent button move to a second controls row below the list.

**Reason:** Splitting frequently-used filtering (color) from secondary refinement (status, sort) keeps the page's top compact without hiding any control — a returning player's saved preference (see item 072) restores all of them regardless of position, and a first-time visitor still reaches every control by scrolling past the list, an acceptable tradeoff confirmed with the product owner over adding a discovery hint.

**Rejected alternatives:** Keeping every filter together above the list (only moving sort down) was considered and rejected — it would still grow the top row every time a new filter is added, undermining the compactness goal. A collapsible "more filters" disclosure was also considered and rejected as unnecessary complexity given Kindle's plain-HTML constraints and the two-groups split already solving the space problem.
