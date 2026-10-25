---
id: 002
title: A player optionally connects the game to their own sync server
status: implemented
date: 2026-10-25
job: "Pick up where I left off" — keep progress when the Kindle is wiped or changed (extends jobs 1 and 2 in product.md)
screens: library, sync-settings
decision: 001 (frozen chrome), .vibe/decisions/054-sync-uses-server-revisions-not-clocks.md
prototype: none
---

# 002 — A player optionally connects the game to their own sync server

## Need

The Player has a sync server on their home network and wants their progress copied there, so a wiped or replaced Kindle gets it back. Sync is optional: the game works fully without it, and nothing about it shows during play. Success looks like: type an address and a key once, see "Connected", and later find the progress restored after re-entering them on a fresh device.

## Flow

| Step | User does | System shows | Screen |
|---|---|---|---|
| 1 | Taps "Sync progress" in the library footer | Sync page, already complete: note that sync is optional, empty fields, status "Not configured" | library → sync-settings |
| 2 | Types the server address and the key (optionally taps Show to check the key) | Fields; key masked unless Show is on | sync-settings |
| 3 | Taps "Save and test" | Button reads "Testing…" and is disabled (text swap only); status "Testing…" | sync-settings |
| 4a | (success) | Status "Connected"; nothing was stored before this point; the server's existing progress is restored; "Last sync: <time>" appears | sync-settings |
| 4b | (failure) | Status "Failed: <cause> – <what to do>"; typed values kept; nothing stored | sync-settings |
| 5 | Later: taps "Forget this server" | Confirmation (native `confirm()`, only when a server is stored); on accept the fields empty and status is back to "Not configured"; local progress is kept | sync-settings |

## Exit & failure paths

- **Empty or non-http(s) address, empty key:** inline "Failed: …" text saying how to fix it; no request, nothing stored.
- **Wrong key / server unreachable / not a sync server / http address from an https page:** four distinct "Failed: <cause> – <what to do>" messages; nothing stored, sync stays inactive.
- **Browser storage refuses the write:** "Failed: could not save …"; sync stays inactive.
- **10 s without an answer:** treated as unreachable.
- **Declined confirmation:** nothing changes.
- **Kindle wipes its storage:** the player re-enters address and key once; the progress comes back from the server.
- **Language switched mid-way:** the status and the last-sync line are retranslated in place.

## Acceptance criteria

- [x] Every control, hint and status line is in the static HTML; hydration builds nothing (decision 001).
- [x] The status line is an `aria-live="polite"` region that always has text; no state is conveyed by color alone.
- [x] The key is masked, never written to text, attributes, a URL or a message; Show flips it and the button label.
- [x] A failed test stores nothing; only a successful test activates sync.
- [x] Buttons and inputs are at least 44px tall; no animation, transition or media query.
- [x] All strings exist in English and French.

## Out of scope

- Any sync indicator during play or on the library (product owner's choice).
- Choosing which puzzles sync, or merging conflicting copies by hand.
