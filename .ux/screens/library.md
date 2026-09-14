---
slug: library
title: Library
flow: 001
status: implemented
source: packages/site/src/renderLibraryPage.ts, packages/client/src/hydrateLibraryPage.ts, packages/client/src/libraryFiltersStorage.ts
---

# Library

## Purpose

The Player picks a puzzle to play from the full list, optionally narrowed by color and solve-status filters and sorted by recency, and can see at a glance which puzzles are already solved. Their filter/status/sort choice is remembered across visits.

## Layout

`.panel` cabinet wrapper → `.page-header` (title) → color filter row (Mono/Multi toggle buttons, above the list, kept deliberately compact — see decision 045) → `<ul>` of puzzle rows (each: thumbnail-or-placeholder, `<a>` link with name/size, solved badge) → hidden "no results" message → secondary controls row (status filter — Unsolved/In progress/Solved toggle buttons — plus the "Recently opened" sort button, below the list) → pagination controls (Previous/Next + "n / N" status) → footer (`.language-switcher`, "Create a puzzle" link, GitHub contribution link). There is no size filter and no `<select>` anywhere on this screen — both were tried and replaced by toggle buttons (backlog items 066, 067) since dropdowns are hard to operate in Kindle's browser. Everything from the color filter through pagination is real HTML already in its default shape at first paint (see flow 001); `hydrateLibraryPage.ts` only locates it and attaches behavior.

## States

| State | Trigger | What the user sees | Primary action |
|---|---|---|---|
| Default, first-ever visit | Fresh page load, no saved filter cookie | Full puzzle list on page 1, neither filter pressed, sort off, every already-solved badge already visible — all baked at build time or corrected by the pre-paint check | Tap a puzzle to open it, or a filter/sort/pagination control |
| Default, returning visit | Fresh page load, a saved filter/status/sort cookie exists | The saved color/status/sort selection is already applied — matching buttons already pressed, the list already narrowed/reordered, page 1 — corrected synchronously during hydration, before the page is perceived as painted (same "frozen chrome" guarantee as the solved badges, not a visible pop-in; see decision 046) | Tap a puzzle, or change/clear a filter |
| Empty (filtered) | The active filter(s) narrow the list to zero matches | "No puzzles match these filters." with every filter/sort control still visible and usable | Change or clear a filter |
| Loading | n/a — static site, nothing loads after the initial page fetch | — | — |
| Partial | Hydration throws while attaching one control's listeners (e.g. the status filter) | Only that control's own group is affected; the color filter, sort, and pagination stay independently interactive — never one all-or-nothing failure (flow 001's per-control isolation rule) | Reload, or use only the controls that responded |
| Error | Embedded puzzle data fails to parse (existing, separate finding F25) | The static, unfiltered full list remains visible; filtering/sort/pagination/badges silently unavailable | n/a |

## Interactions

| Element | Action | Result | Feedback (<100 ms) |
|---|---|---|---|
| Puzzle link | Tap | Navigates to the puzzle page | Native link navigation |
| Color filter button (Mono / Multi) | Tap | List re-filters by color, pagination resets to page 1; tapping the already-active button clears back to "all" | Immediate re-render |
| Status filter button (Unsolved / In progress / Solved) | Tap | List re-filters by solve status, combined with the color filter (AND); pagination resets to page 1; tapping the already-active button clears back to "all" | Immediate re-render |
| Recently opened (sort) | Tap | List reorders by most-recently-opened first (never-opened puzzles kept after, in their default order); tap again restores default order | Immediate re-render |
| Any filter or sort change | — | The new selection is saved to a cookie and restored automatically on the next visit; an absent or corrupted cookie falls back to today's defaults with no error | N/A |
| Previous / Next | Tap | Moves one page; disabled at the first/last page | Immediate re-render |
| Puzzle row (already solved) | — | Badge and thumbnail are already visible at first paint, not revealed after a delay | N/A |

## Content

| Key | Text | Notes |
|---|---|---|
| `library.title` | "Kindle Nonograms" | Unchanged |
| `library.filterColorLabel` | "Color" / "Couleur" | Small visible label ahead of the Mono/Multi buttons, plus the group's accessible name |
| `library.filterColorMono` / `filterColorMulti` | "Mono" / "Multi" | Each button's own visible text; its accessible name additionally composes the color context ("Color: Mono") since the bare word is ambiguous on its own |
| `library.filterStatusLabel` | "Status" / "Statut" | The status group's accessible name (no separate visible label — "Unsolved"/"In progress"/"Solved" are self-explanatory on their own, unlike "Mono"/"Multi") |
| `library.filterStatusUnsolved` / `filterStatusInProgress` / `filterStatusSolved` | "Unsolved" / "In progress" / "Solved" | |
| `library.sortRecentLabel` | "Recently opened" | Unchanged |
| `library.solvedBadge` | "Solved" | Unchanged |
| `library.pagination.status` | "{page} / {totalPages}" | `totalPages` is knowable at build time (fixed puzzle count) |
| `library.filterNoResults` | "No puzzles match these filters." | Unchanged wording, now also reachable from the status filter |

## Accessibility

- **Keyboard order:** color filter, puzzle links, the "no results" message (when shown), status filter, sort, pagination, footer controls — document order, matching the two-row filter layout (color above the list, status + sort below it).
- **Names:** each toggle button carries its own accessible name; the color buttons additionally compose their group's context into that name ("Color: Mono") since "Mono"/"Multi" alone isn't self-explanatory, while the status buttons don't need this (each word is already unambiguous).
- **Focus after each action:** unchanged.
- **Announcements (live regions / screen reader):** none — a filter/sort change is silent to assistive tech beyond the DOM update itself (known gap, not addressed by this flow).
- **Contrast & targets:** 44px minimum tap targets preserved on every filter/sort/pagination control.
- **Motion:** none for a first-ever visit. A returning visitor's saved filter/status/sort selection is applied synchronously during hydration, before the page is perceived as painted — the same guarantee flow 001 already gives solved badges, not a second visible transition.
