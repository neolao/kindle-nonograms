import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  type Locale,
  type TranslationKey,
  isSupportedLocale,
  translate,
} from "@kindle-nonograms/shared";

const COOKIE_NAME = LOCALE_COOKIE_NAME;

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
 * Applies `locale` to the current document: updates `document.lang`,
 * retranslates every element carrying a `data-i18n` attribute (its value is
 * a {@link TranslationKey}) by replacing its text content in place, and
 * retranslates every element carrying a `data-i18n-aria` attribute by
 * replacing its `aria-label` in place — no reload, no reflow beyond these
 * text/attribute swaps, and no DOM node is created, removed or moved, so a
 * currently focused element is never disturbed. The two attributes are
 * independent and can both be set on the same element or on different ones
 * (e.g. `hydrateEditorPage.ts`'s palette buttons, whose accessible name is
 * an `aria-label` rather than visible text — see
 * `.vibe/decisions/023-generic-aria-label-retranslation-attribute.md`).
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

  const ariaElements =
    document.querySelectorAll<HTMLElement>("[data-i18n-aria]");
  for (const element of Array.from(ariaElements)) {
    const key = element.getAttribute("data-i18n-aria");
    if (key) {
      element.setAttribute(
        "aria-label",
        interpolateColorNumber(
          translate(locale, key as TranslationKey),
          element,
        ),
      );
    }
  }
}

/**
 * Substitutes a `{number}` placeholder in a translated `aria-label` (e.g.
 * `play.swatchColorAriaLabel`, "Color {number}") with the element's own
 * 1-based `data-color-index` — the same index already baked for that
 * element's click handling, reused here rather than introducing a second
 * indexing scheme just for the label. A no-op (returns `label` unchanged)
 * whenever the placeholder or the attribute is absent, so every other
 * `data-i18n-aria` element (e.g. the editor's own `data-color-index`-bearing
 * swatch, whose label has no `{number}` token) is unaffected — see
 * `.vibe/decisions/029-swatch-aria-label-number-placeholder.md`.
 */
function interpolateColorNumber(label: string, element: HTMLElement): string {
  const colorIndexAttr = element.getAttribute("data-color-index");
  if (colorIndexAttr === null) {
    return label;
  }
  return label.replace("{number}", String(Number(colorIndexAttr) + 1));
}
