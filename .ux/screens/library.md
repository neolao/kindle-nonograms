---
slug: library
title: Library
flow: 001
status: designed
source: packages/site/src/renderLibraryPage.ts, packages/client/src/hydrateLibraryPage.ts
---

# Library

## Purpose

The Player picks a puzzle to play from the full list, optionally narrowed by size/color filters, and can see at a glance which puzzles are already solved.

## Layout

`.panel` cabinet wrapper → `.page-header` (title + `.language-switcher`) → filter row (`Taille`/`Couleur` `<select>`s, already static and functional today) → `<ul>` of puzzle rows (each: thumbnail-or-placeholder, `<a>` link with name/size, solved badge) → pagination controls (Previous/Next + "n / N" status) → footer (`.language-switcher` again, "Create a puzzle" link, GitHub contribution link). Filters and pagination are the two pieces this flow adds to the static markup — everything else already exists as real HTML.

## States

| State | Trigger | What the user sees | Primary action |
|---|---|---|---|
| Default (this flow's concern) | Any fresh page load, any puzzle count | Full puzzle list already in its target page (page 1, or the deep-linked page), Previous/Next already correctly enabled/disabled, every already-solved puzzle's badge already visible — all baked at build time (page/badge facts are either build-time-fixed or corrected by the pre-paint check in flow 001) | Tap a puzzle to open it, or a filter/pagination control |
| Empty (filtered) | Filters narrow the list to zero matches | "Aucun puzzle ne correspond à ces filtres." (existing, already handled well) with filters still visible to adjust | Change a filter |
| Loading | n/a — static site, nothing loads after the initial page fetch | — | — |
| Partial | Hydration throws while attaching filter/pagination listeners | Per flow 001's failure path: whichever controls attached successfully (e.g. puzzle links, which need no JS) keep working; the rest stay in their static default (unfiltered, page 1) rather than breaking | Reload, or use only the controls that responded |
| Error | Embedded puzzle data fails to parse (existing, separate finding F25 — not changed by this flow) | The static, unfiltered full list remains visible; filtering/pagination/badges silently unavailable | n/a |

## Interactions

| Element | Action | Result | Feedback (<100 ms) |
|---|---|---|---|
| Puzzle link | Tap | Navigates to the puzzle page | Native link navigation |
| Size / Color `<select>` | Change | List re-filters, pagination resets to page 1 | Immediate re-render (existing, unchanged) |
| Previous / Next | Tap | Moves one page; disabled at the first/last page | Immediate re-render (existing, unchanged) |
| Puzzle row (already solved) | — | Badge and thumbnail are already visible at first paint, not revealed after a delay | N/A — this flow's whole point |

## Content

| Key | Text | Notes |
|---|---|---|
| `library.title` | "Kindle Nonograms" | Unchanged |
| `library.solvedBadge` | "Solved" / "Résolu" | Unchanged; now baked `hidden` by default and corrected pre-paint instead of injected |
| `library.pagination.status` | "{page} / {totalPages}" | `totalPages` is knowable at build time (fixed puzzle count) — bake the correct value directly, no placeholder |
| `library.filters.empty` | "Aucun puzzle ne correspond à ces filtres." | Unchanged |

## Accessibility

- **Keyboard order:** unchanged by this flow — filters, puzzle links, pagination buttons, footer controls, in document order (now literally the order they appear in `render*.ts`'s template, not whatever order `hydrateLibraryPage.ts` used to `.append()` them in — see decision 001's consequences).
- **Focus after each action:** unchanged (existing behavior, not part of this flow).
- **Announcements (live regions / screen reader):** none introduced by this flow.
- **Contrast & targets:** unchanged; pre-existing 44px tap targets on pagination/filter controls are preserved since the same markup is now just baked instead of built.
- **Motion:** none — this flow's entire purpose is removing the one motion/redraw this screen currently has (the post-load pop-in of filters/pagination).
