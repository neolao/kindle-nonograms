import { describe, expect, it } from "vitest";
import { createEmptyGrid } from "./index.js";

describe("createEmptyGrid", () => {
  it("returns a grid with the requested height and width", () => {
    const grid = createEmptyGrid(3, 2);

    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveLength(3);
  });

  it("fills every cell with the empty state", () => {
    const grid = createEmptyGrid(2, 2);

    expect(grid.flat().every((cell) => cell === "empty")).toBe(true);
  });

  it("throws when width or height is not a positive integer", () => {
    expect(() => createEmptyGrid(0, 2)).toThrow();
    expect(() => createEmptyGrid(2, -1)).toThrow();
  });
});
