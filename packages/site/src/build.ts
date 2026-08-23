import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build as buildClientBundle } from "vite";
import { loadPuzzleSources } from "./discoverPuzzles.js";
import { renderEditorPage } from "./renderEditorPage.js";
import { renderLibraryPage } from "./renderLibraryPage.js";
import { renderPuzzlePage } from "./renderPuzzlePage.js";

const CLIENT_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "client",
);

export interface BuildSiteOptions {
  puzzlesDir: string;
  outDir: string;
}

/**
 * Builds the full static site into `outDir`: the shared client bundle
 * (`assets/main.js`), the home page (`index.html`), and one page per
 * puzzle discovered and validated from `puzzlesDir`
 * (`puzzles/<id>/index.html`).
 *
 * Puzzle discovery/validation always runs first, before anything is
 * written, so an invalid puzzle file fails the whole build without
 * touching `outDir` at all. `outDir` is then wiped and recreated by this
 * function itself (not left to Vite's own `emptyOutDir`) so a puzzle
 * removed from `puzzlesDir` also disappears from a rebuilt output — see
 * .vibe/decisions/007-static-site-build-orchestrator-design.md.
 */
export async function buildSite({
  puzzlesDir,
  outDir,
}: BuildSiteOptions): Promise<void> {
  const puzzles = await loadPuzzleSources(puzzlesDir);

  const absOutDir = resolve(outDir);
  await rm(absOutDir, { recursive: true, force: true });
  await mkdir(absOutDir, { recursive: true });

  await buildClientBundle({
    configFile: join(CLIENT_ROOT, "vite.config.ts"),
    logLevel: "warn",
    // Vite's default `publicDir` ("<root>/public") resolves against `root`,
    // which itself defaults to `process.cwd()` — not this config file's own
    // directory. Since this function runs from the monorepo root, leaving
    // `publicDir` unset would silently copy nothing (there's no `public/`
    // folder there), dropping `packages/client/public/favicon.svg` from
    // every build. Set explicitly so the static assets in that folder
    // always land at the site root regardless of the caller's cwd.
    publicDir: join(CLIENT_ROOT, "public"),
    build: {
      outDir: absOutDir,
      emptyOutDir: false, // already cleaned above — the single source of truth for a fresh outDir
      rollupOptions: {
        input: join(CLIENT_ROOT, "src", "main.ts"),
        output: {
          // Fixed, unhashed: the generated pages below reference this exact
          // path and are rendered separately from the bundle build, so they
          // have no way to learn a content hash Vite would otherwise pick.
          entryFileNames: "assets/main.js",
        },
      },
    },
  });

  const assetVersion = await hashFile(join(absOutDir, "assets", "main.js"));

  await writeFile(
    join(absOutDir, "index.html"),
    renderLibraryPage(puzzles, assetVersion),
  );

  const editorDir = join(absOutDir, "editor");
  await mkdir(editorDir, { recursive: true });
  await writeFile(
    join(editorDir, "index.html"),
    renderEditorPage(assetVersion),
  );

  for (const puzzle of puzzles) {
    const puzzleDir = join(absOutDir, "puzzles", puzzle.id);
    await mkdir(puzzleDir, { recursive: true });
    await writeFile(
      join(puzzleDir, "index.html"),
      renderPuzzlePage(puzzle, assetVersion),
    );
  }
}

async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}
