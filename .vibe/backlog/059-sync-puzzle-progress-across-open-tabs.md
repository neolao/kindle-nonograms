---
status: todo
---
# Sync Puzzle Progress Across Open Tabs

## Description
Two tabs open on the same puzzle don't sync (`packages/client/src/hydratePlayPage.ts:433-494`) — solving it in one tab leaves the other showing stale progress/banner until reload.

## Acceptance Criteria
- [ ] Solving (or otherwise changing) a puzzle's progress in one tab updates another open tab on the same puzzle without a manual reload.
- [ ] No regression to single-tab behavior.

## Notes
Audit finding F28 (`.ux/audit/2026-09-04.md`). Low priority — the audit judged this unlikely given the app's single-tab Kindle usage pattern. Likely a `window.addEventListener("storage", ...)` listener.
