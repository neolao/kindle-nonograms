import {
  type BooleanGridExport,
  type PixelArtSerialization,
  fromBooleanGridExport,
  fromPixelArtSerialization,
} from "./adapters.js";
import { type Puzzle, createPuzzle } from "./puzzle.js";

/**
 * Whether `value` looks like this project's own native `Puzzle` export
 * shape (it declares a `palette`) rather than the sibling
 * `remarkable-nonogram-generator` project's plain boolean-grid export (no
 * palette at all). A `pixel-art-serializer` export also declares an array
 * called `palette`, so callers must rule that shape out first — see
 * `isPixelArtSerializationShape` and `parsePuzzleSource`.
 */
export function isNativePuzzleShape(value: unknown): value is Puzzle {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Puzzle).palette)
  );
}

/**
 * Whether `value` looks like the sibling `pixel-art-serializer` project's
 * export shape: a flat `pixels` array alongside `gridWidth`/`gridHeight` —
 * fields the native `Puzzle` shape (`cells`, `width`/`height`) never has,
 * so this check is unambiguous even though both shapes also declare an
 * array called `palette`.
 */
export function isPixelArtSerializationShape(
  value: unknown,
): value is PixelArtSerialization {
  const candidate = value as PixelArtSerialization;
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(candidate.pixels) &&
    Array.isArray(candidate.palette) &&
    typeof candidate.gridWidth === "number" &&
    typeof candidate.gridHeight === "number"
  );
}

/**
 * Parses an arbitrary parsed-JSON `value` into a validated `Puzzle`,
 * auto-detecting whether it's a `pixel-art-serializer` export, the native
 * shape, or a reMarkable `BooleanGridExport` — the one place this detection
 * lives, reused by `site`'s build-time puzzle loader and `client`'s editor
 * JSON import, so the three can never disagree on the same file. The
 * pixel-art-serializer check runs first since its shape also has an array
 * called `palette`, which would otherwise pass `isNativePuzzleShape` (see
 * .vibe/decisions/051-pixel-art-serializer-import-shape-detection.md).
 * `id` always wins over any `id` the native shape's own content declares
 * (the caller supplies it — a source filename on both sides — see
 * .vibe/decisions/001-puzzle-id-from-filename.md). Throws
 * `PuzzleValidationError` for a structurally invalid native-shape value,
 * or whatever `fromPixelArtSerialization`/`fromBooleanGridExport` throws for
 * the other two shapes.
 */
export function parsePuzzleSource(value: unknown, id: string): Puzzle {
  if (isPixelArtSerializationShape(value)) {
    return fromPixelArtSerialization(id, value);
  }
  return isNativePuzzleShape(value)
    ? createPuzzle({ ...value, id })
    : fromBooleanGridExport(id, value as BooleanGridExport);
}
