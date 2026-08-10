---
status: todo
depends_on: [012]
---
# Demo Puzzles And End-To-End Check

## Description
Add two real puzzle files to `data/puzzles/` (one black/white, one multi-color, both small — ≲20×20), run the full build, and manually verify the generated site end-to-end via `npm run preview`: browse the library, open each puzzle, fill/cross cells, reload to confirm progress persists, fully solve the small one to see the win banner, and confirm the library then shows it as solved.

## Acceptance Criteria
- [ ] `data/puzzles/` contains a valid black/white puzzle and a valid multi-color puzzle, both building successfully
- [ ] Manual walkthrough via `npm run preview` confirms: navigation, fill/cross interaction, progress surviving a page reload, win detection, and the library's solved indicator
- [ ] `npm run lint` and `npm test` are green after adding the demo content

## Notes
Depends on the build orchestrator (012). This is the first point the whole feature is demoable end-to-end. See plan section 6, step 13.
