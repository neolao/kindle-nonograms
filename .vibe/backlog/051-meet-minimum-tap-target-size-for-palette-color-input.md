---
status: todo
---
# Meet Minimum Tap Target Size For Palette Color Input

## Description
The palette row's `<input type="color">` in the editor has no `min-height`/`min-width` rule (`packages/site/src/renderEditorPage.ts:104,108`; `hydrateEditorPage.ts:234-239`), unlike the Import section's own color input — it renders below the app's 44px tap-target minimum and visibly smaller than its sibling buttons.

## Acceptance Criteria
- [ ] The palette row's color input has the same `MIN_TAP_TARGET_PX` sizing as the Import section's color input.
- [ ] Visually consistent in height with the swatch/remove buttons beside it in the same row.

## Notes
Audit finding F20 (`.ux/audit/2026-09-04.md`).
