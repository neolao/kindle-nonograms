import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  type Locale,
  type TranslationKey,
  isSupportedLocale,
  translate,
} from "@kindle-nonograms/shared";
import { readCookie, writeCookie } from "./cookieStorage.js";

const COOKIE_NAME = LOCALE_COOKIE_NAME;

/**
 * Reads the player's saved locale preference from `document.cookie`.
 * Returns `undefined` when no such cookie is set, or when reading cookies
 * throws (disabled/restricted mode) — degrades silently, same spirit as
 * `progressStorage.ts` for `localStorage`. Thin wrapper over
 * `cookieStorage.ts`'s generic `readCookie`, shared with
 * `libraryFiltersStorage.ts`.
 */
export function readLocaleCookie(): string | undefined {
  return readCookie(COOKIE_NAME);
}

/**
 * Persists the player's locale choice to a long-lived cookie. Degrades
 * silently (nothing saved, no error thrown) if writing cookies is
 * unavailable or throws — the caller still applies the locale in-memory for
 * the current page view regardless of whether persistence succeeded. Thin
 * wrapper over `cookieStorage.ts`'s generic `writeCookie`, shared with
 * `libraryFiltersStorage.ts`.
 */
export function writeLocaleCookie(locale: Locale): void {
  writeCookie(COOKIE_NAME, locale);
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
        interpolateAriaLabelTokens(
          translate(locale, key as TranslationKey),
          element,
          locale,
        ),
      );
    }
  }
}

/**
 * Substitutes the placeholder tokens a translated `aria-label` template may
 * contain, each a no-op (label returned unchanged at that step) whenever its
 * own token is absent, so every other `data-i18n-aria` element is unaffected
 * by tokens it doesn't use:
 * - `{number}`: the element's own 1-based `data-color-index` — the same
 *   index already baked for that element's click handling, reused here
 *   rather than introducing a second indexing scheme just for the label
 *   (e.g. `play.swatchColorAriaLabel`, "Color {number}") — see
 *   `.vibe/decisions/029-swatch-aria-label-number-placeholder.md`.
 * - `{label}`: the element's own current `textContent` — used by an
 *   element whose accessible name must both keep its own visible text
 *   (WCAG 2.5.3 Label in Name) and append translated context, e.g. the
 *   library page's solved-puzzle link, whose visible text (puzzle name +
 *   dimensions) is never itself translated.
 * - `{status}`: the translated `library.solvedBadge` word — reused rather
 *   than duplicated so the puzzle link's spoken solved status can never
 *   drift from the visible badge's own text — see
 *   `.vibe/decisions/031-solved-link-aria-label-composes-badge-translation.md`.
 * - `{row}`/`{column}`: the element's own 1-based `data-row`/`data-col` —
 *   the puzzle editor's grid cells already carry these for click/keyboard
 *   handling, reused here rather than a second position-tracking scheme, so
 *   a screen-reader user gets the same "row 3, column 7" context a sighted
 *   contributor now reads off the grid's own row/column number headers.
 */
function interpolateAriaLabelTokens(
  label: string,
  element: HTMLElement,
  locale: Locale,
): string {
  const colorIndexAttr = element.getAttribute("data-color-index");
  const withNumber =
    colorIndexAttr === null
      ? label
      : label.replace("{number}", String(Number(colorIndexAttr) + 1));

  const rowAttr = element.getAttribute("data-row");
  const withRow =
    rowAttr === null
      ? withNumber
      : withNumber.replace("{row}", String(Number(rowAttr) + 1));

  const columnAttr = element.getAttribute("data-col");
  const withColumn =
    columnAttr === null
      ? withRow
      : withRow.replace("{column}", String(Number(columnAttr) + 1));

  return withColumn
    .replace("{label}", element.textContent ?? "")
    .replace("{status}", translate(locale, "library.solvedBadge"));
}
