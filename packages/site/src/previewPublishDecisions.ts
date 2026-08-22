import { PREVIEW_COMMENT_MARKER } from "./previewComment.js";

export type PreviewArtifactMode = "render" | "cleanup";

/**
 * Decides which of the two artifacts `pr-check.yml` can upload a given
 * downloaded artifact directory's entries represent, without trusting a
 * name declared by the low-privilege run — `pr-preview-publish.yml` reads
 * this straight off the actual downloaded files. A render artifact always
 * carries `manifest.json` alongside `pr-number.txt`; a cleanup artifact
 * (PR closed) carries only `pr-number.txt`. Anything else (missing
 * `pr-number.txt` entirely) isn't a recognized artifact from this
 * pipeline.
 */
export function determineArtifactMode(
  entries: string[],
): PreviewArtifactMode | undefined {
  if (!entries.includes("pr-number.txt")) {
    return undefined;
  }

  return entries.includes("manifest.json") ? "render" : "cleanup";
}

export interface PreviewComment {
  id: number;
  body: string;
}

/**
 * Finds the existing PR comment carrying this pipeline's stable marker, if
 * any — the one a render or cleanup run edits in place rather than piling
 * up a new comment on every push (see `previewComment.ts`).
 */
export function findExistingPreviewComment(
  comments: PreviewComment[],
): PreviewComment | undefined {
  return comments.find((comment) =>
    comment.body.includes(PREVIEW_COMMENT_MARKER),
  );
}

/**
 * Whether a publish run should skip writing anything, guarding against a
 * late `workflow_run` (from an earlier push) completing after the PR
 * already closed and its previews were cleaned up — which would otherwise
 * silently resurrect a removed preview on a closed PR. Only applies to a
 * render publish: a cleanup run's whole purpose is to act *because* the PR
 * closed, so it never skips on that account.
 */
export function shouldSkipClosedPr(
  mode: PreviewArtifactMode,
  prState: "open" | "closed",
): boolean {
  return mode === "render" && prState === "closed";
}

/**
 * Builds the public URL a pushed preview image is linked through in the PR
 * comment — the `puzzle-previews` branch is public content (no secrets),
 * so `raw.githubusercontent.com` serves it directly with no further auth.
 */
export function buildRawPreviewImageUrl({
  owner,
  repo,
  prNumber,
  puzzleId,
}: {
  owner: string;
  repo: string;
  prNumber: number;
  puzzleId: string;
}): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/puzzle-previews/previews/pr-${prNumber}/${puzzleId}.png`;
}
