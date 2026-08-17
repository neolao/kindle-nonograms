import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the GitHub Pages deploy workflow: it must actually build and
// publish the real static site (see .vibe/decisions/007) rather than the
// stale placeholder the previous workflow deployed. These checks lock in
// the facts a broken/regressed workflow would silently violate.
const WORKFLOW_PATH = join(process.cwd(), ".github", "workflows", "deploy.yml");

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_PATH, "utf-8");
}

describe("GitHub Pages deploy workflow", () => {
  it("no longer has the old workflow that deployed the wrong output directory", () => {
    expect(
      existsSync(
        join(process.cwd(), ".github", "workflows", "deploy-pages.yml"),
      ),
    ).toBe(false);
  });

  it("triggers on push to main and on manual dispatch", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("workflow_dispatch:");
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

  it("uploads the real build output directory, not a package-local one", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("actions/upload-pages-artifact");
    expect(workflow).toMatch(/path:\s*dist\b/);
    expect(workflow).not.toContain("packages/client/dist");
  });

  it("deploys the uploaded artifact to GitHub Pages after the build succeeds", async () => {
    const workflow = await readWorkflow();

    const buildJobIndex = workflow.indexOf("actions/upload-pages-artifact");
    const deployIndex = workflow.indexOf("actions/deploy-pages");

    expect(deployIndex).toBeGreaterThan(-1);
    expect(buildJobIndex).toBeLessThan(deployIndex);
    expect(workflow).toMatch(/needs:\s*build/);
  });

  it("bounds every job with a timeout so a hung step can't block deploys indefinitely", async () => {
    const workflow = await readWorkflow();

    expect(workflow.match(/timeout-minutes:/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
  });
});
