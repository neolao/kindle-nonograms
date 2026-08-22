import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  commitAndPush,
  ensureBranchCheckout,
  removePreviewDir,
  writePreviewFiles,
} from "./previewBranchGit.js";
import {
  buildPreviewCommentBody,
  buildPreviewRemovedCommentBody,
} from "./previewComment.js";
import { sanitizePuzzleId } from "./previewFilenameGuard.js";
import { isPrNumberAssociated } from "./previewPrTrust.js";
import {
  buildRawPreviewImageUrl,
  determineArtifactMode,
  findExistingPreviewComment,
  shouldSkipClosedPr,
} from "./previewPublishDecisions.js";

/**
 * The privileged half of the PR-preview pipeline, run by
 * `pr-preview-publish.yml` (`workflow_run`, `contents: write` +
 * `pull-requests: write`) against an artifact downloaded from the
 * low-privilege `pr-check.yml` run that triggered it. Every actual
 * decision — which artifact mode this is, whether the declared PR number
 * can be trusted, whether a closed PR should be skipped, which comment to
 * edit, which filenames are safe to write — is made by the small, tested
 * pure functions this file only wires together; this file itself is argv/
 * env parsing plus the network and `git` calls those decisions require
 * (see `.vibe/decisions/018-pr-preview-trusts-only-workflow-expressions.md`
 * for why the trust chain is shaped this way).
 *
 * Required env: `GITHUB_TOKEN`, `GITHUB_REPOSITORY` (`owner/repo`),
 * `ARTIFACT_DIR` (the downloaded artifact's directory), `HEAD_SHA` (the
 * triggering run's `workflow_run.head_sha`).
 */

const GITHUB_API = "https://api.github.com";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function githubFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API ${path} failed: ${response.status} ${await response.text()}`,
    );
  }

  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

async function upsertPreviewComment(
  token: string,
  repository: string,
  prNumber: number,
  body: string,
): Promise<void> {
  const comments = await githubFetch<{ id: number; body: string }[]>(
    token,
    `/repos/${repository}/issues/${prNumber}/comments`,
  );
  const existing = findExistingPreviewComment(comments);

  if (existing) {
    await githubFetch(
      token,
      `/repos/${repository}/issues/comments/${existing.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
  } else {
    await githubFetch(
      token,
      `/repos/${repository}/issues/${prNumber}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
  }
}

async function main(): Promise<void> {
  const token = requireEnv("GITHUB_TOKEN");
  const repository = requireEnv("GITHUB_REPOSITORY");
  const artifactDir = requireEnv("ARTIFACT_DIR");
  const headSha = requireEnv("HEAD_SHA");
  const [owner, repo] = repository.split("/");

  const mode = determineArtifactMode(await readdir(artifactDir));
  if (!mode) {
    console.log("No recognized preview artifact in this run — nothing to do.");
    return;
  }

  const candidatePrNumber = Number(
    (await readFile(join(artifactDir, "pr-number.txt"), "utf-8")).trim(),
  );

  const associatedPulls = await githubFetch<{ number: number }[]>(
    token,
    `/repos/${repository}/commits/${headSha}/pulls`,
  );
  if (
    !isPrNumberAssociated(
      candidatePrNumber,
      associatedPulls.map((pull) => pull.number),
    )
  ) {
    throw new Error(
      `PR number ${candidatePrNumber} from the artifact is not associated with commit ${headSha} — refusing to act on it.`,
    );
  }

  const pr = await githubFetch<{ state: "open" | "closed" }>(
    token,
    `/repos/${repository}/pulls/${candidatePrNumber}`,
  );
  if (shouldSkipClosedPr(mode, pr.state)) {
    console.log(
      `PR #${candidatePrNumber} is already closed — skipping a late render publish.`,
    );
    return;
  }

  const remoteUrl = `https://x-access-token:${token}@github.com/${repository}.git`;
  const workDir = await mkdtemp(join(tmpdir(), "puzzle-previews-"));
  await ensureBranchCheckout(workDir, remoteUrl, "puzzle-previews");

  let commentBody: string;

  if (mode === "render") {
    const manifest = JSON.parse(
      await readFile(join(artifactDir, "manifest.json"), "utf-8"),
    ) as { puzzles: string[] };

    const images: { id: string; png: Buffer }[] = [];
    for (const rawId of manifest.puzzles) {
      const id = sanitizePuzzleId(`${rawId}.json`);
      if (!id) {
        console.warn(
          `Skipping manifest entry with an unsafe id: ${JSON.stringify(rawId)}`,
        );
        continue;
      }
      images.push({ id, png: await readFile(join(artifactDir, `${id}.png`)) });
    }

    await writePreviewFiles(workDir, candidatePrNumber, images);
    await commitAndPush(
      workDir,
      "puzzle-previews",
      `chore: update puzzle preview for PR #${candidatePrNumber}`,
    );

    commentBody = buildPreviewCommentBody({
      images: images.map((image) => ({
        id: image.id,
        url: buildRawPreviewImageUrl({
          owner,
          repo,
          prNumber: candidatePrNumber,
          puzzleId: image.id,
        }),
      })),
    });
  } else {
    await removePreviewDir(workDir, candidatePrNumber);
    await commitAndPush(
      workDir,
      "puzzle-previews",
      `chore: remove puzzle preview for PR #${candidatePrNumber}`,
    );
    commentBody = buildPreviewRemovedCommentBody();
  }

  await upsertPreviewComment(token, repository, candidatePrNumber, commentBody);

  console.log(`Updated preview for PR #${candidatePrNumber} (${mode}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
