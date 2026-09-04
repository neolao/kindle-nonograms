---
status: todo
---
# Distinguish A Parse Failure From An Empty Library

## Description
If the embedded puzzles JSON fails to parse, the library silently behaves as if there were nothing to filter (`packages/client/src/hydrateLibraryPage.ts:25-37,398-415`) — no distinction from a genuinely empty library, and no console signal either.

## Acceptance Criteria
- [ ] A parse failure of the embedded puzzles data logs a warning (console), distinguishable from the genuinely-empty-library case.
- [ ] The genuinely-empty-library case (an actual `[]`) is unaffected.

## Notes
Audit finding F25 (`.ux/audit/2026-09-04.md`). Low priority — the parse failure case shouldn't occur in a correctly built site.
