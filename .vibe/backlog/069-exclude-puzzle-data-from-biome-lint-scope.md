---
status: todo
---
# Exclude Puzzle Data From Biome Lint Scope

## Description
Running `npm run lint` (`biome check --write .`) reformats files under `data/puzzles/` as a side effect — e.g. it rewrote `data/puzzles/pikachu-15x15-color.json` from a pretty-printed, one-value-per-line array into a compact form, unrelated to whatever code change triggered the lint run. `biome.json`'s `files.ignore` is currently empty, so puzzle data is in scope even though it isn't source code Biome should format.

## Acceptance Criteria
- [ ] Running `npm run lint` no longer modifies any file under `data/puzzles/`.
- [ ] Biome still formats and lints every other tracked file exactly as before (no unrelated scope reduction).

## Notes
Surfaced while shipping backlog item 058: the sub-agent noted the same file getting reformatted and reverted on every run. Likely fix: add `"data/puzzles/**"` to `files.ignore` in `biome.json`. Confirm `npm test`'s puzzle-loading tests (`demoContent.test.ts`) still pass unchanged, since they read these files directly rather than through Biome.
