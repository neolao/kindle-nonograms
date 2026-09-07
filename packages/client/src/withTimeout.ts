/**
 * Races `promise` against a fixed `timeoutMs` timer, rejecting with
 * `onTimeout()`'s error if `promise` hasn't settled by then. Kept as its
 * own small, pure module — unlike the real decode work it wraps around in
 * `hydrateEditorPage.ts` (`decodeImageFile.ts`'s real `<canvas>`/`Image()`
 * pixel decoding, which jsdom can't run and is instead verified by driving
 * a real browser), a timeout race is plain promise/timer logic with no
 * browser API dependency, so it's covered directly by fast, deterministic
 * unit tests instead. See
 * `.vibe/decisions/027-image-import-timeout-race-lives-outside-decode.md`.
 *
 * `promise` itself is never cancelled — only out-raced. If it settles after
 * the timeout already won, that later settlement is silently inert: a
 * native `Promise` only ever honors its first `resolve`/`reject` call, so a
 * late `resolve`/`reject` from `promise` here is simply ignored.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
