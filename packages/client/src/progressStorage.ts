import type { PuzzleProgress } from "@kindle-nonograms/shared";

const STORAGE_KEY_PREFIX = "kindle-nonograms:progress:";

/**
 * Persists a puzzle's progress to `localStorage`. Degrades silently (no
 * error thrown, nothing saved) if storage is unavailable or throws — e.g.
 * quota exceeded or a restricted/private browsing mode.
 */
export function saveProgress(puzzleId: string, progress: PuzzleProgress): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + puzzleId,
      JSON.stringify(progress),
    );
  } catch {
    // Storage unavailable or throwing — nothing more we can do here.
  }
}

/**
 * Reads a puzzle's saved progress back from `localStorage`. Returns
 * `undefined` when there is no saved entry, when the stored value is not
 * valid JSON, or when storage itself is unavailable/throws.
 */
export function loadProgress(puzzleId: string): PuzzleProgress | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + puzzleId);
    if (raw === null) {
      return undefined;
    }

    return JSON.parse(raw) as PuzzleProgress;
  } catch {
    return undefined;
  }
}
