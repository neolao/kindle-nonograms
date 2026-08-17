---
status: todo
depends_on: [015]
---
# Check Result Button (Additive To The Automatic Win Banner)

## Description
In `buildToolbar()` (`packages/client/src/hydratePlayPage.ts`), add a "Check"/"Vérifier" button (`data-role="check"`) after the Fill/Cross toggle and before the color swatches. Reuse `isPuzzleSolved` from `packages/shared/src/progress.ts` — no reimplementation of win-checking. Behavior: unconditionally reveal the existing banner, showing "Puzzle solved!" if solved, or a new "Not solved yet"/"Pas encore résolu" message otherwise. The existing automatic banner (which only appears when solved, on every tap) keeps working exactly as before, in parallel.

## Acceptance Criteria
- [ ] A "Check"/"Vérifier" button is visible in the puzzle page toolbar
- [ ] Clicking it on an unsolved grid shows an explicit "not solved yet" message
- [ ] Clicking it on a solved grid shows the same message as the automatic banner
- [ ] The existing automatic banner keeps showing/hiding on every tap as before
- [ ] FR/EN translations of the button label and both messages, via the module from item 015

## Notes
Depends on item 015 (translation keys). The user explicitly chose to keep both mechanisms — automatic banner and manual button — not replace one with the other. See the approved plan at `/home/neolao/.claude/plans/ajoute-une-passe-graphique-twinkling-dijkstra.md`.
