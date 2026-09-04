---
status: todo
---
# Differentiate Editor Palette Swatch And Color Input Labels

## Description
Every palette swatch in the editor gets the identical `aria-label="Select color"`, and every palette color `<input type="color">` gets the identical `aria-label="Edit color"` (`packages/client/src/hydrateEditorPage.ts:222,239`) — indistinguishable to a screen reader across an entire palette of several colors.

## Acceptance Criteria
- [ ] Each palette swatch's `aria-label` includes something that differentiates it from its siblings (index and/or hex value), e.g. "Select color 2 (#3388cc)".
- [ ] Each color input's `aria-label` is differentiated the same way.
- [ ] Labels stay correct after adding/removing/reordering palette colors.

## Notes
Audit finding F16 (`.ux/audit/2026-09-04.md`).
