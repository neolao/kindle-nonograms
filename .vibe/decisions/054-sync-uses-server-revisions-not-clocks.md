---
date: 2026-10-25
status: accepted
---
# Optional LAN sync resolves conflicts with server-assigned revisions, not timestamps

**Context:** The Kindle wipes `localStorage`, so progress is lost. An optional backend on the player's local network keeps a copy; the static site stays usable alone. The same puzzle may be played on several devices.

**Decision:** The server keeps a `rev` counter per puzzle. A client write carries the `baseRev` it last saw and is accepted only if it equals the server's `rev`, otherwise the server answers 409 with its entry. A device with no `baseRev` (fresh or wiped) takes the server's copy and never overwrites it, even for a puzzle it played before the server answered. A server that lost its data is refilled by the devices, each sending its known `baseRev` so revisions keep growing. The pure decision (pull, push with the revision to send, or nothing) lives in `packages/client/src/syncPlan.ts`. On a conflict with unsent local changes, the player's latest action wins. Since a refilled server can reach the revision another device knows with different cells, a clean device whose cells differ from the server's entry at the same revision takes the server's copy (nothing unsent is lost).

**Reason:** Wall-clock last-write-wins fails in the very case this feature exists for: a wiped Kindle that is played before the key is re-entered would look "newer" and overwrite the full server copy, and a Kindle with a wrong clock would win or lose forever.

**Rejected alternatives:** Timestamp last-write-wins (breaks on wipe and clock skew). Backup/restore only with an unconditional server PUT (simplest, but silently keeps the last pusher once a second device is used, which the Product Owner wants to support). A hand-copied save code or a progress-in-URL link (no automatic sync).
