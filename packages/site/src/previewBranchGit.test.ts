import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  commitAndPush,
  ensureBranchCheckout,
  listPreviewDirs,
  removePreviewDir,
  writePreviewFiles,
} from "./previewBranchGit.js";
import {
  computeOrphanedPreviewNumbers,
  parsePreviewDirName,
} from "./previewSweepDecisions.js";

// Exercises the actual `git` orchestration against a real local "remote"
// (a bare repo on disk) — no network involved, but every git command runs
// for real, unlike a mocked child_process. This is the closest available
// proxy for the privileged workflow's own git steps in this sandboxed
// environment (see the item's final report for what's still unverified
// against real GitHub).
function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8" });
}

describe("previewBranchGit", () => {
  let remoteDir: string;
  let workDir: string;

  beforeEach(async () => {
    remoteDir = await mkdtemp(join(tmpdir(), "preview-remote-"));
    workDir = await mkdtemp(join(tmpdir(), "preview-work-"));
    git(remoteDir, ["init", "--bare", "-q"]);
    git(workDir, ["init", "-q"]);
    git(workDir, ["config", "user.email", "test@example.com"]);
    git(workDir, ["config", "user.name", "Test"]);
  });

  afterEach(async () => {
    await rm(remoteDir, { recursive: true, force: true });
    await rm(workDir, { recursive: true, force: true });
  });

  it("creates the previews branch as an orphan when it doesn't exist on the remote yet", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");

    // `rev-parse --abbrev-ref HEAD` fails on an unborn branch (no commits
    // yet) — `symbolic-ref` reads the branch name straight off HEAD's
    // symbolic pointer instead, which works before the first commit too.
    const branch = git(workDir, ["symbolic-ref", "--short", "HEAD"]).trim();
    expect(branch).toBe("puzzle-previews");
  });

  it("works on a plain mkdtemp dir that was never git-init-ed, matching how both CLIs actually call it", async () => {
    // Both sweep-previews-cli.ts and publish-preview-cli.ts pass a raw
    // `mkdtemp` result straight into `ensureBranchCheckout` — neither runs
    // `git init` first. The shared `beforeEach` above does run `git init`
    // on `workDir`, which would hide that real callers never do; this test
    // uses its own, deliberately un-init-ed directory instead.
    const rawDir = await mkdtemp(join(tmpdir(), "preview-work-raw-"));
    try {
      await ensureBranchCheckout(rawDir, remoteDir, "puzzle-previews");

      const branch = git(rawDir, ["symbolic-ref", "--short", "HEAD"]).trim();
      expect(branch).toBe("puzzle-previews");
    } finally {
      await rm(rawDir, { recursive: true, force: true });
    }
  });

  it("writes preview images under previews/pr-<number>/ and reports a change", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");

    const result = await writePreviewFiles(workDir, 42, [
      { id: "cat", png: Buffer.from("fake-png-1") },
      { id: "dog", png: Buffer.from("fake-png-2") },
    ]);

    expect(result.changed).toBe(true);
    const files = await readdir(join(workDir, "previews", "pr-42"));
    expect(files.sort()).toEqual(["cat.png", "dog.png"]);
    expect(
      await readFile(join(workDir, "previews", "pr-42", "cat.png")),
    ).toEqual(Buffer.from("fake-png-1"));
  });

  it("round-trips a push then a fresh checkout sees the committed files", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");
    await writePreviewFiles(workDir, 7, [
      { id: "cat", png: Buffer.from("data") },
    ]);
    await commitAndPush(
      workDir,
      "puzzle-previews",
      "test: add preview for PR 7",
    );

    const freshCheckout = await mkdtemp(join(tmpdir(), "preview-verify-"));
    git(freshCheckout, [
      "clone",
      "-q",
      "-b",
      "puzzle-previews",
      remoteDir,
      ".",
    ]);
    const files = await readdir(join(freshCheckout, "previews", "pr-7"));
    expect(files).toEqual(["cat.png"]);
    await rm(freshCheckout, { recursive: true, force: true });
  });

  it("removePreviewDir deletes the PR's directory and reports whether anything changed", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");
    await writePreviewFiles(workDir, 42, [
      { id: "cat", png: Buffer.from("data") },
    ]);
    await commitAndPush(
      workDir,
      "puzzle-previews",
      "test: add preview for PR 42",
    );

    const removed = await removePreviewDir(workDir, 42);
    expect(removed.changed).toBe(true);

    const removedAgain = await removePreviewDir(workDir, 42);
    expect(removedAgain.changed).toBe(false); // already gone — nothing to remove
  });

  it("listPreviewDirs lists every previews/pr-<n> directory currently checked out", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");
    await writePreviewFiles(workDir, 42, [
      { id: "cat", png: Buffer.from("data") },
    ]);
    await writePreviewFiles(workDir, 7, [
      { id: "dog", png: Buffer.from("data") },
    ]);

    const dirs = await listPreviewDirs(workDir);

    expect(dirs.sort()).toEqual(["pr-42", "pr-7"]);
  });

  it("listPreviewDirs returns an empty list when the branch has never published anything", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");

    expect(await listPreviewDirs(workDir)).toEqual([]);
  });

  it("commitAndPush is a no-op (no empty commit) when nothing actually changed", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");

    // No files written — nothing staged.
    await expect(
      commitAndPush(workDir, "puzzle-previews", "test: nothing to commit"),
    ).resolves.not.toThrow();

    // An orphan branch with zero commits has no HEAD yet — `rev-parse HEAD`
    // itself fails, which is the cleanest available proof no commit was
    // created (an empty `git log` would already error the same way).
    expect(() => git(workDir, ["rev-parse", "HEAD"])).toThrow();
  });
});

