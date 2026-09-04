---
status: todo
---
# Label Play Page Color Swatches For Screen Readers

## Description
Color swatch buttons for picking the active fill color on a multi-color puzzle (`packages/client/src/hydratePlayPage.ts:221-232`) have no accessible name at all — a screen reader announces an unlabeled button with no way to tell which color it selects.

## Acceptance Criteria
- [ ] Each swatch button has an `aria-label` naming or numbering its color (e.g. "Color 2").
- [ ] The active swatch's accessible state (`aria-pressed`) is unaffected.
- [ ] Works for both the statically baked default swatch and any swatch state change at runtime.

## Notes
Audit finding F15 (`.ux/audit/2026-09-04.md`).
