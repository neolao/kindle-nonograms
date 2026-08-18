---
date: 2026-08-18
status: accepted
---
# Solved-puzzle preview thumbnails are built entirely client-side, never pre-rendered server-side

**Context:** The library page is getting a small preview thumbnail per puzzle row, revealed only once the player has actually solved that puzzle (inspired by a free-form concept exploration). The site's static HTML generation already embeds each puzzle's full solution as JSON for the existing "Solved" badge check (see `.vibe/decisions/006-library-page-embeds-full-puzzles-for-solved-checking.md`), which raised the question of whether the thumbnail markup itself could also be pre-rendered server-side and merely hidden until solved.

**Decision:** The downsampled thumbnail (actual palette colors, actual solution shape) is computed and inserted into the page only by client-side hydration, after it confirms the puzzle is solved against saved progress — mirroring the existing `.solved-badge` reveal mechanism and the established "hydration builds its own controls" pattern (`.vibe/decisions/005-play-page-hydration-builds-its-own-controls.md`). The server-rendered markup for every row contains only a neutral, solution-independent placeholder (a fixed "?" glyph), never the real thumbnail content, hidden or otherwise.

**Reason:** A nonogram's entire payoff is revealing its picture by solving it. Embedding the real thumbnail in server markup and merely CSS-hiding it until solved would still let anyone reading the page's raw HTML see every unsolved puzzle's answer — a materially bigger spoiler surface than today's JSON-only embedding (which is already the accepted, harder-to-stumble-into baseline), and it would directly contradict the already-tested guarantee that the *visible* library markup never shows solution content before a puzzle is solved.

**Rejected alternatives:** Pre-render the real thumbnail server-side, hidden via CSS/`hidden` until JS reveals it (same shape as the `.solved-badge` today) — rejected because, unlike the generic "Solved" text, thumbnail markup necessarily contains puzzle-specific solution data, so hiding it via CSS still leaves it sitting in the page's HTML source for any unsolved puzzle.
