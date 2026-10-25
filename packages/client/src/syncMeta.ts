import { isRevision } from "@kindle-nonograms/shared";
import { keysWithPrefix } from "./storageKeys.js";
import type { PlanMeta } from "./syncPlan.js";

const META_KEY_PREFIX = "kindle-nonograms:sync-meta:";

function metaKey(puzzleId: string): string {
  return META_KEY_PREFIX + puzzleId;
}

function parseMeta(raw: string | null): PlanMeta | undefined {
  if (raw === null) {
    return undefined;
  }
  try {
    const value = JSON.parse(raw);
    if (
      value !== null &&
      typeof value === "object" &&
      isRevision(value.baseRev, 1) &&
      typeof value.dirty === "boolean"
    ) {
      return { baseRev: value.baseRev, dirty: value.dirty };
    }
  } catch {
    // Invalid JSON — treated as no meta.
  }
  return undefined;
}

/**
 * Reads a puzzle's sync meta: the last server revision this device saw and
 * whether the puzzle changed since. `undefined` when absent, invalid or when
 * storage throws. The `dirty` flag doubles as the retry queue.
 */
export function loadSyncMeta(puzzleId: string): PlanMeta | undefined {
  try {
    return parseMeta(localStorage.getItem(metaKey(puzzleId)));
  } catch {
    return undefined;
  }
}

/** Persists a puzzle's sync meta. Never throws; `false` when the write fails. */
export function saveSyncMeta(puzzleId: string, meta: PlanMeta): boolean {
  try {
    localStorage.setItem(
      metaKey(puzzleId),
      JSON.stringify({ baseRev: meta.baseRev, dirty: meta.dirty }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes every puzzle's sync meta (used when the server is forgotten).
 * Never throws; `false` when the keys could not be listed or removed.
 */
export function clearAllSyncMeta(): boolean {
  try {
    for (const key of keysWithPrefix(META_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
