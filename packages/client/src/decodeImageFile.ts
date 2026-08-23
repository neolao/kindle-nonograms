import type { ImageLike } from "./imageQuantize.js";

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
          reject(new Error("This browser can't decode images for import."));
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
          error instanceof Error ? error : new Error("Image decode failed."),
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };

    image.src = url;
  });
}
