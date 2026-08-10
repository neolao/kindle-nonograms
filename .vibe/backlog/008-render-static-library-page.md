---
status: todo
depends_on: [004]
---
# Render Static Library Page

## Description
Add `packages/site/src/renderLibraryPage.ts`: a pure `renderLibraryPage(summaries): string` producing the site's home page — a list of all puzzles (name, size, relative link to its page), an empty-state message when there are none, and the puzzle ids embedded so client-side hydration can mark solved puzzles from `localStorage`.

## Acceptance Criteria
- [ ] Rendered HTML lists every puzzle with a relative link to `puzzles/<id>/`
- [ ] Empty puzzle list renders a clear empty-state message instead of an empty list
- [ ] Puzzle ids needed for solved-marking are present in the output in a form the hydration script can read

## Notes
Depends on the progress domain model (004) only for the shape hydration will need; no build-time "solved" computation happens here. See plan section 2 (`renderLibraryPage.ts`).
