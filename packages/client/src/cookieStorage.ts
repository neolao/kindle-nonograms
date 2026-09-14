/**
 * Reads a single named cookie's value back from `document.cookie`. Returns
 * `undefined` when no cookie of that name is set, or when reading cookies
 * throws (disabled/restricted mode) — degrades silently, same spirit as
 * `progressStorage.ts` for `localStorage`. The shared primitive behind
 * `i18n.ts`'s `readLocaleCookie` and `libraryFiltersStorage.ts`'s
 * `readLibraryFiltersCookie`, factored out so both stop re-implementing the
 * identical lookup loop (see backlog item 072's review).
 */
export function readCookie(name: string): string | undefined {
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const cookieName = cookie.slice(0, separatorIndex).trim();
      if (cookieName === name) {
        return decodeURIComponent(cookie.slice(separatorIndex + 1));
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** A year, in seconds — the long-lived default every cookie this project writes uses. */
const DEFAULT_MAX_AGE_SECONDS = 31536000;

/**
 * Persists a single named cookie. Degrades silently (nothing saved, no
 * error thrown) if writing cookies is unavailable or throws — the caller's
 * own in-memory state for the current page view is unaffected either way.
 * The shared primitive behind `i18n.ts`'s `writeLocaleCookie` and
 * `libraryFiltersStorage.ts`'s `writeLibraryFiltersCookie`.
 */
export function writeCookie(
  name: string,
  value: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
): void {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}`;
  } catch {
    // Cookie write unavailable or throwing — nothing more we can do here.
  }
}
