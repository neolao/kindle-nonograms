import { describe, expect, it } from "vitest";
import { extractBodyHtml } from "./htmlFixture.js";

describe("extractBodyHtml", () => {
  it("returns the markup between the opening and closing body tags", () => {
    const html =
      "<!doctype html><html><head></head><body><p>hi</p></body></html>";

    expect(extractBodyHtml(html)).toBe("<p>hi</p>");
  });

  it("matches a body tag carrying its own attributes", () => {
    const html = '<html><body class="panel"><h1>Title</h1></body></html>';

    expect(extractBodyHtml(html)).toBe("<h1>Title</h1>");
  });

  it("throws a descriptive error when no body tag is present", () => {
    expect(() => extractBodyHtml("<p>no body here</p>")).toThrow(
      /no <body> tag found/,
    );
  });
});
