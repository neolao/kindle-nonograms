---
slug: editor
title: Editor
flow: 001
status: designed
source: packages/site/src/renderEditorPage.ts, packages/client/src/hydrateEditorPage.ts
---

# Editor

## Purpose

The Contributor builds a new puzzle — sets a grid size, builds a color palette, paints (or imports) a solution — and exports it as a file to submit via a GitHub pull request.

## Layout

`.chrome-panel` → header (back link + title) → Grid size panel (width/height inputs — already static today) → Import image panel (already static today) → Palette panel (swatches + add/remove, currently JS-built) → Canvas panel (paint/erase toggle + grid, currently JS-built) → Name and export panel (already static today, including the single shared error/status region — see the separate finding F24 about that region's placement, unaffected by this flow). This flow bakes the Palette and Canvas panels' default content into static markup.

## States

| State | Trigger | What the user sees | Primary action |
|---|---|---|---|
| Default (only state relevant to this flow) | Every fresh page load, always — no persistence exists for this page | Grid size `5`×`5`, Palette panel showing one black swatch already checked (✓) plus a disabled remove (×) and an add (+) button, Canvas panel showing a real 5×5 grid of empty cells with Paint mode already selected — all baked exactly as `hydrateEditorPage.ts`'s current `DEFAULT_WIDTH`/`DEFAULT_HEIGHT`/`DEFAULT_PALETTE` build it today | Resize the grid, edit the palette, paint, import an image, name and export |
| Resized / edited / painted | Any user edit after first paint | Unchanged from today — still rebuilt dynamically by the hydration script | Continue editing |
| Import in progress / error / export | Unchanged by this flow | See separate findings F13 (no import timeout), F14 (no export confirmation), F4 (raw error text) | n/a |

## Interactions

| Element | Action | Result | Feedback (<100 ms) |
|---|---|---|---|
| Palette swatch / add / remove | Tap | Selects/adds/removes a palette color | Immediate (existing, unchanged) |
| Canvas cell | Tap/drag | Paints or erases per current mode/color | Immediate (existing, unchanged) |
| Width / Height input | Change | Resizes the grid (existing, unchanged; see separate finding F12 about silent-revert on invalid input) | Immediate (existing, unchanged) |
| (New) First paint | — | Palette and Canvas already show the real default (one black swatch, 5×5 empty grid, Paint mode) — no post-load construction is visible | N/A — this flow's whole point |

## Content

No new user-facing strings. Note for whoever implements this: the default markup baked here must still go through the same `data-i18n` treatment as the rest of the page once the editor's separate localization gap (finding F5) is closed — don't bake hardcoded English text that then has to be found and fixed twice.

## Accessibility

- **Keyboard order:** unchanged — palette/canvas controls become focusable in the order they appear in `renderEditorPage.ts`'s template rather than however `render()` happened to `.append()` them.
- **Focus after each action:** unchanged.
- **Announcements (live regions / screen reader):** none introduced by this flow.
- **Contrast & targets:** unchanged (the palette swatch tap-target-size gap is the separate, unaffected finding F20).
- **Motion:** none — removes the whole-panel pop-in that is this screen's (largest) share of finding F1.
