---
date: 2026-09-07
status: accepted
---
# Image import timeout race lives outside decodeImageFile.ts

**Context:** Backlog item 044 requires racing the editor's image decode
against a fixed timeout so a stalled `onload`/`onerror` can no longer leave
the import controls disabled forever.

**Decision:** The timeout race is a small, generic, pure `withTimeout()`
helper in `client`, called from `hydrateEditorPage.ts` around its existing
`decodeImageFile(file)` call — not logic added inside `decodeImageFile.ts`
itself.

**Reason:** `decodeImageFile.ts` is documented and already tested as
DOM-only glue (real `<canvas>`/`Image()` pixel decoding, which jsdom can't
run), verified by driving a real browser rather than by unit tests. A
timeout race is plain promise/timer logic with no browser API dependency,
so keeping it out of that file lets it be covered directly by fast,
deterministic unit tests (fake timers) instead of inheriting the
real-browser-only verification boundary of the code it wraps.

**Rejected alternatives:** Adding the race inside `decodeImageFile.ts`
itself, racing its internal `Promise` executor against a timer — natural
in that the timeout is conceptually part of "decoding", but it would pull
new, directly-testable timing logic into a module this project deliberately
keeps thin and real-browser-verified only, and would prevent this new logic
from getting real unit-test coverage.
