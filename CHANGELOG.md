# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A "Back to puzzle list" link now sits at the top of every puzzle page, next to the language switcher, so players can return to the library at any time without using the browser's back button.
- Solving a puzzle now reveals a small picture of it right on the library page, next to its name — a little trophy that stays hidden until you've actually earned it by solving that puzzle.

### Changed

- The library and puzzle pages have a more polished look: proper spacing around text and controls, puzzles in the library listed as clearly separated cards, the play toolbar's buttons grouped with visible spacing, and the puzzle result message shown in a highlighted box — all accented with a muted blue that works well on the Kindle Colorsoft's color e-ink screen.
- The "Solved" badge on the library page now looks like a little stamp instead of plain text.
- Both pages now share a bolder "cabinet" look: a bordered, shadowed panel, a title with a printed-style double shadow, a row of small decorative dots, and three accent colors used with intent — amber for leaving/active controls, magenta for the main Check action, and teal for "completed" (shared by the win message and the Solved stamp, so the two visibly connect). The puzzle grid itself keeps its own plain, high-contrast frame — it stays the calmest, easiest to read part of the page.

## [1.10.0] - 2026-08-18

### Added

- The library and puzzle pages now share a consistent visual style (fonts, colors, spacing, and button/language-switcher appearance) instead of minimal, inconsistent styling.
- The puzzle grid now automatically scales to fit the screen, so it never needs to be scrolled to be seen in full — it re-scales instantly if the window is resized.

## [1.9.0] - 2026-08-18

### Added

- Players can now switch the app's language between English and Français from a dropdown on both the puzzle library and the puzzle page. The language is detected automatically from the browser on first visit, and the choice is remembered for next time.
- A "Check"/"Vérifier" button on the puzzle page lets players ask at any time whether their grid is correctly solved, showing "Puzzle solved!" or "Not solved yet" — on top of the existing banner that already appears automatically once the puzzle is solved.

### Fixed

- Filled cells and their matching color-swatch buttons now render as a plain block of color, with no shape symbol drawn on top — restoring the classic solid-square nonogram look.

## [1.8.0] - 2026-08-18

### Added

- Laid the groundwork for French and English translations across the app (not yet visible — the language switcher itself ships in a follow-up).
- Filled cells and their matching color-swatch buttons now show as a solid block of color, with the shape symbol drawn on top in whichever of black or white reads best against it — crossed cells stay plain, with no color fill, so they're never mistaken for a filled cell.

## [1.7.1] - 2026-08-17

### Fixed

- The game published to GitHub Pages is now the real, playable site — the previous automatic deploy was publishing an unrelated placeholder page instead.

## [1.7.0] - 2026-08-17

### Added

- Two small demo puzzles — a black-and-white one and a multi-color one — are now included, so the whole site is playable end to end right out of the box.

## [1.6.0] - 2026-08-17

### Added

- The whole site — every puzzle page, the home page, and the interactive bundle — can now be built with a single command and previewed locally before publishing.

## [1.5.0] - 2026-08-17

### Added

- The library page now shows which puzzles you've already solved.

## [1.4.0] - 2026-08-17

### Added

- Puzzle pages are now playable: tap a cell to fill it or switch to marking mode to cross out cells you're sure are empty, your progress is saved automatically, and a message tells you when you've solved the puzzle.

## [1.3.0] - 2026-08-17

### Added

- The site now has a home page listing every puzzle with its size and a link to play it, ready to show which ones are already solved once that's tracked.

## [1.2.0] - 2026-08-17

### Added

- Each puzzle now has a static page showing its color-coded clues and an empty grid ready to play, viewable and shareable even before any interactivity is added.

## [1.1.0] - 2026-08-16

### Added

- All puzzle files in the puzzle folder are now automatically discovered and validated when the site is built, whether they were authored in the game's own format or exported from the reMarkable nonogram generator.

## [1.0.0] - 2026-08-16

### Added

- 18 black-and-white puzzles converted from the reMarkable nonogram generator are now included in the puzzle library.
- The game is now automatically built and published to GitHub Pages on every push to `main`.

### Removed

- The project no longer ships a runtime server; it is being rebuilt as a static site.

## [0.3.0] - 2026-08-16

### Added

- Puzzles exported from the reMarkable nonogram generator project can now be converted into this project's puzzle format.

## [0.2.0] - 2026-08-16

### Added

- A player's progress on a puzzle is now saved in the browser, so it survives closing and reopening the page.

## [0.1.0] - 2026-08-16

### Added

- Puzzles (id, name, dimensions, color palette, and solution grid) can now be defined and validated.
- Puzzle clues (the numbers shown per row and column) can now be computed automatically from a puzzle's solution, correctly accounting for multi-color puzzles.
- A player's progress on a puzzle (which cells are filled, marked, or untouched) can now be tracked and checked for a correct, complete solve.

[Unreleased]: https://github.com/neolao/kindle-nonograms/compare/v1.10.0...HEAD
[1.10.0]: https://github.com/neolao/kindle-nonograms/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/neolao/kindle-nonograms/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/neolao/kindle-nonograms/compare/v1.7.1...v1.8.0
[1.7.1]: https://github.com/neolao/kindle-nonograms/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/neolao/kindle-nonograms/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/neolao/kindle-nonograms/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/neolao/kindle-nonograms/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/neolao/kindle-nonograms/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/neolao/kindle-nonograms/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/neolao/kindle-nonograms/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/neolao/kindle-nonograms/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/neolao/kindle-nonograms/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/neolao/kindle-nonograms/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/neolao/kindle-nonograms/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/neolao/kindle-nonograms/releases/tag/v0.1.0
