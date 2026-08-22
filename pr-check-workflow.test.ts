import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the pull-request CI check workflow: a contributor's PR must show a
// pass/fail status before merge, running the same validation the push-to-
// main deploy workflow already does — see
// .vibe/backlog/done/024-pull-request-ci-check.md. These checks lock in the
// facts a broken/regressed workflow would silently violate.
const WORKFLOW_PATH = join(
  process.cwd(),
  ".github",
  "workflows",
  "pr-check.yml",
);

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_PATH, "utf-8");
}

describe("PR check workflow", () => {
  it("exists as its own workflow file", () => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true);
  });

  it("triggers on every relevant pull_request event targeting main", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/pull_request:/);
    expect(workflow).toMatch(
      /types:\s*\[opened,\s*synchronize,\s*reopened,\s*closed\]/,
    );
    expect(workflow).toContain("branches: [main]");
  });

  it("runs lint and tests strictly before building the site", async () => {
    const workflow = await readWorkflow();

    const lintIndex = workflow.indexOf("npm run lint");
    const testIndex = workflow.indexOf("npm test");
    const buildIndex = workflow.indexOf("npm run build");

    expect(lintIndex).toBeGreaterThan(-1);
    expect(testIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeGreaterThan(-1);
    expect(lintIndex).toBeLessThan(buildIndex);
    expect(testIndex).toBeLessThan(buildIndex);
  });

  it("checks out the code and installs dependencies with npm ci on Node 22 first", async () => {
    const workflow = await readWorkflow();

    const checkoutIndex = workflow.indexOf("actions/checkout@v4");
    const nodeIndex = workflow.indexOf("actions/setup-node@v4");
    const installIndex = workflow.indexOf("npm ci");
    const lintIndex = workflow.indexOf("npm run lint");

    expect(workflow).toMatch(/node-version:\s*22/);
    expect(checkoutIndex).toBeGreaterThan(-1);
    expect(checkoutIndex).toBeLessThan(nodeIndex);
    expect(nodeIndex).toBeLessThan(installIndex);
    expect(installIndex).toBeLessThan(lintIndex);
  });

  it("has no deploy step, unlike the push-to-main workflow", async () => {
    const workflow = await readWorkflow();

    expect(workflow).not.toContain("actions/deploy-pages");
    expect(workflow).not.toContain("actions/upload-pages-artifact");
    expect(workflow).not.toContain("actions/configure-pages");
  });

  it("scopes permissions to read-only contents, since it neither deploys nor writes anything", async () => {
    const workflow = await readWorkflow();
    const permissionsBlock = workflow.slice(workflow.indexOf("permissions:"));

    expect(permissionsBlock).toMatch(/contents:\s*read/);
    expect(permissionsBlock).not.toMatch(/pages:\s*write/);
    expect(permissionsBlock).not.toMatch(/id-token:\s*write/);
  });

  it("skips the validation steps for a closed PR, only running for opened/synchronize/reopened", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/if:.*action.*!=.*closed/);
  });

  it("bounds the job with a timeout so a hung step can't block PR checks indefinitely", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/timeout-minutes:/);
  });

  it("cancels a superseded run when the PR is pushed to again, scoped per PR", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/concurrency:/);
    expect(workflow).toMatch(/cancel-in-progress:\s*true/);
    expect(workflow).toContain("github.event.pull_request.number");
  });

  it("renders puzzle previews only after lint/test/build, uploading them as a named artifact", async () => {
    const workflow = await readWorkflow();

    const buildIndex = workflow.indexOf("npm run build");
    const renderIndex = workflow.indexOf("render-preview-artifact-cli.ts");
    const uploadIndex = workflow.indexOf("puzzle-preview-render");

    expect(buildIndex).toBeGreaterThan(-1);
    expect(renderIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeLessThan(renderIndex);
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(workflow).toContain("actions/upload-artifact@v4");
  });

  it("uploads a minimal cleanup artifact naming just the PR number when a PR closes", async () => {
    const workflow = await readWorkflow();
    const cleanupJobIndex = workflow.indexOf("cleanup-artifact:");

    expect(cleanupJobIndex).toBeGreaterThan(-1);
    const cleanupJob = workflow.slice(cleanupJobIndex);
    expect(cleanupJob).toMatch(/if:.*action.*==.*closed/);
    expect(cleanupJob).toContain("puzzle-preview-cleanup");
    expect(cleanupJob).toContain("github.event.pull_request.number");
    // The cleanup job never checks out or renders anything — only a
    // number, from a trusted expression, never repo content.
    expect(cleanupJob).not.toContain("actions/checkout");
  });
});
