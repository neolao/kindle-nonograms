---
status: done
---
# Pull Request CI Check

## Description
CI (`.github/workflows/deploy.yml`) only runs on push to `main`, so a contributor's pull request currently shows no automated feedback at all until after it's merged. Add a workflow that runs the same validation on every PR, so both the contributor and the maintainer see a pass/fail check before merging.

## Acceptance Criteria
- [x] New workflow `.github/workflows/pr-check.yml` triggers on `pull_request` (opened/synchronize/reopened/closed) targeting `main`. The `closed` case is only needed by [[025-automatic-puzzle-preview-on-pull-requests]]'s cleanup step — this item's own validation steps only need to run for opened/synchronize/reopened.
- [x] Runs the same steps as the existing `build` job in `deploy.yml` (checkout, setup Node 22, `npm ci`, `npm run lint`, `npm test`, `npm run build`) with no deploy step — this alone already exercises `loadPuzzleSources`, `createPuzzle`, and the content checks from [[023-puzzle-solvability-and-duplicate-validation]] against every puzzle file the PR adds or changes.
- [x] The check's pass/fail status shows up in the PR's checks list (standard GitHub Actions behavior once the workflow triggers correctly — no extra step needed).
- [x] `permissions:` on the workflow are scoped to `contents: read` only, since this job neither deploys nor writes anything.

## Notes
Small, low-risk addition — mirrors `deploy.yml`'s existing `build` job almost verbatim. Only factor the shared steps into a reusable/composite action if the duplication becomes annoying later; don't do it upfront (YAGNI). Depends on [[023-puzzle-solvability-and-duplicate-validation]] landing first so this check enforces content validation, not just structure. [[025-automatic-puzzle-preview-on-pull-requests]] later extends this same workflow file with an image-rendering step and adds a separate, privileged `workflow_run` workflow alongside it — see that item for why the privileged part can't live here.
