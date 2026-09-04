---
status: todo
---
# Isolate Hydration Failures Across Page Modules

## Description
The three page hydration modules (`packages/client/src/main.ts:1-14`) self-invoke on import with no error isolation between them — an uncaught exception thrown while one module's top-level `hydrate()` call runs can halt the shared bundle's remaining synchronous execution before the other modules get a chance to run.

## Acceptance Criteria
- [ ] A thrown error during one page module's hydration (library, play, or editor) does not prevent the other two modules from attempting their own hydration.
- [ ] A test simulates one module throwing and asserts the others still run.
- [ ] No change to normal (non-throwing) hydration behavior on any page.

## Notes
Audit finding F10 (`.ux/audit/2026-09-04.md`). Distinct from the per-control isolation added inside `hydratePlayPage.ts`/`hydrateEditorPage.ts` by item "frozen default chrome" — this is about isolating the three *modules* from each other at the `main.ts` level.
