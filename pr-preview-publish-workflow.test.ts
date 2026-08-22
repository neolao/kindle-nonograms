import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the privileged half of the PR-preview pipeline: this workflow
// gets `contents: write` + `pull-requests: write` specifically because
// `workflow_run` always runs the copy of this file committed to the
// default branch, never a PR's own version — see .vibe/backlog/
// 025-automatic-puzzle-preview-on-pull-requests.md and .vibe/decisions/
// 018-pr-preview-trusts-only-workflow-expressions.md for the full
// reasoning these checks lock in.
const PUBLISH_PATH = join(
  process.cwd(),
  ".github",
  "workflows",
  "pr-preview-publish.yml",
);
const PR_CHECK_PATH = join(
  process.cwd(),
  ".github",
  "workflows",
  "pr-check.yml",
);

async function readPublishWorkflow(): Promise<string> {
  return readFile(PUBLISH_PATH, "utf-8");
}

describe("Publish Puzzle Preview workflow", () => {
  it("exists as its own workflow file", () => {
    expect(existsSync(PUBLISH_PATH)).toBe(true);
  });

  it("triggers on workflow_run completions of the PR check workflow", async () => {
    const workflow = await readPublishWorkflow();

    expect(workflow).toMatch(/workflow_run:/);
    expect(workflow).toMatch(/workflows:\s*\[["']PR Check["']\]/);
    expect(workflow).toMatch(/types:\s*\[completed\]/);
  });

  it("declares exactly the three permissions this privileged job needs, nothing broader", async () => {
    const workflow = await readPublishWorkflow();
    const permissionsBlock = workflow.slice(
      workflow.indexOf("permissions:"),
      workflow.indexOf("concurrency:"),
    );

    expect(permissionsBlock).toMatch(/contents:\s*write/);
    expect(permissionsBlock).toMatch(/pull-requests:\s*write/);
    expect(permissionsBlock).toMatch(/actions:\s*read/);
    expect(permissionsBlock).not.toMatch(/id-token:/);
    expect(permissionsBlock).not.toMatch(/packages:/);
  });

  it("never overrides the checkout ref, so it only ever runs its own base-branch code", async () => {
    const workflow = await readPublishWorkflow();

    expect(workflow).toContain("actions/checkout@v4");
    expect(workflow).not.toMatch(/ref:\s*\$\{\{\s*github\.event\.workflow_run/);
  });

  it("scopes concurrency to the triggering run's source branch, not the unreliable PR list", async () => {
    const workflow = await readPublishWorkflow();

    expect(workflow).toMatch(/concurrency:/);
    expect(workflow).toContain(
      "github.event.workflow_run.head_repository.full_name",
    );
    expect(workflow).toContain("github.event.workflow_run.head_branch");
    expect(workflow).not.toMatch(/group:.*workflow_run\.pull_requests/);
    // A superseded run cancels outright — git only updates a remote ref
    // after a complete push, so an interrupted push can't corrupt it.
    expect(workflow).toMatch(/cancel-in-progress:\s*true/);
  });

  it("downloads artifacts from the triggering run specifically, not the latest one", async () => {
    const workflow = await readPublishWorkflow();

    expect(workflow).toContain("actions/download-artifact@v4");
    expect(workflow).toContain("github.event.workflow_run.id");
    expect(workflow).toMatch(/github-token:/);
  });

  it("only publishes when the triggering PR-check run actually succeeded", async () => {
    const workflow = await readPublishWorkflow();

    expect(workflow).toMatch(/if:.*workflow_run\.conclusion.*==.*success/);
  });

  it("passes the triggering commit's sha through, for the publish script's own PR-number cross-check", async () => {
    const workflow = await readPublishWorkflow();

    expect(workflow).toContain("HEAD_SHA");
    expect(workflow).toContain("github.event.workflow_run.head_sha");
  });

  it("bounds the job with a timeout", async () => {
    const workflow = await readPublishWorkflow();

    expect(workflow).toMatch(/timeout-minutes:/);
  });
});

describe("artifact names agree between pr-check.yml and pr-preview-publish.yml", () => {
  it("uses the exact same render/cleanup artifact names on both sides", async () => {
    const prCheck = await readFile(PR_CHECK_PATH, "utf-8");
    const publish = await readPublishWorkflow();

    for (const artifactName of [
      "puzzle-preview-render",
      "puzzle-preview-cleanup",
    ]) {
      expect(prCheck).toContain(artifactName);
      expect(publish).toContain(artifactName);
    }
  });
});
