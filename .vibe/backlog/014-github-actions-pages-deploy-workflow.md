---
status: todo
depends_on: [012, 013]
---
# GitHub Actions Pages Deploy Workflow

## Description
Add `.github/workflows/deploy.yml`: on push to `main` (plus manual `workflow_dispatch`), checkout, install, run lint and tests as a quality gate, build the static site, and deploy it to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages`. Since `data/puzzles/*.json` is committed, adding a puzzle becomes: commit and push the JSON file, and the site rebuilds and republishes automatically.

## Acceptance Criteria
- [ ] Workflow runs lint and tests before building, and fails the deploy if either fails
- [ ] Workflow builds the site and uploads/deploys the output to GitHub Pages
- [ ] A push to `main` triggers a successful automatic deployment, visible at the project's GitHub Pages URL

## Notes
Depends on the build orchestrator (012) and the verified demo content (013). Requires a one-time manual repository setting (Settings → Pages → Source: GitHub Actions) that cannot be automated from code — flag this to the user when implementing. See plan section 3.
