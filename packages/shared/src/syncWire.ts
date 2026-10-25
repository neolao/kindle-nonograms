import {
  type PlayerCellMark,
  isProgressShape,
  isValidPuzzleId,
} from "./progress.js";

/** The collection route of the optional sync server (a puzzle id is appended for a PUT). */
export const PROGRESS_ROUTE = "/api/progress";

/** The error code of a sync server whose stored progress cannot be read. */
export const STORAGE_CORRUPT_CODE = "storage_corrupt";

/** An entry as the sync server exposes it, and as the client reads it. */
export interface WireEntry {
  puzzleId: string;
  cells: PlayerCellMark[][];
  rev: number;
  openedAt?: string;
}

/**
 * Whether a value is a revision number: an integer of at least `minimum`.
 * A revision the server stores or serves starts at 1 (`minimum` 1); the
 * `baseRev` a client sends is 0 when it knows none (`minimum` 0).
 */
export function isRevision(value: unknown, minimum: 0 | 1): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= minimum
  );
}

export function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Structural check of an entry received from the sync server. */
export function isWireEntry(value: unknown): value is WireEntry {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const { puzzleId, cells, rev, openedAt } = value as Record<string, unknown>;
  return (
    isValidPuzzleId(puzzleId) &&
    isProgressShape(cells) &&
    isRevision(rev, 1) &&
    (openedAt === undefined || isValidTimestamp(openedAt))
  );
}
