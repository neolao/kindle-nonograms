import type { PuzzleProgress } from "@kindle-nonograms/shared";

const STORAGE_KEY_PREFIX = "kindle-nonograms:progress:";

/**
 * The exact `localStorage` key a puzzle's progress is stored under.
 * Exported so another module (e.g. `hydratePlayPage.ts`'s cross-tab
 * `storage` event listener) can recognize which key change belongs to a
 * given puzzle without duplicating the prefix.
 */
export function progressStorageKey(puzzleId: string): string {
  return STORAGE_KEY_PREFIX + puzzleId;
}

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
      progressStorageKey(puzzleId),
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
    const raw = localStorage.getItem(progressStorageKey(puzzleId));
    if (raw === null) {
      return undefined;
    }

    return JSON.parse(raw) as PuzzleProgress;
  } catch {
    return undefined;
  }
}
