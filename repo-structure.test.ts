import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The project pivoted from a full-stack (Express) architecture to a static-site
// generator: no runtime server is needed. These checks guard that decision so it
// doesn't silently regress.
describe("repository structure", () => {
  it("no longer has a server package", () => {
    expect(existsSync(join(process.cwd(), "packages/server"))).toBe(false);
  });

  it("root package.json has no dev:server script", async () => {
    const raw = await readFile(join(process.cwd(), "package.json"), "utf-8");
    const pkg = JSON.parse(raw);

    expect(pkg.scripts).not.toHaveProperty("dev:server");
  });

  it("root package.json does not depend on express", async () => {
    const raw = await readFile(join(process.cwd(), "package.json"), "utf-8");
    const pkg = JSON.parse(raw);

    expect(pkg.dependencies ?? {}).not.toHaveProperty("express");
    expect(pkg.devDependencies ?? {}).not.toHaveProperty("express");
  });
});
