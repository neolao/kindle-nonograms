import { describe, expect, it } from "vitest";
import {
  buildImportedGrid,
  downsampleImage,
  quantizeColors,
} from "./imageQuantize.js";

// Builds a flat RGBA buffer from a row-major array of [r,g,b] triples, alpha
// always opaque (255) — matches the shape `ImageData.data` (and therefore
// `ImageLike.data`) always has, without needing a real `<canvas>`.
function buildImageData(
  width: number,
  height: number,
  pixels: [number, number, number][],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  pixels.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return data;
}

describe("downsampleImage", () => {
  it("block-averages a 2x2 source block into a single downsampled pixel", () => {
    const image = {
      width: 2,
      height: 2,
      data: buildImageData(2, 2, [
        [0, 0, 0],
        [100, 0, 0],
        [0, 100, 0],
        [0, 0, 100],
      ]),
    };

    const grid = downsampleImage(image, 1, 1);

    expect(grid).toEqual([[{ r: 25, g: 25, b: 25 }]]);
  });

  it("reproduces each quadrant's exact color when it downsamples a uniform 2x2 block per target cell", () => {
    const image = {
      width: 4,
      height: 4,
      data: buildImageData(4, 4, [
        // row 0
        [255, 0, 0],
        [255, 0, 0],
        [0, 255, 0],
        [0, 255, 0],
        // row 1
        [255, 0, 0],
        [255, 0, 0],
        [0, 255, 0],
        [0, 255, 0],
        // row 2
        [0, 0, 255],
        [0, 0, 255],
        [255, 255, 0],
        [255, 255, 0],
        // row 3
        [0, 0, 255],
        [0, 0, 255],
        [255, 255, 0],
        [255, 255, 0],
      ]),
    };

    const grid = downsampleImage(image, 2, 2);

    expect(grid).toEqual([
      [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
      ],
      [
        { r: 0, g: 0, b: 255 },
        { r: 255, g: 255, b: 0 },
      ],
    ]);
  });

  it("returns the source unchanged when the target size matches it (identity)", () => {
    const image = {
      width: 2,
      height: 1,
      data: buildImageData(2, 1, [
        [10, 20, 30],
        [40, 50, 60],
      ]),
    };

    const grid = downsampleImage(image, 2, 1);

    expect(grid).toEqual([
      [
        { r: 10, g: 20, b: 30 },
        { r: 40, g: 50, b: 60 },
      ],
    ]);
  });

  it("does not throw and returns an empty grid for a zero-size target", () => {
    const image = {
      width: 2,
      height: 2,
      data: buildImageData(2, 2, [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]),
    };

    expect(() => downsampleImage(image, 0, 0)).not.toThrow();
    expect(downsampleImage(image, 0, 0)).toEqual([]);
  });
});

describe("quantizeColors", () => {
  it("splits two distinct colors into two exact palette entries", () => {
    const pixels = [
      { r: 0, g: 0, b: 0 },
      { r: 100, g: 0, b: 0 },
    ];

    const result = quantizeColors(pixels, 2);

    expect(result.palette).toEqual([
      { r: 0, g: 0, b: 0 },
      { r: 100, g: 0, b: 0 },
    ]);
    expect(result.indices).toEqual([0, 1]);
  });

  it("produces fewer palette entries than requested when there are fewer distinct colors, keeping identical pixels in one bucket", () => {
    const pixels = [
      { r: 0, g: 0, b: 0 },
      { r: 0, g: 0, b: 0 },
      { r: 200, g: 0, b: 0 },
    ];

    const result = quantizeColors(pixels, 5);

    expect(result.palette).toEqual([
      { r: 0, g: 0, b: 0 },
      { r: 200, g: 0, b: 0 },
    ]);
    expect(result.indices).toEqual([0, 0, 1]);
  });

  it("collapses a fully uniform image to a single palette entry", () => {
    const pixels = [
      { r: 50, g: 50, b: 50 },
      { r: 50, g: 50, b: 50 },
      { r: 50, g: 50, b: 50 },
    ];

    const result = quantizeColors(pixels, 3);

    expect(result.palette).toEqual([{ r: 50, g: 50, b: 50 }]);
    expect(result.indices).toEqual([0, 0, 0]);
  });

  it("does not throw and returns empty results for an empty pixel list", () => {
    expect(() => quantizeColors([], 4)).not.toThrow();
    expect(quantizeColors([], 4)).toEqual({ palette: [], indices: [] });
  });

  it("treats a palette size of zero or less as at least one color, rather than producing an empty palette for non-empty input", () => {
    const pixels = [
      { r: 10, g: 10, b: 10 },
      { r: 200, g: 10, b: 10 },
    ];

    const result = quantizeColors(pixels, 0);

    expect(result.palette).toHaveLength(1);
    expect(result.indices).toEqual([0, 0]);
  });
});

describe("buildImportedGrid", () => {
  it("downsamples, quantizes, and maps the background color to null cells", () => {
    const image = {
      width: 2,
      height: 2,
      data: buildImageData(2, 2, [
        [255, 255, 255], // (0,0) — background
        [200, 0, 0], // (1,0) — foreground A
        [200, 0, 0], // (0,1) — foreground A
        [0, 0, 100], // (1,1) — foreground B
      ]),
    };

    const result = buildImportedGrid(image, {
      targetWidth: 2,
      targetHeight: 2,
      paletteSize: 4,
      backgroundColor: "#ffffff",
    });

    expect(result.palette).toEqual(["#000064", "#c80000"]);
    expect(result.cells).toEqual([
      [null, 1],
      [1, 0],
    ]);
  });

  it("produces fewer palette colors than requested when the image has fewer distinct foreground colors", () => {
    const image = {
      width: 2,
      height: 2,
      data: buildImageData(2, 2, [
        [255, 255, 255],
        [10, 20, 30],
        [10, 20, 30],
        [10, 20, 30],
      ]),
    };

    const result = buildImportedGrid(image, {
      targetWidth: 2,
      targetHeight: 2,
      paletteSize: 8,
      backgroundColor: "#ffffff",
    });

    expect(result.palette).toEqual(["#0a141e"]);
    expect(result.cells).toEqual([
      [null, 0],
      [0, 0],
    ]);
  });

  it("returns an empty palette and an all-null grid when every pixel matches the background", () => {
    const image = {
      width: 2,
      height: 2,
      data: buildImageData(2, 2, [
        [255, 255, 255],
        [255, 255, 255],
        [255, 255, 255],
        [255, 255, 255],
      ]),
    };

    const result = buildImportedGrid(image, {
      targetWidth: 2,
      targetHeight: 2,
      paletteSize: 4,
      backgroundColor: "#ffffff",
    });

    expect(result.palette).toEqual([]);
    expect(result.cells).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it("does not throw and returns an empty grid for a zero-size target", () => {
    const image = {
      width: 2,
      height: 2,
      data: buildImageData(2, 2, [
        [255, 255, 255],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]),
    };

    expect(() =>
      buildImportedGrid(image, {
        targetWidth: 0,
        targetHeight: 0,
        paletteSize: 4,
        backgroundColor: "#ffffff",
      }),
    ).not.toThrow();
    expect(
      buildImportedGrid(image, {
        targetWidth: 0,
        targetHeight: 0,
        paletteSize: 4,
        backgroundColor: "#ffffff",
      }),
    ).toEqual({ palette: [], cells: [] });
  });
});
