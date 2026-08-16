---
status: done
---
# Remove Express Server Package

## Description
The project pivots from a full-stack (Express) architecture to a static-site generator — no runtime server is needed anymore. Remove `packages/server` entirely (app.ts, index.ts, tests, Express/supertest/@types/express dependencies) and update the root `package.json` workspaces/scripts accordingly.

## Acceptance Criteria
- [ ] `packages/server/` no longer exists in the repo
- [ ] Root `package.json` no longer references a `server` workspace or `dev:server` script
- [ ] `npm install` and `npm test` still succeed after removal (no dangling references)

## Notes
Independent of the other domain-model items; can be done in parallel. See plan section 2 intro.
