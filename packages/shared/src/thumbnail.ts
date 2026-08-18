import type { Puzzle } from "./puzzle.js";

/**
 * Downsamples a puzzle's solution grid to a small preview grid, capped so
 * neither dimension exceeds `maxDimension`. A single scale factor (derived
 * from the puzzle's longer side) applies to both axes, so the thumbnail
 * keeps the solution's true proportions instead of being squashed into a
 * square. Sampling is nearest-neighbor: each output cell copies the source
 * cell at its scaled-up position, never averaged or blended — cheap, and
 * exact enough for a small decorative preview.
 *
 * Never mutates `puzzle.cells`. A puzzle already within the cap on both
 * axes is returned unchanged (scale 1), so small puzzles keep their full,
 * exact picture rather than being stretched or resampled for no reason.
 */
export function buildThumbnail(
  puzzle: Puzzle,
  maxDimension: number,
): (number | null)[][] {
  const { width, height, cells } = puzzle;
  const scale = Math.max(1, Math.ceil(Math.max(width, height) / maxDimension));
  const outWidth = Math.ceil(width / scale);
  const outHeight = Math.ceil(height / scale);

  const thumbnail: (number | null)[][] = [];
  for (let oy = 0; oy < outHeight; oy++) {
    const sy = Math.min(oy * scale, height - 1);
    const row: (number | null)[] = [];
    for (let ox = 0; ox < outWidth; ox++) {
      const sx = Math.min(ox * scale, width - 1);
      row.push(cells[sy][sx]);
    }
    thumbnail.push(row);
  }

  return thumbnail;
}
