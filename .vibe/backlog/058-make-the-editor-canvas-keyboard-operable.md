---
status: todo
---
# Make The Editor Canvas Keyboard Operable

## Description
The editor's own paint canvas is entirely keyboard-inoperable (plain `<td>`s, single delegated click handler — `renderEditorPage.ts:79`; `hydrateEditorPage.ts:332-352,682-698`). This is distinct from the play page grid's already-scoped-out keyboard gap: the editor's contributor persona works on a regular desktop browser with mouse *and* keyboard (per `.ux/product.md`), making this a real, expected input mode rather than an accessibility nice-to-have.

## Acceptance Criteria
- [ ] Canvas cells are reachable via keyboard (e.g. arrow-key navigation within the grid).
- [ ] Enter/Space on a focused cell paints/erases it, per the current mode, matching click behavior.
- [ ] Each cell exposes a state-describing `aria-label` (e.g. current color name or "empty").

## Notes
Audit finding F27 (`.ux/audit/2026-09-04.md`). Consider `/ux:design` given the navigation-model decisions involved (arrow-key scheme, focus management on resize).
