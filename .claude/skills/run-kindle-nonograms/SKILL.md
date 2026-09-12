---
name: run-kindle-nonograms
description: Build, run, and drive Kindle Nonograms (a static-site nonogram game). Use when asked to build the site, start/preview it, run its tests, take a screenshot of the library or a puzzle page, or otherwise interact with the running app.
---

Kindle Nonograms is a static site (no backend): `npm run build` renders every page into `dist/`, `npm run preview` serves that folder over HTTP, and it's driven with a headless Chromium — `chromium-cli` is not installed in this environment, so drive it with the bundled `driver.mjs` REPL instead (`.claude/skills/run-kindle-nonograms/driver.mjs`). All paths below are relative to the repo root.

## Prerequisites

Node.js 22+ and npm (already required by the project itself — see `CLAUDE.md`). No extra OS packages were needed in this container: a Chromium binary was already cached at `~/.cache/ms-playwright`, so Playwright's own launch worked with zero `apt-get` calls.

## Setup

Install the project's own dependencies once:

```bash
npm install
```

The driver needs Playwright, which is **not** a project dependency (kept out of the app's own `package.json`/lockfile on purpose). Install it scoped to the skill directory instead, so it never touches the root lockfile:

```bash
npm install --no-save --prefix .claude/skills/run-kindle-nonograms playwright
```

If the Chromium binary isn't already cached (it was in this container), fetch it explicitly:

```bash
npx --prefix .claude/skills/run-kindle-nonograms playwright install chromium
```

## Build

```bash
npm run build
```

Renders every page (library, each puzzle, the editor) into `dist/`.

## Run (agent path)

Serve the build, then pipe commands to `driver.mjs` over stdin:

```bash
(npm run preview -- --port 4173 --strictPort >/tmp/preview.log 2>&1 &)
timeout 20 bash -c 'until curl -sf http://localhost:4173/ >/dev/null; do sleep 0.5; done'
```

```bash
node .claude/skills/run-kindle-nonograms/driver.mjs <<'EOF'
nav http://localhost:4173/
wait-for text=Kindle Nonograms
screenshot
nav http://localhost:4173/puzzles/demo-target/index.html
wait-for .run
screenshot-element .grid-wrapper
eval document.querySelectorAll('.run').length
console-errors
quit
EOF
```

Stop the preview server when done: `lsof -ti:4173 -sTCP:LISTEN | xargs -r kill`.

Screenshots land in `./screenshots/` relative to wherever `driver.mjs` was invoked from, unless a command gives an explicit path (`screenshot mine.png`).

| command | what it does |
|---|---|
| `nav <url>` | navigate |
| `wait-for text=<substring>` | wait for an element containing that text |
| `wait-for <css-selector>` | wait for a selector to appear |
| `click <css-selector>` | click an element |
| `screenshot [path]` | full-page screenshot |
| `screenshot-element <selector> [path]` | screenshot of one element only |
| `eval <js-expression>` | run JS in the page, print the result as JSON |
| `console-errors` | print every console/page error seen so far |
| `quit` | close the browser and exit |

Every one of these commands was exercised against a live `npm run preview` server in this session, including a full library-page-to-puzzle-page walkthrough for both a 4-color puzzle (`demo-target`) and a single-color one (`demo-cross`).

## Run (human path)

`npm run preview` (after `npm run build`) then open `http://localhost:4173/` in a real browser; Ctrl-C to stop. `npm run dev:client` is **not** useful for viewing real pages — it serves only the client bundle's empty shell (`<div id="app"></div>`, no server-rendered library/puzzle markup), meant for the client package's own dev loop, not for browsing generated content.

## Test

```bash
npm test
```

577 tests across 42 files at last run. `npm run lint` (auto-fixes) should exit clean too.

---

## Gotchas

- **`npm run dev:client` looks like "the dev server" but serves an empty page.** It only hosts `packages/client`'s Vite dev bundle against a blank `<div id="app">` — there is no server-rendered puzzle/library HTML behind it. Always `npm run build` + `npm run preview` to see or drive real pages.
- **Playwright is deliberately not a project dependency.** Installing it at the repo root would touch `package-lock.json` for a tool only agent tooling needs (see the project's own note on keeping the lockfile in sync with real workspace deps). Scope it to the skill directory with `--prefix` instead; `driver.mjs` resolves it from there (and falls back to `/tmp/node_modules` and `~/.local/lib/node_modules`, useful if the container already provisions Playwright globally).
- **`vite preview` needs `--strictPort`** if you want to be sure which port it actually bound — otherwise it silently climbs to the next free port when the requested one is busy, and a hardcoded `nav` URL in the driver script would then hit the wrong server.

## Troubleshooting

- **`Cannot find module 'playwright'` when running `driver.mjs`**: Playwright isn't installed anywhere `driver.mjs` looks. Run the `npm install --no-save --prefix .claude/skills/run-kindle-nonograms playwright` command from Setup.
- **`driver.mjs` hangs on `nav`**: the preview server isn't up yet. Re-run the `timeout 20 bash -c 'until curl -sf ...'` wait loop from Run (agent path) before invoking the driver.
- **`curl: (7) Failed to connect` after starting `npm run preview`**: the port from a previous run is still bound. Free it first: `lsof -ti:4173 -sTCP:LISTEN | xargs -r kill`.
