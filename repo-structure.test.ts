import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The Pages site is a static-site generator; the optional LAN sync server is a
// separate package that is never deployed with it. These checks guard that split.
describe("repository structure", () => {
  it("has a server package that is not part of the Pages deployment", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/deploy.yml"),
      "utf-8",
    );

    expect(
      existsSync(join(process.cwd(), "packages/server/package.json")),
    ).toBe(true);
    expect(workflow).not.toContain("packages/server");
    expect(workflow).not.toContain("@kindle-nonograms/server");
  });

  it("root package.json has no dev:server script", async () => {
    const raw = await readFile(join(process.cwd(), "package.json"), "utf-8");
    const pkg = JSON.parse(raw);

    expect(pkg.scripts).not.toHaveProperty("dev:server");
  });

  it("keeps express in the server package, not in the root package.json", async () => {
    const root = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf-8"),
    );
    const server = JSON.parse(
      await readFile(
        join(process.cwd(), "packages/server/package.json"),
        "utf-8",
      ),
    );

    expect(root.dependencies ?? {}).not.toHaveProperty("express");
    expect(root.devDependencies ?? {}).not.toHaveProperty("express");
    expect(server.dependencies).toHaveProperty("express");
  });
});
