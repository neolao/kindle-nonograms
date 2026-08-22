// Word characters, dashes, and dots only — matches every real puzzle id in
// this project (UUIDs, kebab-case names) while rejecting anything a path
// separator or `..` could turn into an escaping path.
const SAFE_ID_PATTERN = /^[\w.-]+$/;

/**
 * Validates one `data/puzzles/*.json` diff entry and returns its puzzle id
 * (the filename without the `.json` extension) — or `undefined` if the
 * entry isn't a bare, safe `<id>.json` filename. Defense in depth: the
 * manifest this guards is normally built straight from real, git-diff-
 * confirmed filenames by this project's own render script, so a path
 * separator or `..` shouldn't actually reach it — but this is still the
 * allowlist every manifest entry passes through before it's used to build
 * a filesystem path on the `puzzle-previews` branch, so a bug or a
 * tampered/corrupted artifact can't turn into a path outside the intended
 * `previews/pr-<number>/` directory (see .vibe/decisions/
 * 018-pr-preview-trusts-only-workflow-expressions.md).
 */
export function sanitizePuzzleId(entry: string): string | undefined {
  if (!entry.endsWith(".json")) {
    return undefined;
  }

  const id = entry.slice(0, -".json".length).trim();

  if (id === "" || !SAFE_ID_PATTERN.test(id)) {
    return undefined;
  }

  return id;
}
