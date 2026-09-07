import type { ImageLike } from "./imageQuantize.js";

/**
 * Stable, locale-independent discriminant for why `decodeImageFile` rejected
 * — lets `hydrateEditorPage.ts` pick its own contributor-facing message per
 * failure kind instead of showing this error's own `message` (which can be
 * literal, untranslatable browser text, e.g. a `DOMException`'s own wording
 * from `getImageData`/`drawImage`) — see
 * `.vibe/decisions/021-editor-errors-discriminated-by-reason.md`.
 * `"unsupported"`: this browser can't decode images at all (no 2D canvas
 * context). `"unreadable"`: the picked file itself couldn't be loaded as an
 * image. `"timeout"`: the decode didn't finish within the caller's own
 * timeout (this module never imposes one itself — see `withTimeout.ts` and
 * `hydrateEditorPage.ts`'s `handleImport`). `"unknown"`: any other failure,
 * most often a raw browser exception from the decode step — its own
 * message is kept on the error for debugging, but never shown to the
 * contributor verbatim.
 */
export type ImageDecodeErrorReason =
  | "unsupported"
  | "unreadable"
  | "timeout"
  | "unknown";

export class ImageDecodeError extends Error {
  readonly reason: ImageDecodeErrorReason;

  constructor(reason: ImageDecodeErrorReason, message: string) {
    super(message);
    this.name = "ImageDecodeError";
    this.reason = reason;
  }
}

/**
 * Decodes a user-picked local image file into raw RGBA pixel data via a
 * throwaway `<canvas>` — the only way to read pixel data from an arbitrary
 * local file with no server to send it to for decoding (matches the
 * project's no-backend model, see .vibe/backlog/done/
 * 005-remove-express-server-package.md). Kept as its own small module,
 * isolated from `hydrateEditorPage.ts`'s own state/validation logic in
 * `imageQuantize.ts`'s "import image" pipeline, since jsdom (this project's
 * test environment) doesn't implement real `<canvas>` pixel decoding — this
 * file is instead verified by driving a real browser (see .vibe/backlog/
 * done/030-image-import-for-the-puzzle-editor.md), the same "DOM glue, not
 * unit tested" boundary already drawn around `publish-preview-cli.ts`.
 */
export function decodeImageFile(file: File): Promise<ImageLike> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(
            new ImageDecodeError(
              "unsupported",
              "This browser can't decode images for import.",
            ),
          );
          return;
        }

        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        resolve({
          width: imageData.width,
          height: imageData.height,
          data: imageData.data,
        });
      } catch (error) {
        reject(
          new ImageDecodeError(
            "unknown",
            error instanceof Error ? error.message : "Image decode failed.",
          ),
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new ImageDecodeError("unreadable", "Could not read this image file."),
      );
    };

    image.src = url;
  });
}
