---
status: done
depends_on: [005, 006, 007, 008, 010, 011]
---
# Static Site Build Orchestrator

## Description
Add `packages/site/src/build.ts` with `buildSite({ puzzlesDir, outDir })`, tying together puzzle discovery, the shared client bundle build, and both page renderers into one static output directory (`outDir/index.html`, `outDir/puzzles/<id>/index.html`, `outDir/assets/*`). Wire root `npm run build` to invoke it, and add `npm run preview` to serve the generated output locally.

## Acceptance Criteria
- [ ] Running the build against a fixture puzzles directory produces the expected file tree in a temp output directory
- [ ] All generated internal links/asset paths are relative (verified against the fixture output)
- [ ] `npm run build` succeeds end-to-end against the real (still-empty at this point) `data/puzzles/` without error
- [ ] `npm run preview` serves the generated output over local HTTP

## Notes
Depends on server removal (005), puzzle discovery (006), both page renderers (007, 008), and both hydration scripts (010, 011) since it bundles the client code that includes them. See plan section 2 (`build.ts`).
