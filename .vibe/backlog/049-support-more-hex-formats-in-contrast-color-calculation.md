---
status: todo
---
# Support More Hex Formats In Contrast Color Calculation

## Description
`contrastingTextColor` (`packages/shared/src/contrastColor.ts:4,39-41`) only accepts strict 6-digit hex; any other valid CSS color format the app itself accepts elsewhere (3-digit, 8-digit/alpha hex) silently falls back to black text regardless of the actual background darkness.

## Acceptance Criteria
- [ ] `contrastingTextColor` normalizes/expands 3-digit and 8-digit (alpha) hex before computing contrast, instead of falling back to black.
- [ ] A dark background in shorthand or alpha hex format now correctly gets white text.
- [ ] Existing 6-digit-hex behavior and the malformed-input fallback are unchanged.

## Notes
Audit finding F18 (`.ux/audit/2026-09-04.md`).
