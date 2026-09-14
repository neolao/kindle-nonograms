import { DEFAULT_LOCALE, type Locale, translate } from "./i18n.js";

const STAR_COUNT = 5;
// Each star is worth 2 of the 10 possible points, so the 1-10 score always
// divides into a whole number of stars — no half-star glyph ever needed.
const POINTS_PER_STAR = 10 / STAR_COUNT;

/**
 * Renders a puzzle's difficulty (see {@link computePuzzleDifficulty}) as a
 * row of 5 filled/empty stars, shown identically on the library page, the
 * play page, and the editor's solvability confirmation (see
 * `.vibe/decisions/048-difficulty-shown-as-star-row-not-digits.md`). Purely
 * visual and decorative (`aria-hidden`) — the actual "Difficulty N/10"
 * wording is still present as `.sr-only` text right next to it, the same
 * icon-plus-hidden-label pattern already used by every other icon in the
 * app, so the rating is never lost to assistive tech just because it has
 * no visible digits.
 *
 * `score` is clamped to the valid 1-10 range and rounded to the nearest
 * whole number first, so a caller can never end up drawing more or fewer
 * than 5 stars even from an out-of-range or fractional input — defensive
 * rather than relying on every caller to already only ever pass a value
 * `computePuzzleDifficulty` itself would produce.
 *
 * `locale` defaults to English, matching every other piece of baked-then-
 * retranslated static markup `site`'s renderers produce (a later
 * `applyLocale()` hydration pass corrects it from the `data-i18n` tag).
 * A caller that builds this markup *after* that one-time page-wide sweep
 * already ran — the editor's solvability confirmation, rebuilt fresh on
 * every button click — must pass its own already-resolved locale
 * explicitly instead, or the badge would show English text stranded
 * inside an otherwise-translated sentence until (if ever) the language is
 * switched again.
 */
export function renderDifficultyBadge(
  score: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const clamped = Math.min(10, Math.max(1, Math.round(score)));
  const filled = Math.ceil(clamped / POINTS_PER_STAR);
  const empty = STAR_COUNT - filled;
  const stars = "★".repeat(filled) + "☆".repeat(empty);

  const label = translate(locale, "puzzle.difficultyLabel");
  return `<span class="difficulty-badge"><span aria-hidden="true">${stars}</span><span class="sr-only"><span data-i18n="puzzle.difficultyLabel">${label}</span> ${clamped}/10</span></span>`;
}
