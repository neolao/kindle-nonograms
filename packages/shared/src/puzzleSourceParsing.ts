import { type BooleanGridExport, fromBooleanGridExport } from "./adapters.js";
import { type Puzzle, createPuzzle } from "./puzzle.js";

/**
 * Whether `value` looks like this project's own native `Puzzle` export
 * shape (it declares a `palette`) rather than the sibling
 * `remarkable-nonogram-generator` project's plain boolean-grid export
 * (no palette at all) — the only signal available, since neither format
 * carries an explicit format tag.
 */
export function isNativePuzzleShape(value: unknown): value is Puzzle {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Puzzle).palette)
  );
}

/**
 * Parses an arbitrary parsed-JSON `value` into a validated `Puzzle`,
 * auto-detecting whether it's the native shape or a reMarkable
 * `BooleanGridExport` — the one place this detection lives, reused by
 * `site`'s build-time puzzle loader and `client`'s editor JSON import, so
 * the two can never disagree on the same file. `id` always wins over any
 * `id` the native shape's own content declares (the caller supplies it —
 * a source filename on both sides — see
 * .vibe/decisions/001-puzzle-id-from-filename.md). Throws
 * `PuzzleValidationError` for a structurally invalid native-shape value,
 * or whatever `fromBooleanGridExport` throws for anything else.
 */
export function parsePuzzleSource(value: unknown, id: string): Puzzle {
  return isNativePuzzleShape(value)
    ? createPuzzle({ ...value, id })
    : fromBooleanGridExport(id, value as BooleanGridExport);
}
