---
date: 2026-08-17
status: accepted
---
# The rendered puzzle page embeds the full puzzle, including its solution

**Context:** `renderPuzzlePage(puzzle)` embeds the puzzle as JSON in the page for later client-side hydration to consume.
**Decision:** The embedded JSON is the complete, unmodified puzzle (including its solution grid) — never stripped or split from a separate fetch.
**Reason:** The site is fully static with no backend, so there is no server-side boundary capable of hiding the solution from a determined player anyway; the existing progress-checking logic (`isPuzzleSolved`) already assumes the solution is available client-side. The backlog's own acceptance criteria require the payload to "round-trip to the original puzzle data" and only forbid the solution from being *visible* (rendered as cell text/attributes), not from being present in the embedded data.
**Rejected alternatives:** Stripping the solution from the embedded JSON and fetching/deriving it separately — rejected as pointless complexity for a game with no real anti-cheat requirement and no server to enforce one.
