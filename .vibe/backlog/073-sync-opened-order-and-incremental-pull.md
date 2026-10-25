---
status: todo
---
# Sync Opened Order And Incremental Pull

## Description
The optional sync server already accepts and returns an `openedAt` date per puzzle and an `updatedSince` filter, but no client code uses either yet. Use them so the library's "recently opened" order follows the player across devices and survives a wiped Kindle, and so a page open downloads only what changed since the last sync.

## Acceptance Criteria
- [ ] After a wiped device re-enters its server address and key, both its progress and its "recently opened" order are restored.
- [ ] A second device sees the order in which the first device opened puzzles.
- [ ] Every pull after the first one asks the server only for entries changed since the last successful sync, and still converges, including the refilled-server and revision-collision cases of decision 054.
- [ ] The site works exactly as today when sync is not configured, and `sync-contract.test.ts` covers both the opened order and the incremental pull.

## Notes
Today the opened date is only a local `kindle-nonograms:opened:<id>` key (`packages/client/src/openedStorage.ts`) feeding the library's sort-by-recently-opened. Touches `packages/client/src/sync*.ts`, `openedStorage.ts`, `hydrateLibraryPage.ts`, `packages/shared/src/syncWire.ts`, and `packages/server/src/app.ts` and `storage.ts` (the per-entry `updatedAt` already exists). The server keeps the field and the filter on purpose, by Product Owner decision, until this item lands. See `.vibe/decisions/054-sync-uses-server-revisions-not-clocks.md`.
