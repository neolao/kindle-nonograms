import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import {
  type BooleanGridExport,
  type Puzzle,
  createPuzzle,
  fromBooleanGridExport,
} from "@kindle-nonograms/shared";

/**
 * Loads every `*.json` puzzle file in `dir`, auto-detecting whether each one
 * is the project's native `Puzzle` shape or a reMarkable-export
 * (`BooleanGridExport`) shape, and validates all of them. A file is treated
 * as native when it declares a `palette`, and as a reMarkable export
 * otherwise. Every puzzle's id is the filename without extension, even for
 * native-format files that already declare their own `id` — see
 * `.vibe/decisions/001-puzzle-id-from-filename.md`.
 *
 * Fails fast: the first invalid or malformed file throws, and no puzzles
 * are returned — never a partial, silently-truncated list.
 */
export async function loadPuzzleSources(dir: string): Promise<Puzzle[]> {
  const entries = (await readdir(dir))
    .filter((entry) => extname(entry) === ".json")
    .sort();

  const puzzles: Puzzle[] = [];

  for (const entry of entries) {
    const filePath = join(dir, entry);
    const id = basename(entry, ".json");

    puzzles.push(await loadPuzzleFile(filePath, id));
  }

  return puzzles;
}

async function loadPuzzleFile(filePath: string, id: string): Promise<Puzzle> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);

    return isNativeShape(parsed)
      ? createPuzzle({ ...parsed, id })
      : fromBooleanGridExport(id, parsed as BooleanGridExport);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to load puzzle file ${filePath}: ${reason}`);
  }
}

function isNativeShape(value: unknown): value is Puzzle {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Puzzle).palette)
  );
}
