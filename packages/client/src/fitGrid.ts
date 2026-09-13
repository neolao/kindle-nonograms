/**
 * Inputs for computing the single font-size (px) that scales the whole
 * (already `em`-sized) puzzle grid + clues to fit the space available on
 * screen, in place of letting it overflow into a scrollbar.
 */
export interface FitGridInput {
  naturalWidth: number;
  naturalHeight: number;
  availableWidth: number;
  /**
   * Omit to fit by width alone — for a page (e.g. the puzzle editor, a
   * normally-scrolling desktop tool) that should never shrink just because
   * the browser window is short. When given, the smaller of the width and
   * height fit ratios wins, as for a fixed-viewport page with no room to
   * scroll (e.g. the play page's chrome budget).
   */
  availableHeight?: number;
  baseFontSizePx: number;
  minScale: number;
  maxScale: number;
}

// Shrinks the raw fit slightly below the exact ratio so a fractional-pixel
// rounding error clips unused margin, never a real cell or clue.
const SAFETY_MARGIN = 0.98;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Computes the font-size (px) to apply to the grid wrapper so the whole
 * grid fits within the available width — and, when `availableHeight` is
 * given, the available height too, whichever of the two fit ratios is
 * smaller — with a small safety margin, clamped to `[minScale, maxScale]`
 * of `baseFontSizePx`. Rounds down, for the same reason as the safety
 * margin — never round up into a size that no longer fits.
 *
 * Falls back to the base font size (still clamped) when the natural or
 * available width is zero or negative, or when a given `availableHeight`
 * pairs with a zero/negative `naturalHeight`/itself — a measurement that
 * can't be trusted, rather than one worth dividing by.
 */
export function computeFitFontSizePx(input: FitGridInput): number {
  const {
    naturalWidth,
    naturalHeight,
    availableWidth,
    availableHeight,
    baseFontSizePx,
    minScale,
    maxScale,
  } = input;

  const heightUnreliable =
    availableHeight !== undefined &&
    (naturalHeight <= 0 || availableHeight <= 0);

  if (naturalWidth <= 0 || availableWidth <= 0 || heightUnreliable) {
    return Math.floor(clamp(1, minScale, maxScale) * baseFontSizePx);
  }

  const widthRatio = availableWidth / naturalWidth;
  const heightRatio =
    availableHeight === undefined
      ? Number.POSITIVE_INFINITY
      : availableHeight / naturalHeight;
  const rawScale = Math.min(widthRatio, heightRatio) * SAFETY_MARGIN;
  const scale = clamp(rawScale, minScale, maxScale);

  return Math.floor(scale * baseFontSizePx);
}
