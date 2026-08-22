import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  commitAndPush,
  ensureBranchCheckout,
  removePreviewDir,
  writePreviewFiles,
} from "./previewBranchGit.js";

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
