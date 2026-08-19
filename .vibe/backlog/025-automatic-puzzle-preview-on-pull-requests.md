---
status: todo
---
# Automatic Puzzle Preview on Pull Requests

## Description
Even with CI green, judging whether a submitted puzzle "looks right" — matches its name, uses a sensible palette, isn't visually broken — currently means pulling the branch and running the site locally. Post a rendered preview image of every puzzle a PR adds or changes directly as a PR comment, so it can be validated at a glance from the GitHub UI.

## Acceptance Criteria
- [ ] A script (e.g. in `packages/site`) renders a given `Puzzle`'s solution grid to a static PNG image — each cell colored per its `palette` index, `null` cells left blank/background — reusing `buildThumbnail`-style downsampling from `packages/shared/src/thumbnail.ts` if the grid exceeds a reasonable render size.
- [ ] A workflow step (extending or alongside `.github/workflows/pr-check.yml` from [[024-pull-request-ci-check]]) detects which files under `data/puzzles/` changed vs. the PR's base branch, renders a PNG for each, and posts (or updates, on subsequent pushes) a single PR comment containing all of them.
- [ ] Rendered images are viewable inline in the comment with no third-party image host: commit them to a dedicated branch (e.g. `puzzle-previews`) via the workflow's own `GITHUB_TOKEN`, and reference them via `raw.githubusercontent.com` URLs in the comment markdown.
- [ ] The workflow has exactly the elevated permissions this requires — `contents: write` to push the preview branch, `pull-requests: write` to comment — and nothing broader.
- [ ] A new push to the same PR replaces the previous preview images/comment instead of accumulating duplicates.

## Notes
Depends on [[024-pull-request-ci-check]]'s PR-triggered workflow existing. This is the one piece here with real infrastructure surface — a bot pushing to a branch and commenting with `GITHUB_TOKEN` — flag that explicitly for review before implementing. Keep the render script itself plain, testable Node code (no browser/canvas dependency required if done via a minimal PNG encoder or an SVG-to-PNG library), kept separate from the CI glue that invokes it.
