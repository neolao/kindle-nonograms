# Kindle Nonograms

A nonogram (picross) puzzle game designed to be played directly in the built-in web browser of a Kindle e-reader.

<!-- vibe:begin:features -->
- Puzzles support any number of colors, not just black and white.
- A puzzle's clues (the numbers shown per row and column) are calculated automatically from its solution, so puzzle data only needs to store the solution itself.
- Player progress on a puzzle can be tracked and checked to confirm it was solved correctly.
- Player progress is saved in the browser, so it survives closing and reopening the page.
- Puzzles exported from the reMarkable nonogram generator project can be converted into this project's puzzle format.
- 18 black-and-white puzzles converted from the reMarkable nonogram generator are included in the puzzle library.
- Small demo puzzles — black-and-white, two colors, and four colors — are included, ready to try the whole game end to end right away.
- All puzzle files, whether in the game's own format or exported from the reMarkable nonogram generator, are automatically discovered and validated when the site is built.
- Each puzzle has its own page showing its color-coded clues and an empty grid, viewable even without loading any interactive code.
- The site has a home page listing every puzzle with its size and a link to play it.
- Puzzles are playable right on the page: tap a cell to fill it, switch to marking mode to cross out cells you're sure are empty, and get a message once you've solved it.
- A filled cell now shows as a plain solid block of its color, matching the classic look of a solved nonogram.
- The home page now shows which puzzles you've already solved.
- The whole site — every puzzle page, the home page, and the interactive bundle — can now be built with a single command and previewed locally before publishing.
- The game is automatically built and published online whenever a change is pushed.
- The app's language can be switched between English and Français from a dropdown on the puzzle library page. It defaults to your browser's language and remembers your choice for next time — puzzle pages honor that choice too.
- A "Check" button on the puzzle page tells you at any time whether your grid is correctly solved, and automatically clears any cell you got wrong so you can redo it.
- The library and puzzle pages now share a consistent look — fonts, colors, spacing, and button styling.
- The puzzle grid automatically resizes to fit your screen, so you never have to scroll to see it in full.
- A "Back to puzzle list" link on every puzzle page lets you return to the library at any time.
- The library and puzzle pages have a more polished look — puzzles listed as clearly separated cards, toolbar buttons grouped with visible spacing, and the puzzle result shown in a highlighted box, all accented with a muted blue.
- Solving a puzzle reveals a small picture of it on the library page — hidden until you've earned it, like a trophy.
- The "Solved" badge on the library page now looks like a little stamp.
- Both pages now share a bolder "cabinet" look — a bordered panel, a printed-style title, and three accent colors used with intent (leaving/active controls, the Check action, and "completed" — the win message and the Solved stamp now share the same color).
- Buttons and the back-link have a chunky, pressable look, corners are rounded throughout, each puzzle in the library is its own card, and the puzzle page's controls sit inside their own bordered panel above the board.
- Each puzzle's card in the library shows a top stripe in its own colors — solid black for a single-color puzzle, one segment per color for a multi-color one — so you can spot a puzzle's palette before opening it.
- On a multi-color puzzle, the "Fill" button and the color swatches sit inside their own small boxed group, showing at a glance that picking a color is part of the fill action.
- The library page has filter controls to narrow the puzzle list by size (small/medium/large) and by color type (monochrome only or multi-color only).
- New puzzles are now checked automatically: a submission is rejected if it can't be solved without guessing, or if it's an exact duplicate of a puzzle already in the library.
- A "Create a puzzle" page, linked from the library, lets you set a grid size, build a color palette, paint the solution cell by cell, name your puzzle, and export a ready-to-submit puzzle file.
- The library page now has a footer with the language switcher and a link explaining how to contribute a puzzle on GitHub.
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
**Prerequisites:** Node.js 22+ and npm.

```bash
npm install
```

Verify the install worked by running the test suite:

```bash
npm test
```
<!-- vibe:end:install -->

<!-- vibe:begin:usage -->
Run the frontend in development mode:

```bash
npm run dev:client
```

Build the full static site (every puzzle page, the home page, and the interactive bundle) into `dist/`:

```bash
npm run build
```

Preview the built site locally over HTTP:

```bash
npm run preview
```

Run the test suite:

```bash
npm test
```

Run the linter (auto-fixes style issues):

```bash
npm run lint
```
<!-- vibe:end:usage -->

## Documentation

<!-- vibe:begin:docs-index -->
- [docs/architecture.md](docs/architecture.md) — how the project's packages fit together
- [docs/configuration.md](docs/configuration.md) — build-time settings
<!-- vibe:end:docs-index -->

## Contributing

Want to submit a puzzle? See [CONTRIBUTING.md](CONTRIBUTING.md) for the puzzle format, where to put your file, and the checks to run before opening a PR.
