const BLACK = "#000000";
const WHITE = "#ffffff";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

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
 * ratio against a given `#rrggbb` background color, so a glyph painted on
 * top of a solid fill stays readable regardless of the fill's hue.
 *
 * Falls back to black for a malformed color instead of throwing, in the
 * same "degrade silently" spirit as the rest of the client (see
 * `progressStorage.ts`).
 */
export function contrastingTextColor(backgroundHex: string): string {
  if (!HEX_COLOR_PATTERN.test(backgroundHex)) {
    return BLACK;
  }

  const backgroundLuminance = relativeLuminance(backgroundHex);
  const contrastWithBlack = contrastRatio(backgroundLuminance, 0);
  const contrastWithWhite = contrastRatio(backgroundLuminance, 1);

  return contrastWithWhite > contrastWithBlack ? WHITE : BLACK;
}
