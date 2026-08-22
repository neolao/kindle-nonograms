import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderPreviewsForFiles } from "./renderPreviewArtifact.js";

/**
 * Thin CLI wrapper around `renderPreviewsForFiles`, run by `pr-check.yml`'s
 * `validate` job: renders one PNG per added/changed puzzle file and writes
 * the render artifact (`pr-number.txt`, `manifest.json`, `<id>.png` per
 * puzzle) `actions/upload-artifact` then uploads whole. All the actual
 * rendering/validation logic lives in `renderPreviewArtifact.ts` and
 * `renderPuzzlePreview.ts`, both plain, independently testable Node code —
 * this file is only argv parsing and file writes.
 *
 * Usage: vite-node render-preview-artifact-cli.ts <puzzlesDir> <outDir> <prNumber> [file.json ...]
 */
async function main(): Promise<void> {
  const [puzzlesDir, outDir, prNumberArg, ...filenames] = process.argv.slice(2);

  if (!puzzlesDir || !outDir || !prNumberArg) {
    throw new Error(
      "Usage: render-preview-artifact-cli.ts <puzzlesDir> <outDir> <prNumber> [file.json ...]",
    );
  }

  const prNumber = Number(prNumberArg);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(`Invalid PR number: ${prNumberArg}`);
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "pr-number.txt"), String(prNumber));

  if (filenames.length === 0) {
    console.log("No changed puzzle files — nothing to render.");
    return;
  }

  const { manifest, images } = await renderPreviewsForFiles(
    puzzlesDir,
    filenames,
  );

  await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest));
  for (const image of images) {
    await writeFile(join(outDir, `${image.id}.png`), image.png);
  }

  console.log(
    `Rendered ${images.length} preview(s): ${manifest.puzzles.join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
