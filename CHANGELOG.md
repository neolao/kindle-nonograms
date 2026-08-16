# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/neolao/kindle-nonograms/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/neolao/kindle-nonograms/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/neolao/kindle-nonograms/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/neolao/kindle-nonograms/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/neolao/kindle-nonograms/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/neolao/kindle-nonograms/releases/tag/v0.1.0
