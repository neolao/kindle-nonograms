import { basename, extname, join } from "node:path";
import { loadPuzzleFile } from "./discoverPuzzles.js";
import { renderPuzzlePreviewPng } from "./renderPuzzlePreview.js";

export interface RenderedPreviewImage {
  id: string;
  png: Buffer;
}

export interface RenderPreviewsResult {
  manifest: { puzzles: string[] };
  images: RenderedPreviewImage[];
}

/**
 * Renders one preview PNG per requested puzzle file — the low-privilege
 * half of the PR-preview pipeline, run from `pr-check.yml`'s own `validate`
 * job against exactly the `data/puzzles/*.json` files a PR's diff names
 * (never the whole directory), so it only ever touches content the PR
 * itself just changed. Reuses `discoverPuzzles.ts`'s own file loader, so a
 * malformed file fails the same descriptive way it would at build time —
 * this step is gated on the build already having passed, so that should
 * never actually happen here, but it's the same fail-fast behavior either
 * way, not a silently-skipped file.
 */
export async function renderPreviewsForFiles(
  puzzlesDir: string,
  filenames: string[],
): Promise<RenderPreviewsResult> {
  const images: RenderedPreviewImage[] = [];

  for (const filename of filenames) {
    const id = basename(filename, extname(filename));
    const puzzle = await loadPuzzleFile(join(puzzlesDir, filename), id);
    images.push({ id, png: renderPuzzlePreviewPng(puzzle) });
  }

  return {
    manifest: { puzzles: images.map((image) => image.id) },
    images,
  };
}