// Exercises the scheduled orphaned-preview sweep's full pipeline (see
// .vibe/backlog/done/032-scheduled-sweep-for-orphaned-puzzle-previews.md) —
// the same real-git harness as above, wired together the same way
// sweep-previews-cli.ts itself does, minus the GitHub API call for the
// open-PR list (passed in directly here).
describe("orphaned preview sweep (previewBranchGit + previewSweepDecisions)", () => {
  let remoteDir: string;
  let workDir: string;

  beforeEach(async () => {
    remoteDir = await mkdtemp(join(tmpdir(), "preview-remote-"));
    workDir = await mkdtemp(join(tmpdir(), "preview-work-"));
    git(remoteDir, ["init", "--bare", "-q"]);
    git(workDir, ["init", "-q"]);
    git(workDir, ["config", "user.email", "test@example.com"]);
    git(workDir, ["config", "user.name", "Test"]);
  });

  afterEach(async () => {
    await rm(remoteDir, { recursive: true, force: true });
    await rm(workDir, { recursive: true, force: true });
  });

  async function sweep(openPrNumbers: number[]): Promise<number[]> {
    const previewPrNumbers = (await listPreviewDirs(workDir))
      .map(parsePreviewDirName)
      .filter((prNumber): prNumber is number => prNumber !== undefined);
    const orphaned = computeOrphanedPreviewNumbers(
      previewPrNumbers,
      openPrNumbers,
    );
    for (const prNumber of orphaned) {
      await removePreviewDir(workDir, prNumber);
    }
    await commitAndPush(
      workDir,
      "puzzle-previews",
      `test: sweep ${orphaned.join(", ") || "nothing"}`,
    );
    return orphaned;
  }

  it("removes only the orphaned preview directories in one combined commit, leaving the open one untouched", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");
    await writePreviewFiles(workDir, 1, [{ id: "cat", png: Buffer.from("d") }]);
    await writePreviewFiles(workDir, 2, [{ id: "dog", png: Buffer.from("d") }]);
    await writePreviewFiles(workDir, 3, [{ id: "fox", png: Buffer.from("d") }]);
    await commitAndPush(
      workDir,
      "puzzle-previews",
      "test: seed three previews",
    );

    const orphaned = await sweep([2]);

    expect(orphaned.sort()).toEqual([1, 3]);
    await expect(readdir(join(workDir, "previews", "pr-1"))).rejects.toThrow();
    await expect(readdir(join(workDir, "previews", "pr-3"))).rejects.toThrow();
    expect(await readdir(join(workDir, "previews", "pr-2"))).toEqual([
      "dog.png",
    ]);
    // One sweep commit, not one per removed PR.
    expect(git(workDir, ["log", "--oneline"]).trim().split("\n")).toHaveLength(
      2,
    );
  });

  it("creates no new commit when every existing preview still has an open PR", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");
    await writePreviewFiles(workDir, 5, [{ id: "cat", png: Buffer.from("d") }]);
    await commitAndPush(workDir, "puzzle-previews", "test: seed one preview");
    const shaBefore = git(workDir, ["rev-parse", "HEAD"]).trim();

    const orphaned = await sweep([5]);

    expect(orphaned).toEqual([]);
    expect(git(workDir, ["rev-parse", "HEAD"]).trim()).toBe(shaBefore);
  });

  it("finds nothing to sweep, and creates no commit at all, when the branch has never had a preview published", async () => {
    await ensureBranchCheckout(workDir, remoteDir, "puzzle-previews");

    const orphaned = await sweep([99]);

    expect(orphaned).toEqual([]);
    expect(() => git(workDir, ["rev-parse", "HEAD"])).toThrow();
  });
});
