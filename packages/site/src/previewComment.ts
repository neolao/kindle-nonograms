/**
 * Hidden HTML comment identifying a puzzle-preview comment on a PR, so a
 * later run can find and edit the existing comment in place instead of
 * piling up a new one on every push.
 */
export const PREVIEW_COMMENT_MARKER =
  "<!-- kindle-nonograms:puzzle-preview -->";

export interface PreviewImage {
  id: string;
  url: string;
}

/**
 * Builds the PR comment body listing one rendered preview image per
 * added/changed puzzle. `url` is expected to already be a
 * `raw.githubusercontent.com` link to the pushed image (see
 * `modules/site.md`) — this function only formats, it never fetches or
 * validates the URL itself.
 */
export function buildPreviewCommentBody({
  images,
}: {
  images: PreviewImage[];
}): string {
  const lines = [
    PREVIEW_COMMENT_MARKER,
    "**Puzzle preview**",
    "",
    ...images.map((image) => `![${image.id}](${image.url})`),
  ];

  return lines.join("\n");
}

/**
 * Builds the comment body once a PR closes and its previews are removed —
 * keeps the same marker so it still edits the same comment in place,
 * rather than leaving a stale image list behind or posting a second one.
 */
export function buildPreviewRemovedCommentBody(): string {
  return [
    PREVIEW_COMMENT_MARKER,
    "**Puzzle preview**",
    "",
    "_Preview removed — this pull request is no longer open._",
  ].join("\n");
}
