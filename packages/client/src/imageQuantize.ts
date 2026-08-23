/**
 * Pure, DOM-free image downsampling and color quantization for the puzzle
 * editor's "import image" action (see .vibe/backlog/done/
 * 030-image-import-for-the-puzzle-editor.md). Deliberately dependency-free
 * (no image-processing library), matching the project's existing
 * "hand-roll a narrow, well-defined format/algorithm against nothing but
 * built-ins" style (see `renderPuzzlePreview.ts`'s own PNG encoder). Reading
 * an actual image file into an {@link ImageLike} is DOM-only glue kept in a
 * separate module (`decodeImageFile.ts`) — everything here operates on
 * already-decoded pixel data so it's fully unit-testable without a real
 * `<canvas>`.
 */

/** An RGB color, each channel 0–255. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * A decoded image's raw pixel data — the same shape as the DOM's own
 * `ImageData` (row-major, 4 bytes per pixel: R, G, B, A), so a real
 * `ImageData` can be passed here directly with no conversion.
 */
export interface ImageLike {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function blockRange(
  targetIndex: number,
  targetSize: number,
  sourceSize: number,
): { start: number; end: number } {
  const start = Math.floor((targetIndex * sourceSize) / targetSize);
  const end = Math.max(
    start + 1,
    Math.floor(((targetIndex + 1) * sourceSize) / targetSize),
  );
  return { start, end: Math.min(end, sourceSize) };
}

/**
 * Downsamples `image` to `targetWidth` x `targetHeight` by block-averaging:
 * every target cell is the mean color of the rectangular block of source
 * pixels it covers, so a single noisy source pixel can't dominate a whole
 * cell the way nearest-neighbor sampling would. Alpha is ignored (treated
 * as fully opaque) — out of scope for a puzzle's solid-color cells.
 * Degrades gracefully (returns an empty grid, never throws) for a
 * zero-or-negative target size.
 */
export function downsampleImage(
  image: ImageLike,
  targetWidth: number,
  targetHeight: number,
): RGB[][] {
  const grid: RGB[][] = [];

  for (let ty = 0; ty < targetHeight; ty++) {
    const { start: y0, end: y1 } = blockRange(ty, targetHeight, image.height);
    const row: RGB[] = [];

    for (let tx = 0; tx < targetWidth; tx++) {
      const { start: x0, end: x1 } = blockRange(tx, targetWidth, image.width);
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * image.width + x) * 4;
          r += image.data[i];
          g += image.data[i + 1];
          b += image.data[i + 2];
          count++;
        }
      }

      row.push(
        count === 0
          ? { r: 0, g: 0, b: 0 }
          : {
              r: Math.round(r / count),
              g: Math.round(g / count),
              b: Math.round(b / count),
            },
      );
    }

    grid.push(row);
  }

  return grid;
}

type Channel = "r" | "g" | "b";
const CHANNELS: readonly Channel[] = ["r", "g", "b"];

function channelRange(pixels: RGB[], channel: Channel): number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const pixel of pixels) {
    const value = pixel[channel];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return max - min;
}

function widestChannel(pixels: RGB[]): { channel: Channel; range: number } {
  let best: { channel: Channel; range: number } = { channel: "r", range: -1 };
  for (const channel of CHANNELS) {
    const range = channelRange(pixels, channel);
    if (range > best.range) {
      best = { channel, range };
    }
  }
  return best;
}

function averageColor(pixels: RGB[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const pixel of pixels) {
    r += pixel.r;
    g += pixel.g;
    b += pixel.b;
  }
  const n = pixels.length;
  return {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
  };
}

/**
 * Splits `bucket` in two along `channel`, at the index closest to the
 * median that still falls on a genuine value boundary — never inside a run
 * of pixels sharing the exact same channel value. A naive index-median
 * split can separate two identically-colored pixels into different
 * buckets purely because of where they land in sort order, which would
 * inflate the final palette with duplicate entries (defeating "fewer
 * distinct colors than requested" collapsing to one entry per color).
 */
function splitBucket(bucket: RGB[], channel: Channel): [RGB[], RGB[]] {
  const sorted = [...bucket].sort((a, b) => a[channel] - b[channel]);
  const naiveMid = Math.floor(sorted.length / 2);

  let boundary = naiveMid;
  while (
    boundary < sorted.length &&
    sorted[boundary][channel] === sorted[boundary - 1][channel]
  ) {
    boundary++;
  }

  if (boundary >= sorted.length) {
    // The run from naiveMid onward was uniform all the way to the end —
    // the real value transition must be earlier (the bucket isn't uniform
    // overall, since callers only split a bucket with a nonzero channel
    // range), so search backward instead.
    boundary = naiveMid;
    while (
      boundary > 0 &&
      sorted[boundary][channel] === sorted[boundary - 1][channel]
    ) {
      boundary--;
    }
  }

  return [sorted.slice(0, boundary), sorted.slice(boundary)];
}

