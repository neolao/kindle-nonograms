import { normalizeBackgroundHex } from "./contrastColor.js";
import { type Puzzle, createPuzzle } from "./puzzle.js";

/**
 * The plain export shape produced by the sibling `remarkable-nonogram-generator`
 * project: a boolean solution grid with no palette and no id.
 */
export interface BooleanGridExport {
  name?: string;
  width: number;
  height: number;
  cells: boolean[][];
}

/**
 * Converts a reMarkable-project export into this project's `Puzzle`: `true`
 * cells become color index `0`, `false` cells become empty (`null`), and the
 * single-color palette is `["#000000"]`. The export shape carries no id, so
 * the caller provides one (e.g. the source filename); it is also used as the
 * puzzle name when the export has no (or a blank) `name`.
 */
export function fromBooleanGridExport(
  id: string,
  input: BooleanGridExport,
): Puzzle {
  const { name, width, height, cells } = input;

  return createPuzzle({
    id,
    name: name && name.trim() !== "" ? name : id,
    width,
    height,
    palette: ["#000000"],
    cells: cells.map((row) => row.map((cell) => (cell ? 0 : null))),
  });
}

/** One palette entry from a `pixel-art-serializer` export, keyed by its own
 * `index` rather than its position in the array (indices need not be
 * contiguous). Exactly the entries with `reserved: true` — the format's own
 * sibling project guarantees at most one, always fully transparent — become
 * empty cells; every other entry becomes a puzzle palette color. */
export interface SerializedPaletteColor {
  index: number;
  color: string;
  reserved: boolean;
}

/** The JSON shape exported by the sibling `pixel-art-serializer` project: a
 * flat, row-major pixel grid indexed into a palette, with reserved (fully
 * transparent) entries marked explicitly rather than assumed by position. */
export interface PixelArtSerialization {
  formatVersion: number;
  gridWidth: number;
  gridHeight: number;
  palette: SerializedPaletteColor[];
  pixels: number[];
}

/**
 * Converts a `pixel-art-serializer` export into this project's `Puzzle`:
 * every pixel referencing a `reserved` palette entry becomes an empty cell
 * (`null`) and is never given a palette slot; every other pixel becomes the
 * color index of its palette entry's position among the non-reserved
 * entries, in the file's own order. Colors are normalized from the format's
 * 8-digit `#rrggbbaa` hex to this project's strict 6-digit `#rrggbb` via
 * `contrastColor.ts`'s `normalizeBackgroundHex`. Throws when `pixels` is
 * shorter than `gridWidth * gridHeight`, when a pixel references an index
 * absent from `palette`, or when a non-reserved entry's color does not
 * normalize to valid hex — same "reject rather than guess" posture as
 * `createPuzzle`'s own structural checks, which still run afterward (e.g. an
 * all-reserved palette is rejected by `createPuzzle`'s `emptyPalette` check,
 * not a separate one here). The export shape carries no id or name, so the
 * caller provides the id (e.g. the source filename), also used as the name.
 */
export function fromPixelArtSerialization(
  id: string,
  input: PixelArtSerialization,
): Puzzle {
  const { gridWidth, gridHeight, palette, pixels } = input;

  if (pixels.length !== gridWidth * gridHeight) {
    throw new Error(
      `pixel-art-serializer import: \`pixels\` has ${pixels.length} entries, expected ${gridWidth * gridHeight} (gridWidth × gridHeight)`,
    );
  }

  const reservedIndexes = new Set(
    palette.filter((entry) => entry.reserved).map((entry) => entry.index),
  );

  const puzzlePalette: string[] = [];
  const colorSlotByIndex = new Map<number, number>();
  for (const entry of palette) {
    if (entry.reserved) continue;
    const hex = normalizeBackgroundHex(entry.color);
    if (!hex) {
      throw new Error(
        `pixel-art-serializer import: palette entry ${entry.index} has an invalid color "${entry.color}"`,
      );
    }
    colorSlotByIndex.set(entry.index, puzzlePalette.length);
    puzzlePalette.push(hex);
  }

  const cells: (number | null)[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const pixelIndex = pixels[y * gridWidth + x];
      if (reservedIndexes.has(pixelIndex)) {
        row.push(null);
        continue;
      }
      const slot = colorSlotByIndex.get(pixelIndex);
      if (slot === undefined) {
        throw new Error(
          `pixel-art-serializer import: pixel at row ${y}, column ${x} references palette index ${pixelIndex}, which the file does not declare`,
        );
      }
      row.push(slot);
    }
    cells.push(row);
  }

  return createPuzzle({
    id,
    name: id,
    width: gridWidth,
    height: gridHeight,
    palette: puzzlePalette,
    cells,
  });
}
