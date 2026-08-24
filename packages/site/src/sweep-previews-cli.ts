import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  commitAndPush,
  ensureBranchCheckout,
  listPreviewDirs,
  removePreviewDir,
} from "./previewBranchGit.js";
import {
  computeOrphanedPreviewNumbers,
  parsePreviewDirName,
} from "./previewSweepDecisions.js";

/**
 * The scheduled backstop for the PR-preview pipeline (see .vibe/backlog/
 * done/032-scheduled-sweep-for-orphaned-puzzle-previews.md), run by
 * `sweep-previews.yml` on a daily schedule and on demand via
 * `workflow_dispatch`. Independent of, and never a replacement for, the
 * event-driven cleanup in pr-check.yml/pr-preview-publish.yml — this exists
 * specifically to catch what that path misses (a failed run, a PR closed
 * outside the normal event flow). Lists every open PR and every preview
 * directory already on the `puzzle-previews` branch, deletes any preview
 * whose PR isn't open anymore, and pushes once with everything removed in
 * this run — a no-op (no commit) when nothing is orphaned.
 *
 * Required env: `GITHUB_TOKEN`, `GITHUB_REPOSITORY` (`owner/repo`).
 */

const GITHUB_API = "https://api.github.com";
const PULLS_PER_PAGE = 100;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function githubFetch<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API ${path} failed: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Lists every currently open PR's number, paginating through every page —
 * a repo can have more open PRs than fit on a single page, and silently
 * stopping after the first would risk treating a genuinely open PR's
 * preview as orphaned.
 */
async function listOpenPrNumbers(
  token: string,
  repository: string,
): Promise<number[]> {
  const numbers: number[] = [];

  for (let page = 1; ; page++) {
    const pulls = await githubFetch<{ number: number }[]>(
      token,
      `/repos/${repository}/pulls?state=open&per_page=${PULLS_PER_PAGE}&page=${page}`,
    );
    numbers.push(...pulls.map((pull) => pull.number));

    if (pulls.length < PULLS_PER_PAGE) {
      break;
    }
  }

  return numbers;
}

async function main(): Promise<void> {
  const token = requireEnv("GITHUB_TOKEN");
  const repository = requireEnv("GITHUB_REPOSITORY");

  // Fetched before the branch checkout below, deliberately: a PR that opens
  // (or a preview that renders) in the gap between these two reads can only
  // ever make this run see *more* open PRs / *more* preview directories
  // than existed when it started, never fewer — so a race can only ever
  // make this run more conservative (treat something as still-open that
  // it might otherwise have swept), never cause it to delete a preview
  // for a PR that's actually still open.
  const openPrNumbers = await listOpenPrNumbers(token, repository);

  const remoteUrl = `https://x-access-token:${token}@github.com/${repository}.git`;
  const workDir = await mkdtemp(join(tmpdir(), "puzzle-previews-sweep-"));
  await ensureBranchCheckout(workDir, remoteUrl, "puzzle-previews");

  const previewPrNumbers = (await listPreviewDirs(workDir))
    .map(parsePreviewDirName)
    .filter((prNumber): prNumber is number => prNumber !== undefined);

  const orphaned = computeOrphanedPreviewNumbers(
    previewPrNumbers,
    openPrNumbers,
  );

  if (orphaned.length === 0) {
    console.log("No orphaned puzzle previews found — nothing to do.");
    return;
  }

  for (const prNumber of orphaned) {
    await removePreviewDir(workDir, prNumber);
  }

  const label = orphaned.length === 1 ? "preview" : "previews";
  await commitAndPush(
    workDir,
    "puzzle-previews",
    `chore: sweep ${orphaned.length} orphaned puzzle ${label} (PR${orphaned.length === 1 ? "" : "s"} ${orphaned.join(", ")})`,
  );

  console.log(
    `Removed ${orphaned.length} orphaned puzzle ${label}: ${orphaned.join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
