---
slug: sync-settings
title: Sync settings
flow: 002
status: implemented
source: packages/site/src/renderSyncPage.ts, packages/client/src/hydrateSyncPage.ts
---

# Sync settings

## Purpose

The Player connects (or disconnects) the optional sync server that keeps their progress safe off the Kindle.

## Layout

`.chrome-panel` → header (back link to the library + title) → `.panel` containing: a note that sync is optional and the game works without it → server address field (label marked "(required)", example shown as hint text under the input) → key field (label marked "(required)", masked input next to a Show/Hide button) → actions row ("Save and test", "Forget this server") → status line → "Last sync" line → footer with the language switcher.

## States

| State | Trigger | What the user sees | Primary action |
|---|---|---|---|
| Not configured (default, static) | No stored server | Empty fields, status "Not configured", "No sync yet" | Fill in and Save and test |
| Server saved | A stored server on open | Fields prefilled (key masked), status "Server saved. Sync is active." | Forget, or re-test |
| Testing | Save and test tapped | Button "Testing…" disabled, status "Testing…" | Wait (10 s limit) |
| Connected | Test succeeded | Status "Connected" (teal box), "Last sync: <time>" once the restore ends | None |
| Failed | Validation or test failed | Status "Failed: <cause> – <what to do>" (amber box), values kept | Fix and retry |
| Key shown | Show tapped | Key readable, button "Hide" pressed | Hide |

## Interactions

| Element | Action | Result | Feedback (<100 ms) |
|---|---|---|---|
| Show / Hide | Tap | Flips the key between masked and visible | Label and pressed look change |
| Save and test | Tap | Validates, tests, stores on success, restores server progress | Text swap, disabled |
| Forget this server | Tap | Native `confirm()` when a server is stored, then clears config, fields, status | Status "Not configured" |
| Back link | Tap | Returns to the library | Page change |

## Content

All strings are `sync.*` keys in `packages/shared/src/i18n.ts` (EN and FR); the library footer link is `library.syncLink`. Failure messages follow "Failed: <cause> – <what to do>" and never contain the key or the address.

## Accessibility

- **Keyboard order:** back link, address, key, Show/Hide, Save and test, Forget, language switcher.
- **Focus after each action:** stays on the pressed control (nothing is rebuilt).
- **Announcements:** the status line is `aria-live="polite"`.
- **Contrast & targets:** controls are at least 44px tall; state is always written in text, the teal/amber box is only reinforcement.
- **Motion:** none.
