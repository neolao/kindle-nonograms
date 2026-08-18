# Kindle Nonograms

A nonogram (picross) puzzle game designed to be played directly in the built-in web browser of a Kindle e-reader.

<!-- vibe:begin:features -->
- Puzzles support any number of colors, not just black and white.
- A puzzle's clues (the numbers shown per row and column) are calculated automatically from its solution, so puzzle data only needs to store the solution itself.
- Player progress on a puzzle can be tracked and checked to confirm it was solved correctly.
- Player progress is saved in the browser, so it survives closing and reopening the page.
- Puzzles exported from the reMarkable nonogram generator project can be converted into this project's puzzle format.
- 18 black-and-white puzzles converted from the reMarkable nonogram generator are included in the puzzle library.
- Two small demo puzzles — one black-and-white, one multi-color — are included, ready to try the whole game end to end right away.
- All puzzle files, whether in the game's own format or exported from the reMarkable nonogram generator, are automatically discovered and validated when the site is built.
- Each puzzle has its own page showing its color-coded clues and an empty grid, viewable even without loading any interactive code.
- The site has a home page listing every puzzle with its size and a link to play it.
- Puzzles are playable right on the page: tap a cell to fill it, switch to marking mode to cross out cells you're sure are empty, and get a message once you've solved it.
- A filled cell now shows as a plain solid block of its color, matching the classic look of a solved nonogram.
- The home page now shows which puzzles you've already solved.
- The whole site — every puzzle page, the home page, and the interactive bundle — can now be built with a single command and previewed locally before publishing.
- The game is automatically built and published online whenever a change is pushed.
- The app's language can be switched between English and Français from a dropdown on the puzzle library and on each puzzle page. It defaults to your browser's language and remembers your choice for next time.
- A "Check" button on the puzzle page lets you find out at any time whether your grid is correctly solved, on top of the message that already appears automatically once you solve it.
- The library and puzzle pages now share a consistent look — fonts, colors, spacing, and button styling.
- The puzzle grid automatically resizes to fit your screen, so you never have to scroll to see it in full.
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
