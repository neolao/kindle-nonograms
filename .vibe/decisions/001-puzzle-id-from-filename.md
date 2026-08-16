---
date: 2026-08-16
status: accepted
---
# Puzzle id always comes from the source filename

**Context:** `loadPuzzleSources(dir)` loads puzzle files that are either the project's native `Puzzle` shape (which already carries an `id` field) or a reMarkable export (which has no `id` at all).
**Decision:** The id used for every loaded puzzle is always the filename without extension, even for native-shape files that already contain an `id` field — any `id` present in the file content is discarded in favor of the filename.
**Reason:** Keeps a single, unambiguous id source across both formats instead of trusting file content to stay in sync with its own filename; matches how the reMarkable export shape already works (it has no id at all, the caller supplies one from the filename).
**Rejected alternatives:** Trusting the native shape's own `id` field when present — rejected because it would let a file's declared id silently drift from its filename, creating two sources of truth.
