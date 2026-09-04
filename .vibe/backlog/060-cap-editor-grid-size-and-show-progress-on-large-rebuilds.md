---
status: todo
---
# Cap Editor Grid Size And Show Progress On Large Rebuilds

## Description
The editor's width/height inputs have `min="1"` but no upper bound (`renderEditorPage.ts:53,55`; `hydrateEditorPage.ts:483-500,332-352`); a large typed value (e.g. 500×500) rebuilds the grid synchronously with zero busy indicator, blocking the page with no feedback.

## Acceptance Criteria
- [ ] Width/height inputs have a sane maximum, or a validation message when a value would produce an unreasonably large grid.
- [ ] If a large rebuild is still allowed, the import flow's existing yield-then-disable pattern is applied first so the page doesn't freeze with no indication of work in progress.

## Notes
Audit finding F29 (`.ux/audit/2026-09-04.md`).
