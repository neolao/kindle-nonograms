---
date: 2026-09-05
status: accepted
---
# Save-failure warning is scoped to a single page view, not persisted across reloads

**Context:** Backlog item 033 asks for a one-time, dismissible warning the first time saving puzzle progress to `localStorage` fails, that must not repeat on every subsequent failed save "in the same session".

**Decision:** "Session" is read as the lifetime of the current puzzle page view: an in-memory flag (reset on every hydration) tracks whether the warning has already been shown, with no `sessionStorage`/cookie backing it. Reloading the page or navigating back to the puzzle can show the warning again if saving still fails.

**Reason:** The app has no existing session-persistence mechanism beyond the locale cookie and `localStorage` progress itself (which is precisely what's failing here, so it can't be reused to remember "already warned"). A plain in-memory flag matches every other piece of transient play state (`PlayState`'s mode/active color) and needs no new storage primitive for a narrow, low-stakes UX nicety.

**Rejected alternatives:** Backing the flag with `sessionStorage` so the warning stays suppressed across reloads within the same browser tab — rejected as disproportionate: it adds a second storage mechanism to reason about, and if the underlying storage failure is severe enough to also break `sessionStorage`, the flag would silently never persist anyway, so it wouldn't reliably improve on the simpler approach.
