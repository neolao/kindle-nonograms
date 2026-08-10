/**
 * Domain types and helpers shared between the server and the client.
 */

export type CellState = "empty" | "filled" | "marked";

export interface Puzzle {
  id: string;
  width: number;
  height: number;
  rowClues: number[][];
  colClues: number[][];
}

/**
 * Builds an empty grid of the given dimensions, every cell set to "empty".
 */
export function createEmptyGrid(width: number, height: number): CellState[][] {
  if (width <= 0 || height <= 0) {
    throw new Error("Grid dimensions must be positive integers");
  }

  return Array.from({ length: height }, () =>
    Array<CellState>(width).fill("empty"),
  );
}