function nearestPaletteIndex(pixel: RGB, palette: RGB[]): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];
    const distance =
      (pixel.r - color.r) ** 2 +
      (pixel.g - color.g) ** 2 +
      (pixel.b - color.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Reduces `pixels` to at most `paletteSize` representative colors via
 * median-cut: starting from one bucket holding every pixel, repeatedly
 * splits the largest still-splittable bucket (more than one distinct
 * color) along its widest color channel until there are `paletteSize`
 * buckets or none are left to split — so an image with fewer distinct
 * colors than requested naturally yields a smaller palette instead of
 * padding it with duplicates. Each pixel is then assigned to its nearest
 * palette color by Euclidean distance. `paletteSize <= 0` is treated as 1
 * (a non-empty pixel list always needs at least one color); an empty
 * `pixels` list returns an empty result rather than throwing.
 */
export function quantizeColors(
  pixels: RGB[],
  paletteSize: number,
): { palette: RGB[]; indices: number[] } {
  if (pixels.length === 0) {
    return { palette: [], indices: [] };
  }

  const effectivePaletteSize = Math.max(1, paletteSize);
  const buckets: RGB[][] = [pixels.slice()];

  while (buckets.length < effectivePaletteSize) {
    let splitIndex = -1;
    let splitChannel: Channel = "r";
    let bestCount = -1;

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (bucket.length <= 1) continue;

      const { channel, range } = widestChannel(bucket);
      if (range === 0) continue; // every pixel already identical

      if (bucket.length > bestCount) {
        bestCount = bucket.length;
        splitIndex = i;
        splitChannel = channel;
      }
    }

    if (splitIndex === -1) break; // nothing left worth splitting

    const [left, right] = splitBucket(buckets[splitIndex], splitChannel);
    buckets.splice(splitIndex, 1, left, right);
  }

  const palette = buckets.map(averageColor);
  const indices = pixels.map((pixel) => nearestPaletteIndex(pixel, palette));

  return { palette, indices };
}

function hexToRgb(hex: string): RGB {
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16) || 0,
    g: Number.parseInt(normalized.slice(3, 5), 16) || 0,
    b: Number.parseInt(normalized.slice(5, 7), 16) || 0,
  };
}

function rgbToHex(color: RGB): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function colorDistanceSquared(a: RGB, b: RGB): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

/** How close (in RGB distance) a downsampled cell must be to the requested
 * background color to be treated as background rather than a color. Block-
 * averaging almost never reproduces the background exactly, so an exact
 * equality check would leave stray non-blank cells around every edge. */
const DEFAULT_BACKGROUND_TOLERANCE = 24;

export interface BuildImportedGridOptions {
  targetWidth: number;
  targetHeight: number;
  paletteSize: number;
  /** `#rgb` or `#rrggbb`. */
  backgroundColor: string;
  backgroundTolerance?: number;
}

export interface ImportedGrid {
  palette: string[];
  cells: (number | null)[][];
}

/**
 * The editor's full "import image" pipeline: downsamples `image` to the
 * requested grid size, treats every downsampled cell within
 * `backgroundTolerance` of `backgroundColor` as background (mapped to
 * `null`, never spending palette budget on it — matching how a hand-drawn
 * puzzle treats empty space) rather than as a color, and quantizes the
 * remaining foreground cells to at most `paletteSize` colors. Degrades
 * gracefully to an empty palette/grid for a zero-size target or an image
 * that's entirely background, never throwing.
 */
export function buildImportedGrid(
  image: ImageLike,
  options: BuildImportedGridOptions,
): ImportedGrid {
  const { targetWidth, targetHeight, paletteSize, backgroundColor } = options;
  const tolerance = options.backgroundTolerance ?? DEFAULT_BACKGROUND_TOLERANCE;
  const toleranceSquared = tolerance * tolerance;
  const backgroundRgb = hexToRgb(backgroundColor);

  const grid = downsampleImage(image, targetWidth, targetHeight);
  const isBackground = grid.map((row) =>
    row.map(
      (color) => colorDistanceSquared(color, backgroundRgb) <= toleranceSquared,
    ),
  );

  const foregroundPixels: RGB[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (!isBackground[y][x]) {
        foregroundPixels.push(grid[y][x]);
      }
    }
  }

  const { palette, indices } = quantizeColors(foregroundPixels, paletteSize);

  const cells: (number | null)[][] = [];
  let cursor = 0;
  for (let y = 0; y < grid.length; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < grid[y].length; x++) {
      if (isBackground[y][x]) {
        row.push(null);
      } else {
        row.push(indices[cursor]);
        cursor++;
      }
    }
    cells.push(row);
  }

  return { palette: palette.map(rgbToHex), cells };
}
