/**
 * Downsamples a cell grid (a puzzle's solution, or a player's in-progress
 * marks converted to the same shape — see backlog item 071) to a small
 * preview grid, capped so neither dimension exceeds `maxDimension`. A
 * single scale factor (derived from the grid's longer side) applies to
 * both axes, so the thumbnail keeps the grid's true proportions instead of
 * being squashed into a square. Sampling is nearest-neighbor: each output
 * cell copies the source cell at its scaled-up position, never averaged or
 * blended — cheap, and exact enough for a small decorative preview.
 *
 * Never mutates `cells`. A grid already within the cap on both axes is
 * returned unchanged (scale 1), so a small grid keeps its full, exact
 * picture rather than being stretched or resampled for no reason.
 */
export function buildThumbnail(
  cells: (number | null)[][],
  maxDimension: number,
): (number | null)[][] {
  const height = cells.length;
  const width = cells[0]?.length ?? 0;
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
