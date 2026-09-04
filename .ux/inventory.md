# UI inventory — Kindle Nonograms

> Written by `/ux:discover`, refreshed by `/ux:implement`. Describes the UI as it *is*, not as it should be.

## UI stack

- **Framework / UI layer:** vanilla TypeScript. Pages are pre-rendered server-side as literal HTML strings (`packages/site/src/render*.ts`) and hydrated client-side by matching `packages/client/src/hydrate*.ts` modules — no component framework (React/Vue/etc.).
- **Component library / design system:** none off-the-shelf; an in-house "cabinet" system defined as TS token constants (`packages/site/src/theme.ts`) consumed by a single shared CSS string builder (`packages/site/src/sharedStyles.ts`).
- **Styling approach:** literal CSS strings interpolated with token constants at build time — deliberately not CSS custom properties (`var()`), because Kindle's old WebKit support is uncertain.
- **UI state management:** none — plain module-level state objects per page (e.g. `EditorState` in `hydrateEditorPage.ts`), mutated directly and re-rendered imperatively.
- **Shared UI defaults:** `packages/shared/src/uiDefaults.ts` centralizes the one set of "default" values both the site generator and the client hydration bundle must agree on (library page size, the play page's starting mode/color, the editor's starting size/palette/mode), so the two can never silently drift — see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`.
- **Routing / navigation:** static file routing — each puzzle and the editor is its own pre-built directory (`/puzzles/<id>/`, `/editor/`), linked with plain `<a>` tags.
- **i18n:** custom, key-based. Strings and `translate(locale, key)` live in `packages/shared/src/i18n.ts`; the client resolves the effective locale (cookie → `navigator.language` → default) and re-applies translations to every `[data-i18n]` element in `packages/client/src/i18n.ts`. Server-rendered HTML also carries `data-i18n="namespace.key"` attributes for the client to match against.
- **UI testing:** no dedicated UI/e2e framework (no Playwright/Testing Library in the repo). Vitest + jsdom unit tests colocated with each `hydrate*.ts` module cover hydration logic, not full visual states.

## Design tokens

| Token family | Source file | Values / scale |
|---|---|---|
| Colors | `packages/site/src/theme.ts` (`COLORS`) | `text` #111111, `muted` #555555, `border`/`focusOutline` #000000, `paper` #f5f2fb, `panel` #ffffff, `panelEdge` #ddd4ef, `line` #e4dcf3, plus three fixed-role accents: `amber` #a85f00 (navigate away / active toggle), `magenta` #b0165c (primary in-puzzle action), `teal` #0b7a68 ("completed") — each with a `*Soft` tint |
| Typography | `packages/site/src/theme.ts` (`FONT_STACK`, `LABEL_FONT_STACK`) | Body: `"Helvetica Neue", Helvetica, Arial, sans-serif`. Headings/labels/buttons: a monospace system stack (`ui-monospace`, `SF Mono`, …). No numeric type scale — sizes set ad hoc per selector (e.g. `h1 { font-size:1.4em }`) |
| Spacing | `packages/site/src/theme.ts` (`SPACING_PX`) | `xs` 4px, `sm` 8px, `md` 12px, `lg` 16px |
| Radii / borders | `packages/site/src/theme.ts` (`BORDER_WIDTH`, `BORDER_RADIUS_PX`) | Border widths `thin` 1px, `medium` 2px, `thick` 3px; corner radius fixed at 4px everywhere |
| Breakpoints | — | None found — layout is fluid/flex-wrap based, no `@media` breakpoints in `sharedStyles.ts` |
| Motion | — | None by design (e-ink constraint) — every state change is a static style swap, no transitions/animations |
| Theming (dark mode…) | — | None — single fixed light "cabinet" palette, no dark mode |
| Tap targets | `packages/site/src/theme.ts` (`MIN_TAP_TARGET_PX`) | 44px minimum for buttons and the language selector |

## Screens / views

| Screen | Entry point (route / menu / panel) | Source | Purpose | Capture |
|---|---|---|---|---|
| Library | `/` (home) | `packages/site/src/renderLibraryPage.ts`, hydrated by `hydrateLibraryPage.ts` | List every puzzle (size/color filters, pagination of 25, solved badges), switch language, link to the editor and to contribution docs | `.ux/captures/audit-2026-09-04/library-desktop.png`, `library-kindle.png`, `library-filter-empty.png`; `.ux/captures/001-frozen-chrome-before-hydration/no-js-library.png`, `js-library-page2.png` |
| Puzzle / play page | `/puzzles/<id>/` (from a library card) | `packages/site/src/renderPuzzlePage.ts`, hydrated by `hydratePlayPage.ts` | Show a puzzle's color-coded clues and grid; fill/cross/check it; show a win banner | `.ux/captures/audit-2026-09-04/puzzle-demo-cross-desktop.png`, `puzzle-demo-cross-kindle.png`, `puzzle-demo-quad-desktop.png`, `puzzle-demo-cross-solved.png`; `.ux/captures/001-frozen-chrome-before-hydration/no-js-puzzle.png`, `js-puzzle-already-solved-reload.png` |
| Editor | `/editor/` (linked from the library footer) | `packages/site/src/renderEditorPage.ts`, hydrated by `hydrateEditorPage.ts` | Set a grid size, build a palette, paint a solution (or import an image), name it and export a puzzle JSON file | `.ux/captures/audit-2026-09-04/editor-desktop.png`, `editor-kindle.png`; `.ux/captures/001-frozen-chrome-before-hydration/no-js-editor.png`, `js-editor-painted.png` |

## Reusable components

| Component | Source | Used for | States / variants supported |
|---|---|---|---|
| `.panel` cabinet wrapper | `sharedStyles.ts` | Bordered/shadowed frame around each page's content | Static only |
| `button` / `.back-link` | `sharedStyles.ts` | All actions (mode toggles, check, swatches, back navigation) | default, `:focus`, `:active` (pressed look), `[aria-pressed="true"]` |
| `.fill-color-group` + swatch buttons | `renderPuzzlePage.ts` (default markup), `hydratePlayPage.ts` (behavior) | Choosing the active paint color on multi-color puzzles | active (`aria-pressed` + checkmark) / inactive — color conveyed only visually, no accessible color name |
| `[data-role="win-banner"]` | `renderPuzzlePage.ts` (default markup) / `hydratePlayPage.ts` (behavior) / `sharedStyles.ts` | Announcing a solved puzzle | hidden by default, baked into the static page; shown either by a pre-paint check (already solved) or after a successful check; no "wrong" banner variant (wrong cells are silently cleared instead) |
| `.language-switcher` | `renderLibraryPage.ts` (default markup) / `hydrateLibraryPage.ts` (behavior) | Switching EN/FR | Present on library and puzzle pages; **absent on the editor page**. English-selected by default in the static HTML, corrected to the resolved locale synchronously at the start of hydration |
| `.section-label` | `sharedStyles.ts` | Grouping editor sections (grid size, import, palette, canvas, name/export) | Static only |
| Puzzle card | `renderLibraryPage.ts` | One row per puzzle in the library | unsolved (placeholder "?" box) / solved (thumbnail image + stamp) |
| Pagination controls | `renderLibraryPage.ts` (default markup, page-1 slice + total pages computed at build time) / `hydrateLibraryPage.ts` (behavior) | Paging through >25 puzzles | Previous/Next, disabled at the first/last page |

## Interaction patterns in use

- Every page's interactive chrome (library filters/pagination/language switcher, the puzzle page's toolbar/win banner, the editor's palette/toolbar/canvas) is baked into the static HTML in its true default shape at build time; hydration locates it by `data-role` and attaches behavior rather than constructing it from scratch — see `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`. The one exception, deliberately: the editor's palette/toolbar/canvas *also* get rebuilt from scratch on any actual state change (resize, palette edit, paint, import) via `render()` — only the very first hydration pass attaches to the existing default instead of rebuilding it.
- Filling/marking a puzzle cell is a single `click` handler on the whole grid (`hydratePlayPage.ts`) — works for mouse and touch, but the grid itself has no `tabindex`/keyboard handling at all (confirmed by tabbing through the puzzle page: focus goes back-link → mode-fill → mode-cross → check → back to `<body>`, skipping the grid entirely).
- Wrong cells are never flagged individually — "Check" silently clears any incorrectly filled cell, then shows the win banner only once every cell is right.
- Progress is saved to `localStorage` per puzzle and silently restored on revisit; language choice is saved to a cookie and silently restored on revisit for the library and puzzle pages.
- Empty results (library filters matching nothing) keep the filter controls visible and show a plain text message — no dead end.
- Each hydration script's control-setup steps (toolbar, progress restore, palette, canvas fit) run in their own `try/catch`, so a failure wiring one control can't prevent its siblings on the same page from becoming interactive.

## Known gaps

- The editor page (`renderEditorPage.ts` / `hydrateEditorPage.ts`) is entirely un-internationalized: its HTML carries `data-i18n` attributes but `hydrateEditorPage.ts` never imports the i18n module, and there is no language switcher on the page at all — a French-locale player lands on an all-English page. See `.ux/audit/2026-09-04.md` F5.
- Two bundled puzzles have their raw UUID as their display `name` instead of a human-readable title (`data/puzzles/24386c66-cfb0-4f3f-bf67-392ad26fefe1.json`, `data/puzzles/772cc4e7-88d1-4c5f-b585-b43ad05553f5.json`), showing up verbatim in the library list.
- The puzzle grid (the core play interaction) has no keyboard support whatsoever — out of scope for this audit's prioritization (no accessibility target is declared) but recorded here for future reference.
- Color swatch buttons on multi-color puzzles have no accessible name conveying which color they represent (color is visual-only; the active one only gets a "✓" glyph).
- No numeric type scale or breakpoint system — sizes and responsive behavior are handled ad hoc per selector/flex-wrap rather than from a shared scale.
