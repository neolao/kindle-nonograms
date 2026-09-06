import {
  DEFAULT_LOCALE,
  NATIVE_LOCALE_NAMES,
  SUPPORTED_LOCALES,
  translate,
} from "@kindle-nonograms/shared";

/**
 * Renders the FR/EN language switcher shared by every page that has one
 * (the library and the editor pages — see
 * `.vibe/decisions/022-editor-language-switcher-in-footer.md`), English
 * selected by default since the locale itself isn't known at build time —
 * the client's `applyLocale`-driven hydration corrects the selected option,
 * along with every other `[data-i18n]`/`[data-i18n-aria]` element, before
 * the page is perceived as painted (see
 * `.ux/decisions/001-frozen-chrome-blocking-reconciliation.md`). A native
 * `<select>`, kept native rather than a custom control for reliable
 * touch/keyboard behavior on Kindle's old WebKit. Pulled into its own
 * module so every page with a switcher renders byte-identical markup
 * instead of two hand-maintained copies that could silently drift apart.
 */
export function renderLanguageSwitcher(): string {
  const options = SUPPORTED_LOCALES.map(
    (locale) =>
      `<option value="${locale}"${locale === DEFAULT_LOCALE ? " selected" : ""}>${NATIVE_LOCALE_NAMES[locale]}</option>`,
  ).join("");
  return `<div class="language-switcher"><label for="language-switcher-select" data-i18n="i18n.languageSwitcherLabel">${translate(DEFAULT_LOCALE, "i18n.languageSwitcherLabel")}</label><select id="language-switcher-select" data-role="language-switcher-select">${options}</select></div>`;
}
