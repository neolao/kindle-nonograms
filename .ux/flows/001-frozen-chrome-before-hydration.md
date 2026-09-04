---
id: 001
title: Every page's chrome is already in its final default shape before hydration runs
status: designed
date: 2026-09-04
job: All three jobs in product.md — "find a puzzle" (library), "solve a puzzle" (play), "build a puzzle" (editor) — since this flow is the first moment of every one of them
screens: library, play, editor
decision: 001
prototype: none
finding: F1 (audit 2026-09-04)
---

# 001 — Every page's chrome is already in its final default shape before hydration runs

## Need

The Player (Kindle e-ink touchscreen, casual, near-daily use) opens the library, a puzzle, or — as a Contributor on a desktop browser — the editor. Today, on every one of these page loads, the static HTML paints first with no toolbar, no win banner, no filter/pagination controls, no palette/canvas — then the hydration script runs and builds all of that from scratch, so the page visibly grows/shifts a moment after it first appeared. On the app's own stated e-ink target ("slow refresh, no animations"), that is not a subtle transition — it is a second, disruptive redraw of the whole screen right after the first one. Success looks like: the page the user sees at first paint is already the page they will use — hydration only makes it respond to taps, it never changes what's on screen except to correct the handful of facts only the browser itself knows (a puzzle already solved, a badge already earned).

## Chosen approach

Bake each page's true default chrome into the HTML generated at build time (`packages/site/src/render*.ts`) — the exact same markup, in the exact same default state, that the hydration script currently constructs from scratch on load. This extends a pattern the project already trusts: the library's "solved" badge (`.vibe/decisions/004`) is already a real, hidden static node that hydration only reveals via the `hidden` attribute, never injects. This flow applies that same discipline to the puzzle page's toolbar/swatches/win banner (reopening `.vibe/decisions/005`, which built them from JS instead) and to the two areas with no prior decision at all: the library's filters/pagination and the editor's whole palette/canvas/toolbar.

Two kinds of default exist, and they are handled differently:
- **Data known at build time or always constant** (toolbar buttons, swatch colors, pagination's total-page count, the editor's fixed 5×5/black/Paint starting state) — baked once, permanently correct, hydration never touches their presence or shape, only attaches listeners.
- **Data known only in the browser** (a puzzle already solved via `localStorage`, a badge already earned) — the static default is the "nothing yet" state (banner hidden, badge hidden); a synchronous check at the very start of hydration — before the browser's first paint is perceived — corrects it if needed. This correction is never allowed to be visible as a transition; if it cannot be made invisible, it must not ship (see Exit & failure paths).

Accepted trade-off (Option A, chosen over adding a visual "not yet interactive" state to every control): for the negligible time between first paint and the hydration script attaching its listeners, a control looks tappable but does nothing yet. Given the hydration bundle is small and the target concern (visible pop-in) is strictly worse, this window is treated as acceptable and undocumented-to-the-user, not papered over with an extra loading state that would itself be a second visible transition.

## Flow

| Step | User does | System shows | Screen |
|---|---|---|---|
| 1 | Opens the library, a puzzle page, or the editor (fresh navigation or reload) | The complete static HTML: full chrome already in its default shape (toolbar, banner hidden, filters at "all", pagination page 1, badges hidden, editor's 5×5/black/Paint default) | library / play / editor |
| 2 | (No action — this happens before they can act) | A synchronous, blocking check reads `localStorage` for this page's puzzle(s); if any is already solved, the win banner text/visibility and/or the relevant solved badge(s) are set correctly before the page is perceived as painted | library / play |
| 3 | Taps/clicks any control (mode toggle, swatch, check, filter, pagination link, palette swatch, canvas cell) | The hydration script's listeners (attached to the pre-existing nodes located by their `data-role`) respond exactly as they do today | library / play / editor |
| 4 | Continues using the page (fills cells, changes filters, resizes the editor grid, pages through the library) | Unchanged from today — all *subsequent* re-renders after the first paint are still built dynamically by the hydration script | library / play / editor |

## Exit & failure paths

- **Hydration script fails to load or run at all** (e.g. blocked, old-browser parse error): the static default chrome remains exactly as painted — a fully-formed but inert page (buttons present, nothing responds to taps). This is a known, accepted regression from today's "no toolbar appears at all" state for a no-JS visitor; the game requires JavaScript to function either way (see `.vibe/decisions/005`), so no functional capability is actually lost, only the "the game clearly isn't working" signal a bare grid gave. Not designed further here — flagged in Out of scope.
- **Hydration throws partway through one control's setup** (e.g. the editor's palette listeners error, but the canvas listeners don't): every other already-attached control on the same page must keep working — attach listeners per control, not as one all-or-nothing block, so one failure never dead-ends its siblings.
- **The pre-paint `localStorage` check itself fails or finds corrupted/incompatible data**: falls back to the static default as-is (banner stays hidden, badge stays hidden) — visually identical to "never played," never a crash and never a flash of an incorrect state. This mirrors the existing, separate handling of incompatible saved progress (audit finding F11) — this flow does not change that behavior, only where the check now runs (before paint instead of after).
- **Undo / cancel:** not applicable — this flow has no destructive or reversible user action; it only changes when/how existing chrome appears.

## Acceptance criteria

- [ ] Loading a puzzle never played shows the same toolbar/grid it does today, with no observable difference in timing or a layout shift after first paint.
- [ ] Loading a puzzle already solved in a prior session shows the win banner already visible and correct on first paint — never hidden-then-shown.
- [ ] Loading the library with any number of solved puzzles shows every earned badge already revealed on first paint — never hidden-then-shown, on page 1 or any deep-linked page.
- [ ] Loading the library at a deep link beyond page 1 shows that page's rows and correct Previous/Next/disabled state already, with no flash back to page 1.
- [ ] Opening the editor always shows the 5×5 grid, one black palette swatch (checked), and Paint mode already selected, with no construction step visible.
- [ ] Disabling JavaScript (or simulating a hydration failure) leaves every page's default chrome fully visible and legible, just inert — never a blank or broken-looking page.
- [ ] A thrown error in one control's hydration setup does not prevent sibling controls on the same page from becoming interactive.

## Out of scope

- Making the game itself usable without JavaScript — the puzzle/editor interactions fundamentally require it; this flow only makes the *unhydrated* page look complete, not functional.
- Any visual "loading" / "not yet interactive" affordance on controls before hydration attaches its listeners (Option B, considered and rejected — see decision 001) — the tap-before-hydrated window is accepted as-is given the bundle's small size.
- Fixing corrupted/incompatible saved progress handling (audit F11) or the silent `saveProgress` failure path (audit F2) — unrelated findings, not touched by this flow.
- Any change to what happens *after* first paint: resizing the editor grid, changing library filters/pages, filling/marking cells all keep rebuilding dynamically exactly as today.
