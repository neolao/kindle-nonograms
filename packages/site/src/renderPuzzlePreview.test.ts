import { inflateSync } from "node:zlib";
import type { Puzzle } from "@kindle-nonograms/shared";
import { describe, expect, it } from "vitest";
import { renderPuzzlePreviewPng } from "./renderPuzzlePreview.js";

// Minimal PNG decoder for these tests only: our own encoder always emits a
// single IDAT chunk, 8-bit RGBA, and filter type 0 (None) on every
// scanline — so unfiltering is just "strip the leading byte per row",
// with no need for a general-purpose PNG library.
interface DecodedPng {
  width: number;
  height: number;
  pixelAt(x: number, y: number): [number, number, number, number];
}

function decodePng(png: Buffer): DecodedPng {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.subarray(0, 8)).toEqual(signature);

  let offset = 8;
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8]).toBe(8); // bit depth
      expect(data[9]).toBe(6); // color type: truecolor + alpha
    } else if (type === "IDAT") {
      idatChunks.push(Buffer.from(data));
    }

    offset += 8 + length + 4; // length + type + data + crc
  }

  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;

  return {
    width,
    height,
    pixelAt(x, y) {
      // +1 per row to skip that scanline's filter-type byte.
      const rowStart = y * (stride + 1) + 1;
      const i = rowStart + x * 4;
      return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
    },
  };
}

const monoPuzzle: Puzzle = {
  id: "mono",
  name: "Mono",
  width: 2,
  height: 1,
  palette: ["#000000"],
  cells: [[0, null]],
};

describe("renderPuzzlePreviewPng", () => {
  it("renders a filled cell in its palette color and a null cell as transparent", () => {
    const png = renderPuzzlePreviewPng(monoPuzzle, { cellPx: 4 });
    const decoded = decodePng(png);

    expect(decoded.width).toBe(2 * 4);
    expect(decoded.height).toBe(1 * 4);
    expect(decoded.pixelAt(0, 0)).toEqual([0, 0, 0, 255]);
    expect(decoded.pixelAt(4, 0)).toEqual([0, 0, 0, 0]);
  });

  it("colors each filled cell with its own palette entry on a multi-color puzzle", () => {
    const puzzle: Puzzle = {
      id: "multi",
      name: "Multi",
      width: 2,
      height: 1,
      palette: ["#ff0000", "#00ff00"],
      cells: [[0, 1]],
    };
    const png = renderPuzzlePreviewPng(puzzle, { cellPx: 2 });
    const decoded = decodePng(png);

    expect(decoded.pixelAt(0, 0)).toEqual([255, 0, 0, 255]);
    expect(decoded.pixelAt(2, 0)).toEqual([0, 255, 0, 255]);
  });

  it("downsamples a puzzle larger than the cap, keeping the output size bounded", () => {
    const width = 200;
    const height = 100;
    const puzzle: Puzzle = {
      id: "huge",
      name: "Huge",
      width,
      height,
      palette: ["#000000"],
      cells: Array.from({ length: height }, () => Array(width).fill(0)),
    };

    const png = renderPuzzlePreviewPng(puzzle, {
      cellPx: 2,
      maxGridDimension: 20,
    });
    const decoded = decodePng(png);

    // Longer side (width=200) downsamples to exactly maxGridDimension=20;
    // the shorter side scales by the same factor (200/20 = 10 -> 100/10=10).
    expect(decoded.width).toBe(20 * 2);
    expect(decoded.height).toBe(10 * 2);
  });

  it("falls back to black for a malformed palette hex instead of throwing", () => {
    const puzzle: Puzzle = {
      id: "bad-hex",
      name: "Bad hex",
      width: 1,
      height: 1,
      palette: ["not-a-color"],
      cells: [[0]],
    };

    const png = renderPuzzlePreviewPng(puzzle, { cellPx: 2 });
    const decoded = decodePng(png);

    expect(decoded.pixelAt(0, 0)).toEqual([0, 0, 0, 255]);
  });

  it("produces a stable, correctly-sized image for a 1x1 monochrome puzzle", () => {
    const puzzle: Puzzle = {
      id: "tiny",
      name: "Tiny",
      width: 1,
      height: 1,
      palette: ["#123456"],
      cells: [[0]],
    };

    const png = renderPuzzlePreviewPng(puzzle, { cellPx: 3 });
    const decoded = decodePng(png);

    expect(decoded.width).toBe(3);
    expect(decoded.height).toBe(3);
    expect(decoded.pixelAt(1, 1)).toEqual([0x12, 0x34, 0x56, 255]);
  });
});
