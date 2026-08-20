/**
 * Shared translation table: every UI string, keyed by a stable identifier,
 * with an English and a French rendering. Consumed by both the static-site
 * generator and the client hydration scripts so no string is duplicated
 * across locales.
 */

/** A locale this project ships a translation table for. */
export type Locale = "en" | "fr";

/** Every locale a player can pick, in the order the language switcher lists them. */
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "fr"];

/** The locale used when no supported locale can be determined for a player. */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Identifier for a single translatable UI string. Grouped by the page/area
 * it belongs to (`library.*`, `play.*`, `i18n.*`).
 */
export type TranslationKey =
  | "library.title"
  | "library.empty"
  | "library.solvedBadge"
  | "play.modeFill"
  | "play.modeCross"
  | "play.winBanner.solved"
  | "play.check"
  | "play.winBanner.notSolved"
  | "play.winBanner.corrected"
  | "i18n.languageSwitcherLabel"
  | "play.backToLibrary"
  | "library.sectionLabel"
  | "library.filterSizeLabel"
  | "library.filterSizeAll"
  | "library.filterSizeSmall"
  | "library.filterSizeMedium"
  | "library.filterSizeLarge"
  | "library.filterColorLabel"
  | "library.filterColorAll"
  | "library.filterColorMono"
  | "library.filterColorMulti"
  | "library.filterNoResults"
  | "library.createPuzzleLink"
  | "editor.title"
  | "editor.sizeLabel"
  | "editor.widthLabel"
  | "editor.heightLabel"
  | "editor.paletteLabel"
  | "editor.canvasLabel"
  | "editor.metaLabel"
  | "editor.nameLabel"
  | "editor.filenameLabel"
  | "editor.export"
  | "editor.addColor"
  | "editor.modePaint"
  | "editor.modeErase"
  | "editor.selectColorAriaLabel"
  | "editor.editColorAriaLabel"
  | "editor.removeColorAriaLabel";

const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "library.title": "Kindle Nonograms",
    "library.empty": "No puzzles are available yet.",
    "library.solvedBadge": "Solved",
    "play.modeFill": "Fill",
    "play.modeCross": "Cross",
    "play.winBanner.solved": "Puzzle solved!",
    "play.check": "Check",
    "play.winBanner.notSolved": "Not solved yet",
    "play.winBanner.corrected": "Some mistakes were fixed — keep going!",
    "i18n.languageSwitcherLabel": "Language",
    "play.backToLibrary": "Back to puzzle list",
    "library.sectionLabel": "Choose a puzzle",
    "library.filterSizeLabel": "Size",
    "library.filterSizeAll": "All sizes",
    "library.filterSizeSmall": "Small",
    "library.filterSizeMedium": "Medium",
    "library.filterSizeLarge": "Large",
    "library.filterColorLabel": "Color",
    "library.filterColorAll": "All colors",
    "library.filterColorMono": "Monochrome only",
    "library.filterColorMulti": "Multi-color only",
    "library.filterNoResults": "No puzzles match these filters.",
    "library.createPuzzleLink": "Create a puzzle",
    "editor.title": "Puzzle Editor",
    "editor.sizeLabel": "Grid size",
    "editor.widthLabel": "Width",
    "editor.heightLabel": "Height",
    "editor.paletteLabel": "Palette",
    "editor.canvasLabel": "Canvas",
    "editor.metaLabel": "Name and export",
    "editor.nameLabel": "Puzzle name",
    "editor.filenameLabel": "Filename (id)",
    "editor.export": "Export",
    "editor.addColor": "Add color",
    "editor.modePaint": "Paint",
    "editor.modeErase": "Erase",
    "editor.selectColorAriaLabel": "Select color",
    "editor.editColorAriaLabel": "Edit color",
    "editor.removeColorAriaLabel": "Remove color",
  },
  fr: {
    "library.title": "Kindle Nonograms",
    "library.empty": "Aucun puzzle disponible pour le moment.",
    "library.solvedBadge": "Résolu",
    "play.modeFill": "Remplir",
    "play.modeCross": "Croix",
    "play.winBanner.solved": "Puzzle résolu !",
    "play.check": "Vérifier",
    "play.winBanner.notSolved": "Pas encore résolu",
    "play.winBanner.corrected":
      "Certaines erreurs ont été corrigées, continuez !",
    "i18n.languageSwitcherLabel": "Langue",
    "play.backToLibrary": "Retour à la liste des puzzles",
    "library.sectionLabel": "Choisir un puzzle",
    "library.filterSizeLabel": "Taille",
    "library.filterSizeAll": "Toutes les tailles",
    "library.filterSizeSmall": "Petit",
    "library.filterSizeMedium": "Moyen",
    "library.filterSizeLarge": "Grand",
    "library.filterColorLabel": "Couleur",
    "library.filterColorAll": "Toutes les couleurs",
    "library.filterColorMono": "Monochrome uniquement",
    "library.filterColorMulti": "Multicolore uniquement",
    "library.filterNoResults": "Aucun puzzle ne correspond à ces filtres.",
    "library.createPuzzleLink": "Créer un puzzle",
    "editor.title": "Éditeur de puzzle",
    "editor.sizeLabel": "Taille de la grille",
    "editor.widthLabel": "Largeur",
    "editor.heightLabel": "Hauteur",
    "editor.paletteLabel": "Palette",
    "editor.canvasLabel": "Grille",
    "editor.metaLabel": "Nom et export",
    "editor.nameLabel": "Nom du puzzle",
    "editor.filenameLabel": "Nom de fichier (id)",
    "editor.export": "Exporter",
    "editor.addColor": "Ajouter une couleur",
    "editor.modePaint": "Peindre",
    "editor.modeErase": "Effacer",
    "editor.selectColorAriaLabel": "Choisir la couleur",
    "editor.editColorAriaLabel": "Modifier la couleur",
    "editor.removeColorAriaLabel": "Retirer la couleur",
  },
};

/**
 * Returns the translated string for `key` in `locale`. Falls back to
 * {@link DEFAULT_LOCALE} when `locale` is not one of {@link SUPPORTED_LOCALES}
 * — callers may receive a locale from an untyped source (a cookie, a browser
 * header) that bypasses the `Locale` type at runtime, and a missing
 * translation must degrade gracefully rather than throw.
 */
export function translate(locale: Locale, key: TranslationKey): string {
  const table = TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
  return table[key];
}

/** Narrows an arbitrary value to `Locale` when it is one of {@link SUPPORTED_LOCALES}. */
export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}
