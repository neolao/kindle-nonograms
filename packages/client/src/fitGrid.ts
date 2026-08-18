/**
 * Inputs for computing the single font-size (px) that scales the whole
 * (already `em`-sized) puzzle grid + clues to fit the space available on
 * screen, in place of letting it overflow into a scrollbar.
 */
export interface FitGridInput {
  naturalWidth: number;
  naturalHeight: number;
  availableWidth: number;
  availableHeight: number;
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
 * grid fits within the available width and height: the smaller of the two
 * fit ratios, with a small safety margin, clamped to `[minScale, maxScale]`
 * of `baseFontSizePx`. Rounds down, for the same reason as the safety
 * margin — never round up into a size that no longer fits.
 *
 * Falls back to the base font size (still clamped) when either the natural
 * or the available size is zero or negative — a measurement that can't be
 * trusted, rather than one worth dividing by.
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

  if (
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return Math.floor(clamp(1, minScale, maxScale) * baseFontSizePx);
  }

  const widthRatio = availableWidth / naturalWidth;
  const heightRatio = availableHeight / naturalHeight;
  const rawScale = Math.min(widthRatio, heightRatio) * SAFETY_MARGIN;
  const scale = clamp(rawScale, minScale, maxScale);

  return Math.floor(scale * baseFontSizePx);
}
