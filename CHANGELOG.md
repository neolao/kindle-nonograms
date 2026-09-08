# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- On a multi-color puzzle page, clue numbers for a pale palette color (e.g. pale yellow) now render in black text so they stay legible against the white background, while the number's colored/patterned border still identifies its color. Numbers for already-readable palette colors are unchanged.

## [2.20.0] - 2026-09-08

### Added

- In the puzzle editor, each palette color's "select", "edit" and "remove" controls now have a distinct, numbered accessible name ("Select color 2", "Edit color 2", "Remove color 2") instead of an identical, unlabeled-feeling name shared across the whole palette.

## [2.19.0] - 2026-09-08

### Added

- On a multi-color puzzle, each color swatch button now has an accessible name ("Color 1", "Color 2", etc.) so a screen reader user can tell which color a swatch picks, instead of announcing an unlabeled button.

## [2.18.0] - 2026-09-08

### Added

- The puzzle editor now shows a brief on-page confirmation naming the exported file after a successful export, instead of relying on the browser's download UI alone. A failed export still shows its existing error message.

## [2.17.0] - 2026-09-07

### Added

- Importing an image in the puzzle editor now gives up after 15 seconds if it never finishes loading, showing a clear "This image took too long to load" message and re-enabling the import controls instead of leaving them stuck disabled.

## [2.16.0] - 2026-09-07

### Added

- Typing an invalid grid width or height in the puzzle editor (zero, negative, or not a number) now shows a clear error message before the field reverts to its last valid value, instead of reverting silently with no explanation.

## [2.15.0] - 2026-09-07

### Added

- If your saved progress for a puzzle no longer matches its current size (e.g. it was resized since you last played it), the puzzle page now shows a small note explaining that progress couldn't be restored, instead of silently handing you an empty grid with no explanation.

## [2.14.0] - 2026-09-07

### Added

- If one page's startup script hits an unexpected error, the library, puzzle, and editor pages still each get their own chance to load normally instead of one failure silently breaking the others.

## [2.13.1] - 2026-09-07

### Fixed

- A puzzle page now shows a clear "This puzzle couldn't be loaded" message when its puzzle data is missing or invalid, instead of silently leaving a grid that looks tappable but does nothing.

## [2.13.0] - 2026-09-06

### Added

- Every page's declared language now matches your saved language choice from the very first moment it loads, instead of only after the page finishes loading — so a screen reader, a search engine, or a page viewed without JavaScript no longer sees English tagged on French content.

## [2.12.0] - 2026-09-06

### Added

- The puzzle editor now honors the saved/detected language and shows its own language switcher in a footer, matching the library page — previously it always rendered in English with no way to change it.

## [2.11.3] - 2026-09-06

### Fixed

- Two bundled puzzles showed their raw UUID as the display name in the library list ("Dinosaur" and "Moon" now show up instead of the filename).

## [2.11.2] - 2026-09-06

### Fixed

- A puzzle file with a missing filename/id now reports the error using the field's own name ("Filename (id) must not be empty") instead of calling it "Puzzle id", matching how the sibling puzzle-name error already names its own field.

## [2.11.1] - 2026-09-06

### Fixed

- Screen readers could silently miss the win banner's announcement, since its message text was updated while the banner was still hidden — the banner is now shown before its text is announced, for both completing a puzzle by tapping and using the Check button.

## [2.11.0] - 2026-09-06

### Added

- The puzzle editor now shows fixed, translatable messages for validation and image-import errors (an empty puzzle name or filename, an unreadable or unsupported image file) instead of raw, English-only, sometimes browser-generated error text.

## [2.10.1] - 2026-09-05

### Fixed

- The message shown after checking a partially-wrong puzzle no longer says wrong cells were "fixed" — it now says they were cleared, since the game only removes mistakes and never fills in the correct answer for the player.

## [2.10.0] - 2026-09-05

### Added

- 26 new black-and-white puzzles converted from the reMarkable nonogram generator: Apple, Balloons, Boat, Candle, Car, Cat, Chameleon, Cow, Crab, Crocodile, Dragon, Duck, Earth, Elephant, Head, Horse, House, Lion, Mushroom, Panda, Pear, Pig, Sitting Cat, Squirrel, Watermelon, and Whale.
- If a device can't save puzzle progress (storage full, private browsing), the player now sees a dismissible warning the first time it happens, instead of silently losing their progress with no notice.

### Fixed

