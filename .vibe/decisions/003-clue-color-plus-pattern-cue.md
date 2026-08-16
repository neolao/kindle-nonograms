---
date: 2026-08-17
status: accepted
---
# Clue runs are distinguished by color AND a border pattern, not color alone

**Context:** `renderPuzzlePage(puzzle)` renders each row/column clue as a sequence of colored numbers, one per palette color used in that puzzle.
**Decision:** For puzzles with more than one palette color, each clue run gets both its palette color (text color) and a border style (solid/dashed/dotted/double, cycling deterministically by palette index) so different colors stay distinguishable even in grayscale. Single-color puzzles render plain, unadorned numbers — there is nothing to distinguish.
**Reason:** Kindle's e-ink browsers commonly render in grayscale or very limited color, where two palette colors of similar luminance can become visually identical; a UI/UX and a frontend-design consultation both independently flagged hue-only color coding as the top legibility risk for this feature.
**Rejected alternatives:** Color-only text styling — rejected as it silently breaks on grayscale e-ink, the project's primary target device.
