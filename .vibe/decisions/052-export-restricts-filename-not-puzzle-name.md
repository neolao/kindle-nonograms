---
date: 2026-09-28
status: accepted
---
# Puzzle editor's Export restricts the filename's character set, not the puzzle name

**Context:** A puzzle JSON uploaded straight to `data/puzzles/` had its `name` left identical to its filename-derived id, which passed the editor's own Export validation (`createPuzzle` never checked this) but failed the site's build-time content test (`demoContent.test.ts`), breaking the GitHub Pages deploy workflow. The follow-up feature request was to make Export "verify everything" so an exported JSON can't fail downstream.

**Decision:** Export now rejects a filename containing anything outside `[a-z0-9_-]+` (space, uppercase, accents, symbols). It does **not** reject a puzzle name identical to its filename, or any other name-quality rule — the puzzle name field stays completely free-form, including staying equal to the filename if a contributor wants that.

**Reason:** Explicit product decision: the filename is a technical identifier (it becomes the shipped `.json`'s name and the puzzle's `id`) and benefits from a clean, predictable character set regardless of who or what produced it. The displayed puzzle name is editorial content with no technically "correct" shape to check — `demoContent.test.ts`'s own check remains the sole guard against a name left equal to its raw id, deliberately kept out of Export's own validation.

**Rejected alternatives:** Rejecting a name identical to the filename (case-insensitively) or shaped like a UUID at Export time — considered and dropped by the product owner: a name equal to the filename is not actually a problem worth blocking on, only content-review's own judgment (via the build-time test) should catch it.
