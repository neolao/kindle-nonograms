---
status: todo
---
# Ensure Multi-Color Clue Numbers Stay Readable

## Description
Multi-color puzzle clue numbers render in the puzzle's own raw palette hex directly on a white background with no contrast safeguard (`packages/site/src/renderPuzzlePage.ts:134`) — unlike swatch text, which runs through `contrastingTextColor` first. A pale palette color yields illegible clue numbers.

## Acceptance Criteria
- [ ] Clue-run numbers are rendered with a contrast-safe treatment against their white background, for every palette color.
- [ ] The border-style cue that also identifies each color (per decision 003) is unchanged.
- [ ] A puzzle with a light palette color (e.g. pale yellow) has legible clue numbers.

## Notes
Audit finding F17 (`.ux/audit/2026-09-04.md`). Likely depends on item 049 (contrast-color format support) if the fix reuses `contrastingTextColor`.
