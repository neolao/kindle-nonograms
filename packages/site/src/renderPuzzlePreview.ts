import { crc32, deflateSync } from "node:zlib";
import { type Puzzle, buildThumbnail } from "@kindle-nonograms/shared";

/** Strict `#rgb`/`#rrggbb` check — anything else falls back to black. */
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export interface RenderPreviewOptions {
  /** Pixel size of one solution cell in the rendered image. Default 8. */
  cellPx?: number;
  /**
   * Neither the source grid's width nor height is allowed to exceed this
   * before rendering — a puzzle beyond it is downsampled first (see
   * `buildThumbnail`), which is what actually caps the worst-case image
   * size regardless of what dimensions a submitted puzzle claims. Default
   * 40, i.e. an 8px cell caps the image at 320px on its longer side.
   */
  maxGridDimension?: number;
}

const DEFAULT_CELL_PX = 8;
const DEFAULT_MAX_GRID_DIMENSION = 40;

function parseHexColor(hex: string): [number, number, number] {
  if (!HEX_COLOR_PATTERN.test(hex)) {
    return [0, 0, 0];
  }

  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;

  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);

  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

/**
 * Encodes raw 8-bit RGBA pixel data as a PNG file, using only Node's
 * built-in `zlib` (no image/canvas dependency — see .vibe/backlog/done/
 * 025-automatic-puzzle-preview-on-pull-requests.md's own Notes on why).
 * Every scanline is emitted with filter type "None", the simplest valid
 * choice and the only one this encoder needs to support.
 */
function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: truecolor + alpha
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type: None
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdrData),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Renders a puzzle's solution grid to a PNG image: one solid `cellPx` x
 * `cellPx` block per cell, colored with its palette entry, fully
 * transparent for an empty (`null`) cell. A puzzle whose grid exceeds
 * `maxGridDimension` on either axis is downsampled first via `shared`'s
 * `buildThumbnail`, so the rendered image's worst-case pixel size is
 * bounded regardless of what `width`/`height` a submitted puzzle claims —
 * this project's own build-time validation (`createPuzzle`) already
 * guarantees `cells`' shape actually matches those claimed dimensions
 * before this ever runs, but the cap is what keeps a legitimately huge
 * puzzle from producing an oversized image.
 */
export function renderPuzzlePreviewPng(
  puzzle: Puzzle,
  options: RenderPreviewOptions = {},
): Buffer {
  const cellPx = options.cellPx ?? DEFAULT_CELL_PX;
  const maxGridDimension =
    options.maxGridDimension ?? DEFAULT_MAX_GRID_DIMENSION;

  const grid = buildThumbnail(puzzle, maxGridDimension);
  const gridHeight = grid.length;
  const gridWidth = gridHeight === 0 ? 0 : grid[0].length;

  const rgbaByColorIndex = puzzle.palette.map(
    (hex) => parseHexColor(hex) as [number, number, number],
  );

  const width = gridWidth * cellPx;
  const height = gridHeight * cellPx;
  const rgba = Buffer.alloc(width * height * 4);

  for (let gy = 0; gy < gridHeight; gy++) {
    for (let gx = 0; gx < gridWidth; gx++) {
      const colorIndex = grid[gy][gx];
      const [r, g, b] =
        colorIndex === null
          ? [0, 0, 0]
          : (rgbaByColorIndex[colorIndex] ?? [0, 0, 0]);
      const alpha = colorIndex === null ? 0 : 255;

      for (let py = 0; py < cellPx; py++) {
        const rowOffset = ((gy * cellPx + py) * width + gx * cellPx) * 4;
        for (let px = 0; px < cellPx; px++) {
          const i = rowOffset + px * 4;
          rgba[i] = r;
          rgba[i + 1] = g;
          rgba[i + 2] = b;
          rgba[i + 3] = alpha;
        }
      }
    }
  }

  return encodePng(width, height, rgba);
}
