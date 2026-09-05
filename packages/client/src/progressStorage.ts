import type { PuzzleProgress } from "@kindle-nonograms/shared";

const STORAGE_KEY_PREFIX = "kindle-nonograms:progress:";

/**
 * Persists a puzzle's progress to `localStorage`. Never throws: a write
 * that fails (quota exceeded, a restricted/private browsing mode) is
 * reported back as `false` instead of raising, so a caller can react (e.g.
 * warn the player) rather than the failure being swallowed silently.
 */
export function saveProgress(
  puzzleId: string,
  progress: PuzzleProgress,
): boolean {
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + puzzleId,
      JSON.stringify(progress),
    );
    return true;
  } catch {
    return false;
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
