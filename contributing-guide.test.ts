import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Adding a puzzle today means reverse-engineering the Puzzle JSON shape from
// source. These checks guard that a documented, external-contributor-friendly
// path exists and stays accurate as the project evolves.
describe("CONTRIBUTING.md", () => {
  const path = join(process.cwd(), "CONTRIBUTING.md");

  it("exists at the repo root", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("documents every Puzzle field", async () => {
    const content = await readFile(path, "utf-8");

    for (const field of ["id", "name", "width", "height", "palette", "cells"]) {
      expect(content).toContain(field);
    }
  });

  it("states the puzzle id always comes from the filename, not from a JSON id field", async () => {
    const content = await readFile(path, "utf-8");

    expect(content).toMatch(/filename/i);
    expect(content).toMatch(
      /id.{0,40}discard|discard.{0,40}id|not.{0,40}from.{0,20}id field|ignored/i,
    );
  });

  it("gives data/puzzles/<id>.json as the target location", async () => {
    const content = await readFile(path, "utf-8");

    expect(content).toContain("data/puzzles/");
  });

  it("lists the exact commands to run before opening a PR", async () => {
    const content = await readFile(path, "utf-8");

    expect(content).toContain("npm test");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm run build");
  });

  it("embeds an example puzzle as a fenced code block rather than a loadable file", async () => {
    const content = await readFile(path, "utf-8");

    expect(content).toMatch(/```json/);
  });
});

describe("puzzle template safety", () => {
  it("does not add a template file under data/puzzles that the build would try to load", () => {
    const puzzleFiles = readdirSync(join(process.cwd(), "data/puzzles"));

    expect(
      puzzleFiles.some((file) => file.toLowerCase().includes("template")),
    ).toBe(false);
  });
});

describe(".github/PULL_REQUEST_TEMPLATE.md", () => {
  const path = join(process.cwd(), ".github/PULL_REQUEST_TEMPLATE.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("checklist covers filename-as-id, valid hex palette colors, the required commands, and licensing", async () => {
    const content = await readFile(path, "utf-8");

    expect(content).toMatch(/filename/i);
    expect(content).toMatch(/hex/i);
    expect(content).toContain("npm test");
    expect(content).toContain("npm run lint");
    expect(content).toContain("npm run build");
    expect(content).toMatch(/licens|original/i);
  });
});

describe("README", () => {
  it("links to CONTRIBUTING.md", async () => {
    const content = await readFile(join(process.cwd(), "README.md"), "utf-8");

    expect(content).toMatch(/\[.*\]\(CONTRIBUTING\.md\)/);
  });
});
