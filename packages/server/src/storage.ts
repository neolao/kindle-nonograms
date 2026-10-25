import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  type PlayerCellMark,
  isProgressShape,
  isRevision,
  isValidPuzzleId,
  isValidTimestamp,
} from "@kindle-nonograms/shared";

export interface StoredEntry {
  cells: PlayerCellMark[][];
  rev: number;
  updatedAt: string;
  openedAt?: string;
}

/** Entries of one key, by puzzle id (a Map so no id can hit `__proto__`). */
type Entries = Map<string, StoredEntry>;

/** The key's file exists but cannot be parsed: never overwritten. */
export class StorageCorruptError extends Error {
  constructor() {
    super("Stored progress is unreadable");
    this.name = "StorageCorruptError";
  }
}

function toEntry(value: unknown): StoredEntry | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { cells, rev, updatedAt, openedAt } = value as Record<string, unknown>;
  if (
    !isProgressShape(cells) ||
    !isRevision(rev, 1) ||
    !isValidTimestamp(updatedAt) ||
    (openedAt !== undefined && !isValidTimestamp(openedAt))
  ) {
    return null;
  }
  return openedAt === undefined
    ? { cells, rev, updatedAt }
    : { cells, rev, updatedAt, openedAt };
}

/** Parses a key's file; invalid entries are skipped, an unparseable file throws. */
function parseEntries(raw: string): Entries {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StorageCorruptError();
  }
  const stored = (parsed as { entries?: unknown } | null)?.entries;
  if (typeof stored !== "object" || stored === null) {
    throw new StorageCorruptError();
  }

  const entries: Entries = new Map();
  for (const [puzzleId, value] of Object.entries(stored)) {
    const entry = toEntry(value);
    if (isValidPuzzleId(puzzleId) && entry) {
      entries.set(puzzleId, entry);
    }
  }
  return entries;
}

/** One JSON file per key, named after the SHA-256 of the key. */
export function createStorage(dataDir: string) {
  const locks = new Map<string, Promise<unknown>>();

  const fileOf = (key: string) =>
    join(dataDir, `${createHash("sha256").update(key).digest("hex")}.json`);

  async function load(key: string): Promise<Entries> {
    let raw: string;
    try {
      raw = await readFile(fileOf(key), "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return new Map();
      }
      throw error;
    }
    return parseEntries(raw);
  }

  return {
    /** Reads the key's entries; an unparseable file throws StorageCorruptError. */
    read: load,

    /**
     * Runs `change` on the key's entries with writes serialized per key, so
     * its read-compare-write is atomic. It returns the entries to persist
     * (or `null` to leave the file alone) and the result for the caller.
     */
    update<T>(
      key: string,
      change: (entries: Entries) => { next: Entries | null; result: T },
    ): Promise<T> {
      const run = async () => {
        const { next, result } = change(await load(key));
        if (next) {
          await mkdir(dataDir, { recursive: true });
          const file = fileOf(key);
          const temp = `${file}.${randomUUID()}.tmp`;
          try {
            // Flushed before the rename, so a crash never leaves the real file
            // pointing at data that was not yet on disk.
            const handle = await open(temp, "w");
            try {
              await handle.writeFile(
                JSON.stringify({ entries: Object.fromEntries(next) }),
              );
              await handle.sync();
            } finally {
              await handle.close();
            }
            await rename(temp, file);
          } catch (error) {
            await unlink(temp).catch(() => undefined);
            throw error;
          }
        }
        return result;
      };

      const previous = locks.get(key) ?? Promise.resolve();
      const current = previous.then(run, run);
      locks.set(
        key,
        current.catch(() => undefined),
      );
      return current;
    },
  };
}
