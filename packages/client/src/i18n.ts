import {
  DEFAULT_LOCALE,
  type Locale,
  type TranslationKey,
  isSupportedLocale,
  translate,
} from "@kindle-nonograms/shared";

const COOKIE_NAME = "kindle-nonograms-locale";

/**
 * Reads the player's saved locale preference from `document.cookie`.
 * Returns `undefined` when no such cookie is set, or when reading cookies
 * throws (disabled/restricted mode) — degrades silently, same spirit as
 * `progressStorage.ts` for `localStorage`.
 */
export function readLocaleCookie(): string | undefined {
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const name = cookie.slice(0, separatorIndex).trim();
      if (name === COOKIE_NAME) {
        return decodeURIComponent(cookie.slice(separatorIndex + 1));
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Persists the player's locale choice to a long-lived cookie. Degrades
 * silently (nothing saved, no error thrown) if writing cookies is
 * unavailable or throws — the caller still applies the locale in-memory for
 * the current page view regardless of whether persistence succeeded.
 */
export function writeLocaleCookie(locale: Locale): void {
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=31536000`;
  } catch {
    // Cookie write unavailable or throwing — nothing more we can do here.
  }
}

/**
 * Resolves the effective locale for the current player: a saved cookie
 * value wins when it names a supported locale, otherwise the browser's
 * `navigator.language` is matched by its primary subtag (region ignored),
 * otherwise {@link DEFAULT_LOCALE}.
 */
export function resolveLocale(
  cookieValue: string | undefined,
  navigatorLanguage: string | undefined,
): Locale {
  if (isSupportedLocale(cookieValue)) {
    return cookieValue;
  }

  const primarySubtag = navigatorLanguage?.split("-")[0];
  if (isSupportedLocale(primarySubtag)) {
    return primarySubtag;
  }

  return DEFAULT_LOCALE;
}

/**
 * Applies `locale` to the current document: updates `document.lang` and
 * retranslates every element carrying a `data-i18n` attribute (its value is
 * a {@link TranslationKey}) by replacing its text content in place — no
 * reload, no reflow beyond the text swap itself.
 */
export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;

  const elements = document.querySelectorAll<HTMLElement>("[data-i18n]");
  for (const element of Array.from(elements)) {
    const key = element.getAttribute("data-i18n");
    if (key) {
      element.textContent = translate(locale, key as TranslationKey);
    }
  }
}
