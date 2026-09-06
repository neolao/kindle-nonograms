import {
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
} from "@kindle-nonograms/shared";

/**
 * Renders the inline, non-module `<script>` every generated page's `<head>`
 * places immediately after its `<meta charset>` — first thing in `<head>`,
 * ahead of the `<style>` block and the module bundle's
 * `<script type="module">`. Do not move it: a classic (non-module) inline
 * script with no `src` runs synchronously the instant the HTML parser
 * reaches it, unlike a `<script type="module">`, which is always deferred
 * until after the whole document is parsed — moving this after that tag,
 * or turning it into a module itself, would silently defeat the fix (no
 * test would fail, `<html lang>` would just go back to always being `en`
 * until hydration corrects it).
 *
 * Reads the visitor's saved locale cookie and applies it to
 * `document.documentElement.lang` synchronously, before the browser paints
 * anything or the deferred hydration bundle runs — there is no per-request
 * server render to know a visitor's locale at build time (see
 * `.vibe/decisions/024-blocking-inline-script-sets-early-lang.md`).
 *
 * Only ever narrows to an exact value in {@link SUPPORTED_LOCALES}: a
 * missing cookie, an unsupported/tampered value, or `document.cookie`
 * throwing (a restricted/disabled-cookies mode — same fallible-read
 * assumption as `readLocaleCookie` in `packages/client/src/i18n.ts`) all
 * leave the page's own baked-in `lang="en"` default untouched, silently.
 * Deliberately does not also fall back to `navigator.language` the way the
 * client's `resolveLocale()` does — that later, unchanged `applyLocale()`
 * hydration pass still runs afterward and corrects `lang` (and
 * retranslates every `[data-i18n]` element) for a visitor who has no saved
 * cookie yet, so this script only needs to close the gap the cookie alone
 * can close.
 */
export function renderEarlyLangScript(): string {
  const supportedLocalesJson = JSON.stringify(SUPPORTED_LOCALES);
  return `<script>(function(){try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)/);var c=m&&decodeURIComponent(m[1]);if(${supportedLocalesJson}.indexOf(c)!==-1){document.documentElement.lang=c;}}catch(e){}})();</script>`;
}
