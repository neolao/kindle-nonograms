---
date: 2026-08-17
status: accepted
---
# The library page reserves a hidden "solved" badge node per puzzle

**Context:** `renderLibraryPage(summaries)` renders each puzzle as a list row; a later feature will hydrate the page to mark rows for puzzles the player already solved (from `localStorage`).
**Decision:** Each row already contains its solved-badge element in the static markup (`<span class="solved-badge" hidden>`), for hydration to reveal later by toggling `hidden` — not an empty row for hydration to inject a new element into at runtime.
**Reason:** Injecting DOM at runtime causes a visible flash/redraw on Kindle's slow e-ink refresh; toggling a `hidden` attribute on an already-laid-out node does not. Locking in the row's final structure now also avoids a hydration-side rework later if the attribute's owner element were decided differently at that point.
**Rejected alternatives:** Leaving only a bare `data-puzzle-id` attribute for hydration to build the badge from scratch — rejected for the redraw-flash and later-rework reasons above.
