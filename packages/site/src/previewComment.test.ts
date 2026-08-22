import { describe, expect, it } from "vitest";
import {
  PREVIEW_COMMENT_MARKER,
  buildPreviewCommentBody,
  buildPreviewRemovedCommentBody,
} from "./previewComment.js";

describe("buildPreviewCommentBody", () => {
  it("includes the stable marker and one image link per puzzle", () => {
    const body = buildPreviewCommentBody({
      images: [
        {
          id: "small-heart",
          url: "https://raw.githubusercontent.com/x/y/z/small-heart.png",
        },
        {
          id: "sailboat",
          url: "https://raw.githubusercontent.com/x/y/z/sailboat.png",
        },
      ],
    });

    expect(body).toContain(PREVIEW_COMMENT_MARKER);
    expect(body).toContain(
      "![small-heart](https://raw.githubusercontent.com/x/y/z/small-heart.png)",
    );
    expect(body).toContain(
      "![sailboat](https://raw.githubusercontent.com/x/y/z/sailboat.png)",
    );
  });

  it("still carries the marker with no image links when nothing was rendered", () => {
    const body = buildPreviewCommentBody({ images: [] });

    expect(body).toContain(PREVIEW_COMMENT_MARKER);
    expect(body).not.toContain("![");
  });
});

describe("buildPreviewRemovedCommentBody", () => {
  it("includes the marker and a note that the preview was removed, no image links", () => {
    const body = buildPreviewRemovedCommentBody();

    expect(body).toContain(PREVIEW_COMMENT_MARKER);
    expect(body).toMatch(/removed/i);
    expect(body).not.toContain("![");
  });
});
