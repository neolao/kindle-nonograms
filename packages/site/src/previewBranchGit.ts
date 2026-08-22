import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

function git(repoDir: string, args: string[]): string {
  return execFileSync("git", args, { cwd: repoDir, encoding: "utf-8" });
}

function remoteHasBranch(repoDir: string, branch: string): boolean {
  return git(repoDir, ["ls-remote", "--heads", "origin", branch]).trim() !== "";
}

/**
 * `git add -A -- <pathspec>` hard-errors ("did not match any files") when
 * there is nothing left for it to do — an already-empty `previews/pr-<n>/`
 * (nothing rendered), or a deletion a previous call in the same run
 * already fully staged. Both are real, reachable cases here (a
 * `removePreviewDir` call repeated with nothing new to remove is exactly
 * the second one), so that failure is treated as "no new change to
 * stage" rather than propagated — the caller's `changed` flag reflects
 * whether *this* call actually staged something.
 */
function stageIfChanged(repoDir: string, pathspec: string): boolean {
  try {
    git(repoDir, ["add", "-A", "--", pathspec]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks out `branch` in `repoDir` (already an empty `git init`-ed working
 * tree), fetching it from `remoteUrl` if it already exists there, or
 * creating it fresh as an orphan branch (no shared history with any other
 * branch, in particular not with `main`) if it doesn't — the
 * `puzzle-previews` branch is pure generated content, unrelated to the
 * site's source history.
 */
export async function ensureBranchCheckout(
  repoDir: string,
  remoteUrl: string,
  branch: string,
): Promise<void> {
  git(repoDir, ["remote", "add", "origin", remoteUrl]);
  git(repoDir, ["fetch", "origin"]);

  if (remoteHasBranch(repoDir, branch)) {
    git(repoDir, ["checkout", "-B", branch, `origin/${branch}`]);
  } else {
    git(repoDir, ["checkout", "--orphan", branch]);
  }
}

export interface WriteResult {
  changed: boolean;
}

/**
 * Writes one PNG per image into `previews/pr-<prNumber>/<id>.png` in the
 * already-checked-out working tree, and stages the result. `id` is
 * expected to already have passed `sanitizePuzzleId` — this function does
 * not re-validate it, since re-deriving the same guarantee twice would
 * just be duplicated logic to keep in sync.
 */
export async function writePreviewFiles(
  repoDir: string,
  prNumber: number,
  images: { id: string; png: Buffer }[],
): Promise<WriteResult> {
  const dir = join(repoDir, "previews", `pr-${prNumber}`);
  await mkdir(dir, { recursive: true });

  for (const image of images) {
    await writeFile(join(dir, `${image.id}.png`), image.png);
  }

  const changed = stageIfChanged(repoDir, `previews/pr-${prNumber}`);

  return { changed };
}

/**
 * Removes `previews/pr-<prNumber>/` entirely — run once a PR closes, so
 * the branch never accumulates images for PRs that are no longer open.
 * `changed: false` when the directory was already gone (e.g. a repeated
 * cleanup run, or a PR whose render step never actually ran).
 */
export async function removePreviewDir(
  repoDir: string,
  prNumber: number,
): Promise<WriteResult> {
  const dir = join(repoDir, "previews", `pr-${prNumber}`);

  await rm(dir, { recursive: true, force: true });
  const changed = stageIfChanged(repoDir, `previews/pr-${prNumber}`);

  return { changed };
}

/**
 * Commits whatever is currently staged and pushes `branch` to `origin` —
 * a no-op (no empty commit, no push) when nothing was actually staged, so
 * a run that found no real change never creates noise on the branch.
 */
export async function commitAndPush(
  repoDir: string,
  branch: string,
  message: string,
): Promise<void> {
  const staged = git(repoDir, ["diff", "--cached", "--name-only"]).trim();
  if (staged === "") {
    return;
  }

  git(repoDir, [
    "-c",
    "user.email=github-actions[bot]@users.noreply.github.com",
    "-c",
    "user.name=github-actions[bot]",
    "commit",
    "-m",
    message,
  ]);
  git(repoDir, ["push", "origin", `HEAD:${branch}`]);
}
