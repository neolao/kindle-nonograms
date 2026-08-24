import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Locks in the shape of the scheduled backstop sweep for orphaned puzzle
// previews (see .vibe/backlog/done/
// 032-scheduled-sweep-for-orphaned-puzzle-previews.md) — same "read the
// actual workflow file" convention as deploy-workflow.test.ts and
// pr-preview-publish-workflow.test.ts.
const WORKFLOW_PATH = join(
  process.cwd(),
  ".github",
  "workflows",
  "sweep-previews.yml",
);

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_PATH, "utf-8");
}

describe("Sweep Orphaned Puzzle Previews workflow", () => {
  it("exists as its own workflow file", () => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true);
  });

  it("triggers on a daily schedule", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/schedule:/);
    expect(workflow).toMatch(/cron:\s*["'][^"']+["']/);
  });

  it("can also be triggered manually via workflow_dispatch", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/workflow_dispatch:/);
  });

  it("declares exactly the two permissions this job needs, nothing broader", async () => {
    const workflow = await readWorkflow();
    const permissionsBlock = workflow.slice(
      workflow.indexOf("permissions:"),
      workflow.indexOf("concurrency:"),
    );

    expect(permissionsBlock).toMatch(/contents:\s*write/);
    expect(permissionsBlock).toMatch(/pull-requests:\s*read/);
    expect(permissionsBlock).not.toMatch(/pull-requests:\s*write/);
    expect(permissionsBlock).not.toMatch(/id-token:/);
    expect(permissionsBlock).not.toMatch(/packages:/);
  });

  it("prevents an overlapping schedule + manual run from racing to push", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/concurrency:/);
    expect(workflow).toContain("puzzle-previews-sweep");
    expect(workflow).toMatch(/cancel-in-progress:\s*true/);
  });

  it("installs dependencies and runs the sweep script with the required env", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("actions/checkout@v4");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("packages/site/src/sweep-previews-cli.ts");
    expect(workflow).toContain("GITHUB_TOKEN");
    expect(workflow).toContain("GITHUB_REPOSITORY");
  });

  it("bounds the job with a timeout", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toMatch(/timeout-minutes:/);
  });
});
