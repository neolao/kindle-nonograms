---
status: done
depends_on: [025]
---
# Scheduled Sweep for Orphaned Puzzle Previews

## Description
The PR-preview pipeline (item 025) removes a puzzle preview when its PR closes, via an event-triggered cleanup. That path isn't guaranteed to run — a failed workflow run, or a PR closed by an admin action outside the normal event flow, would leave its preview behind forever. Add a periodic, independent sweep that removes any orphaned preview directory regardless of why the event-driven cleanup didn't fire.

## Acceptance Criteria
- [ ] A scheduled workflow (e.g. daily, `on: schedule`) lists every currently open pull request and every `previews/pr-<number>/` directory on the `puzzle-previews` branch, and deletes any directory whose PR number isn't in the open list.
- [ ] The sweep is safe to run even when nothing is orphaned (no-op, no commit, no PR comment activity).
- [ ] The sweep never touches a preview belonging to a currently open PR, even one that was just rendered moments before the sweep runs.
- [ ] A manual `workflow_dispatch` trigger is also available, so the sweep can be run on demand without waiting for the schedule.

## Notes
Backstop only — independent of the event-driven cleanup in `pr-check.yml`/`pr-preview-publish.yml`, not a replacement for it. Flagged during item 025's implementation (see `.vibe/decisions/018-pr-preview-trusts-only-workflow-expressions.md`) as a follow-up rather than bundled into that item, to keep its own scope to the acceptance criteria as written. Reuses the same `puzzle-previews` branch and `previews/pr-<number>/` layout `previewBranchGit.ts` already establishes.
