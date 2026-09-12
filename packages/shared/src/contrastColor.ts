const BLACK = "#000000";
const WHITE = "#ffffff";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const HEX_SHORTHAND_PATTERN = /^#[0-9a-fA-F]{3}$/;
const HEX_ALPHA_PATTERN = /^#[0-9a-fA-F]{8}$/;

/**
 * Normalizes a background color to strict `#rrggbb` for
 * `contrastingTextColor`: expands 3-digit shorthand (`#rgb`), drops the
 * trailing alpha byte of 8-digit hex (`#rrggbbaa` — the fill always renders
 * opaque as a puzzle swatch, so alpha plays no part in the contrast
 * decision), and passes strict 6-digit hex through unchanged. Anything else
 * (wrong length, non-hex characters, the 4-digit `#rgba` shorthand) is not
 * a format this fix adds support for and returns `null`, same as any other
 * malformed input.
 */
function normalizeBackgroundHex(color: string): string | null {
  if (HEX_COLOR_PATTERN.test(color)) {
    return color;
  }
  if (HEX_SHORTHAND_PATTERN.test(color)) {
    const [r, g, b] = color.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (HEX_ALPHA_PATTERN.test(color)) {
    return color.slice(0, 7);
  }
  return null;
}

function linearizeChannel(srgb: number): number {
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

// WCAG relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function relativeLuminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

// WCAG contrast ratio: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
function contrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks black or white as the text color that gives the best WCAG contrast
 * ratio against a given background color, so a glyph painted on top of a
 * solid fill stays readable regardless of the fill's hue. Accepts strict
 * `#rrggbb`, 3-digit shorthand (`#rgb`), and 8-digit hex with an alpha byte
 * (`#rrggbbaa`, alpha ignored) — see `normalizeBackgroundHex`.
 *
 * Falls back to black for a malformed color instead of throwing, in the
 * same "degrade silently" spirit as the rest of the client (see
 * `progressStorage.ts`).
 */
export function contrastingTextColor(backgroundHex: string): string {
  const normalized = normalizeBackgroundHex(backgroundHex);
  if (!normalized) {
    return BLACK;
  }

  const backgroundLuminance = relativeLuminance(normalized);
  const contrastWithBlack = contrastRatio(backgroundLuminance, 0);
  const contrastWithWhite = contrastRatio(backgroundLuminance, 1);

  return contrastWithWhite > contrastWithBlack ? WHITE : BLACK;
}
