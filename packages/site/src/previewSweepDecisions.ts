/**
 * Pure decisions for the scheduled orphaned-preview sweep (see .vibe/backlog/
 * done/032-scheduled-sweep-for-orphaned-puzzle-previews.md) — an independent
 * backstop for the event-driven cleanup in pr-check.yml/pr-preview-publish.yml
 * (see .vibe/decisions/018-pr-preview-trusts-only-workflow-expressions.md),
 * not a replacement for it.
 */

/**
 * The preview PR numbers with no matching entry in `openPrNumbers` — safe to
 * delete. A plain set difference, kept as its own named, tested function
 * rather than inlined so the sweep script's own logic stays a thin wiring
 * layer (same split the rest of this pipeline's decision modules already
 * use).
 */
export function computeOrphanedPreviewNumbers(
  previewPrNumbers: number[],
  openPrNumbers: number[],
): number[] {
  const open = new Set(openPrNumbers);
  return previewPrNumbers.filter((prNumber) => !open.has(prNumber));
}

const PREVIEW_DIR_PATTERN = /^pr-(\d+)$/;

/**
 * Parses a `previews/` entry name into its PR number, or `undefined` for
 * anything that doesn't match the exact `pr-<digits>` shape this pipeline
 * itself always writes (see `previewBranchGit.ts`'s `writePreviewFiles`) —
 * a stray or malformed directory on the branch is silently skipped rather
 * than crashing the sweep or being misread as PR number `NaN`.
 */
export function parsePreviewDirName(name: string): number | undefined {
  const match = PREVIEW_DIR_PATTERN.exec(name);
  if (!match) {
    return undefined;
  }

  const prNumber = Number(match[1]);
  return Number.isInteger(prNumber) && prNumber > 0 ? prNumber : undefined;
}
