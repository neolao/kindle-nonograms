import { type Puzzle, createPuzzle } from "./puzzle.js";

/**
 * The plain export shape produced by the sibling `remarkable-nonogram-generator`
 * project: a boolean solution grid with no palette and no id.
 */
export interface BooleanGridExport {
  name?: string;
  width: number;
  height: number;
  cells: boolean[][];
}

/**
 * Converts a reMarkable-project export into this project's `Puzzle`: `true`
 * cells become color index `0`, `false` cells become empty (`null`), and the
 * single-color palette is `["#000000"]`. The export shape carries no id, so
 * the caller provides one (e.g. the source filename); it is also used as the
 * puzzle name when the export has no (or a blank) `name`.
 */
export function fromBooleanGridExport(
  id: string,
  input: BooleanGridExport,
): Puzzle {
  const { name, width, height, cells } = input;

  return createPuzzle({
    id,
    name: name && name.trim() !== "" ? name : id,
    width,
    height,
    palette: ["#000000"],
    cells: cells.map((row) => row.map((cell) => (cell ? 0 : null))),
  });
}