- The daily orphaned-preview sweep failed on every scheduled run (`fatal: not a git repository`): its git working directory was never initialized before use. Both the sweep and the PR-preview publish step now initialize it correctly.
- The library, puzzle, and puzzle-editor pages no longer visibly redraw right after loading: their toolbar, filters, pagination, language switcher, and (on the editor) palette and canvas now appear in their final shape immediately, instead of popping in a moment later.

### Changed

- A failure setting up one on-page control (e.g. the puzzle toolbar, or the editor's palette) no longer breaks the rest of that page — every other control keeps working.

## [2.9.0] - 2026-08-24

### Added

- A puzzle preview left behind by a pull request that closed outside the normal flow (a failed cleanup run, an admin-closed PR) is now automatically swept away by a daily backstop job, independent of the existing per-PR cleanup.

## [2.8.0] - 2026-08-24

### Added

- A redesigned "Eiffel Tower" puzzle is back in the library — fully solvable by logical deduction alone, unlike the earlier version that was removed for requiring guesswork.

## [2.7.0] - 2026-08-23

### Added

- The puzzle editor can now import a local image (PNG/JPG): it's fitted to the current grid size, reduced to a chosen number of colors, and pixels close to a chosen background color become blank — giving a starting grid to refine by hand instead of drawing everything from scratch.

## [2.6.0] - 2026-08-23

### Added

- The site now has a favicon, shown in the browser tab on every page.

## [2.5.0] - 2026-08-23

### Added

- The puzzle library page now shows at most 25 puzzles per page, with Previous/Next controls to move between pages — kept in sync with the size/color filters, and hidden entirely when the library is small enough to fit on one page.

## [2.4.0] - 2026-08-23

### Added

- The puzzle library page now has a footer with a link explaining how to contribute a puzzle on GitHub, next to the existing "Create a puzzle" link.

### Changed

- The language switcher is now only available on the puzzle library page, moved into its new footer — the individual puzzle pages still remember and apply your chosen language, but no longer have their own switcher.

## [2.3.0] - 2026-08-23

### Added

- Every pull request adding or changing a puzzle now gets a small preview picture of it posted as a comment, so a submission can be checked at a glance without pulling the branch — and the preview is cleaned up automatically once the pull request closes.

## [2.2.0] - 2026-08-20

### Added

- Pull requests now get an automated pass/fail check (lint, tests, and a full site build) before merging, instead of only finding out after.

## [2.1.0] - 2026-08-20

### Added

- A new "Create a puzzle" page (linked from the library) lets a contributor set a grid size, build a color palette, paint the solution cell by cell, name the puzzle, and export a ready-to-submit puzzle file — no more hand-writing the JSON by hand.

## [2.0.0] - 2026-08-20

### Added

- New puzzles are now checked automatically: a submission is rejected if it can't be solved without guessing, or if it's an exact duplicate of a puzzle already in the library.

### Removed

- Two puzzles that were exact duplicates of existing ones, and the "Eiffel Tower" puzzle (which turned out to require guessing to solve), were removed from the library; a fair redesign of the Eiffel Tower puzzle is planned.

## [1.14.0] - 2026-08-19

### Added

- A new CONTRIBUTING.md explains how to submit a puzzle, and pull requests now get a checklist covering the puzzle filename, palette, required checks, and licensing.

## [1.13.0] - 2026-08-19

### Added

- The library page now has filter controls to narrow the puzzle list by size (small/medium/large) and by color type (monochrome only or multi-color only).

## [1.12.0] - 2026-08-19

### Added

- Each puzzle's card in the library now shows a top stripe reflecting its own colors: solid black for a single-color puzzle, or one segment per color for a multi-color puzzle, instead of a decorative color cycling by position.

### Fixed

- The puzzle grid is now centered on the page instead of sticking to the left with empty space on the right whenever it's smaller than the screen.

## [1.11.0] - 2026-08-19

### Added

- On a multi-color puzzle, the "Fill" button and the color swatches now sit inside their own small boxed group in the toolbar, showing at a glance that picking a color is part of the fill action.
- The "Check" button now actually helps: it clears any cell you got wrong (a wrong color, an unnecessary fill, or a wrongly crossed-out cell) so you can redo it, and tells you when it found and fixed a mistake.
- A new demo puzzle, "Target", shows off what the game looks like with four colors instead of just one or two.
- A "Back to puzzle list" link now sits at the top of every puzzle page, next to the language switcher, so players can return to the library at any time without using the browser's back button.
- Solving a puzzle now reveals a small picture of it right on the library page, next to its name — a little trophy that stays hidden until you've actually earned it by solving that puzzle.

### Changed

- The library and puzzle pages have a more polished look: proper spacing around text and controls, puzzles in the library listed as clearly separated cards, the play toolbar's buttons grouped with visible spacing, and the puzzle result message shown in a highlighted box — all accented with a muted blue that works well on the Kindle Colorsoft's color e-ink screen.
- The "Solved" badge on the library page now looks like a little stamp instead of plain text.
- Both pages now share a bolder "cabinet" look: a bordered, shadowed panel, a title with a printed-style double shadow, a row of small decorative dots, and three accent colors used with intent — amber for leaving/active controls, magenta for the main Check action, and teal for "completed" (shared by the win message and the Solved stamp, so the two visibly connect). The puzzle grid itself keeps its own plain, high-contrast frame — it stays the calmest, easiest to read part of the page.
- Pushed the new look further: buttons and the back-link now have a chunky, pressable look, corners are rounded throughout, each puzzle in the library is its own separate card with a colored top stripe, and the puzzle page's controls sit inside their own bordered, shadowed panel above the board.

### Fixed

- Wide puzzles (like "Doctor") no longer get cut off on the side on narrow screens — the grid now shrinks enough to always show every cell and every clue.
- The puzzle page's header no longer eats so much vertical space — the title and the "Back to puzzle list"/language controls now share one row instead of two, and the purely decorative dots were dropped from this page, leaving noticeably more room for the puzzle itself.
- The "Back to puzzle list" button is now a compact arrow icon next to the title instead of a wide text button — still easy to tap, and still announced by its full name to screen readers.
- Puzzle names in the library now use the site's label typeface and are properly centered in their row — previously they sat closer to the top of the row than the middle. A very long auto-generated name is now trimmed with "…" instead of throwing off the row's height.
- Puzzle names in the library no longer show the browser's default link underline or turn a different color once you've visited that puzzle.

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

[Unreleased]: https://github.com/neolao/kindle-nonograms/compare/v2.20.0...HEAD
[2.20.0]: https://github.com/neolao/kindle-nonograms/compare/v2.19.0...v2.20.0
[2.19.0]: https://github.com/neolao/kindle-nonograms/compare/v2.18.0...v2.19.0
[2.18.0]: https://github.com/neolao/kindle-nonograms/compare/v2.17.0...v2.18.0
[2.17.0]: https://github.com/neolao/kindle-nonograms/compare/v2.16.0...v2.17.0
[2.16.0]: https://github.com/neolao/kindle-nonograms/compare/v2.15.0...v2.16.0
[2.15.0]: https://github.com/neolao/kindle-nonograms/compare/v2.14.0...v2.15.0
[2.14.0]: https://github.com/neolao/kindle-nonograms/compare/v2.13.1...v2.14.0
[2.13.1]: https://github.com/neolao/kindle-nonograms/compare/v2.13.0...v2.13.1
[2.13.0]: https://github.com/neolao/kindle-nonograms/compare/v2.12.0...v2.13.0
[2.12.0]: https://github.com/neolao/kindle-nonograms/compare/v2.11.3...v2.12.0
[2.11.3]: https://github.com/neolao/kindle-nonograms/compare/v2.11.2...v2.11.3
[2.11.2]: https://github.com/neolao/kindle-nonograms/compare/v2.11.1...v2.11.2
[2.11.1]: https://github.com/neolao/kindle-nonograms/compare/v2.11.0...v2.11.1
[2.11.0]: https://github.com/neolao/kindle-nonograms/compare/v2.10.1...v2.11.0
[2.10.1]: https://github.com/neolao/kindle-nonograms/compare/v2.10.0...v2.10.1
[2.10.0]: https://github.com/neolao/kindle-nonograms/compare/v2.9.0...v2.10.0
[2.9.0]: https://github.com/neolao/kindle-nonograms/compare/v2.8.0...v2.9.0
[2.8.0]: https://github.com/neolao/kindle-nonograms/compare/v2.7.0...v2.8.0
[2.7.0]: https://github.com/neolao/kindle-nonograms/compare/v2.6.0...v2.7.0
[2.6.0]: https://github.com/neolao/kindle-nonograms/compare/v2.5.0...v2.6.0
[2.5.0]: https://github.com/neolao/kindle-nonograms/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/neolao/kindle-nonograms/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/neolao/kindle-nonograms/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/neolao/kindle-nonograms/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/neolao/kindle-nonograms/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/neolao/kindle-nonograms/compare/v1.14.0...v2.0.0
[1.14.0]: https://github.com/neolao/kindle-nonograms/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/neolao/kindle-nonograms/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/neolao/kindle-nonograms/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/neolao/kindle-nonograms/compare/v1.10.0...v1.11.0
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
