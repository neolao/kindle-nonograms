---
status: todo
---
# Name The Two UUID-Titled Puzzles

## Description
Two of the 45 bundled puzzles (`data/puzzles/24386c66-cfb0-4f3f-bf67-392ad26fefe1.json`, `data/puzzles/772cc4e7-88d1-4c5f-b585-b43ad05553f5.json`) have their raw UUID as their display `name`, showing up verbatim in the library list instead of a readable title.

## Acceptance Criteria
- [ ] Both puzzle files have a human-readable `name`, matching the naming style of the other puzzles converted in the same batch.
- [ ] The `id` field (filename) is unchanged — only `name` is edited.
- [ ] `npm test` (including the puzzle-content validation tests) still passes.

## Notes
Audit finding F6 (`.ux/audit/2026-09-04.md`). Trivial content fix — two JSON files, no code change.
