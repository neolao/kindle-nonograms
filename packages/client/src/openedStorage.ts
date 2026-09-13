const STORAGE_KEY_PREFIX = "kindle-nonograms:opened:";

/**
 * Records that a puzzle's play page was just opened, as an epoch-ms
 * timestamp in `localStorage` — kept in its own per-puzzle key, separate
 * from `progressStorage.ts`'s saved cell marks, so the two can be written
 * independently (a page can be opened without ever painting a cell). A
 * later open always overwrites the previous timestamp: "last open wins",
 * matching the library's "recently opened" sort (backlog item 068). Never
 * throws: a write that fails (quota exceeded, a restricted/private
 * browsing mode) is reported back as `false`, same defensive spirit as
 * `saveProgress`.
 */
export function recordPuzzleOpened(
  puzzleId: string,
  timestampMs: number = Date.now(),
): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + puzzleId, String(timestampMs));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a puzzle's last-opened timestamp back from `localStorage`.
 * Returns `undefined` when there is no saved entry, when the stored value
 * isn't a finite number (a Kindle's browser clock can be unset or
 * corrupted storage), or when storage itself is unavailable/throws.
 */
export function loadPuzzleOpenedAt(puzzleId: string): number | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + puzzleId);
    if (raw === null) {
      return undefined;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
