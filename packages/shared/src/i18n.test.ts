import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  type Locale,
  SUPPORTED_LOCALES,
  type TranslationKey,
  isSupportedLocale,
  translate,
} from "./i18n.js";

const ALL_KEYS: TranslationKey[] = [
  "library.title",
  "library.empty",
  "library.solvedBadge",
  "library.solvedPuzzleLinkAriaLabel",
  "play.modeFill",
  "play.modeCross",
  "play.winBanner.solved",
  "play.check",
  "play.winBanner.notSolved",
  "play.winBanner.corrected",
  "play.restoreWarning",
  "i18n.languageSwitcherLabel",
  "play.backToLibrary",
  "library.sectionLabel",
  "library.filterColorLabel",
  "library.filterColorMono",
  "library.filterColorMulti",
  "library.sortRecentLabel",
  "library.filterNoResults",
  "library.paginationPrev",
  "library.paginationNext",
  "library.paginationStatusLabel",
  "editor.error.emptyName",
  "editor.error.emptyFilename",
  "editor.error.imageUnsupported",
  "editor.error.imageUnreadable",
  "editor.error.imageTimeout",
  "editor.error.invalidGridSize",
  "editor.error.unexpected",
  "editor.exportConfirmation",
  "play.swatchColorAriaLabel",
  "editor.selectColorAriaLabel",
  "editor.editColorAriaLabel",
  "editor.removeColorAriaLabel",
  "library.opensInNewTab",
  "editor.cellColorAriaLabel",
  "editor.cellEmptyAriaLabel",
  "editor.importJsonLabel",
  "editor.importJsonFileLabel",
  "editor.importJsonButton",
  "editor.importJsonHint",
  "editor.solvabilityLabel",
  "editor.checkSolvabilityButton",
  "editor.error.importJsonNoFile",
  "editor.error.importJsonInvalid",
  "editor.error.importJsonTooLarge",
  "editor.importJsonConfirmation",
  "editor.solvabilityOk",
  "editor.error.solvabilityNoFilledCells",
  "editor.error.solvabilityProblem",
  "editor.solvabilitySuggestion",
  "editor.valueEmptyLabel",
  "editor.valueColorLabel",
];

describe("SUPPORTED_LOCALES and DEFAULT_LOCALE", () => {
  it("lists English and French as the supported locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "fr"]);
  });

  it("defaults to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

describe("translate", () => {
  it("returns the exact English string for each key", () => {
    expect(translate("en", "library.title")).toBe("Kindle Nonograms");
    expect(translate("en", "library.empty")).toBe(
      "No puzzles are available yet.",
    );
    expect(translate("en", "library.solvedBadge")).toBe("Solved");
    expect(translate("en", "library.solvedPuzzleLinkAriaLabel")).toBe(
      "{label}, {status}",
    );
    expect(translate("en", "play.modeFill")).toBe("Fill");
    expect(translate("en", "play.modeCross")).toBe("Cross");
    expect(translate("en", "play.winBanner.solved")).toBe("Puzzle solved!");
    expect(translate("en", "play.check")).toBe("Check");
    expect(translate("en", "play.winBanner.notSolved")).toBe("Not solved yet");
    expect(translate("en", "play.winBanner.corrected")).toBe(
      "Some wrong cells were cleared — keep going!",
    );
    expect(translate("en", "play.loadError")).toBe(
      "This puzzle couldn't be loaded",
    );
    expect(translate("en", "play.restoreWarning")).toBe(
      "Your saved progress for this puzzle could not be restored.",
    );
    expect(translate("en", "i18n.languageSwitcherLabel")).toBe("Language");
    expect(translate("en", "play.backToLibrary")).toBe("Back to puzzle list");
    expect(translate("en", "library.sectionLabel")).toBe("Choose a puzzle");
    expect(translate("en", "library.filterColorLabel")).toBe("Color");
    expect(translate("en", "library.filterColorMono")).toBe("Monochrome only");
    expect(translate("en", "library.filterColorMulti")).toBe(
      "Multi-color only",
    );
    expect(translate("en", "library.sortRecentLabel")).toBe("Recently opened");
    expect(translate("en", "library.filterNoResults")).toBe(
      "No puzzles match these filters.",
    );
    expect(translate("en", "library.paginationPrev")).toBe("Previous");
    expect(translate("en", "library.paginationNext")).toBe("Next");
    expect(translate("en", "library.paginationStatusLabel")).toBe("Page");
    expect(translate("en", "editor.error.emptyName")).toBe(
      "Puzzle name is required.",
    );
    expect(translate("en", "editor.error.emptyFilename")).toBe(
      "Filename is required.",
    );
    expect(translate("en", "editor.error.imageUnsupported")).toBe(
      "This browser can't import images.",
    );
    expect(translate("en", "editor.error.imageUnreadable")).toBe(
      "Couldn't read this image file. Try a different one.",
    );
    expect(translate("en", "editor.error.imageTimeout")).toBe(
      "This image took too long to load.",
    );
    expect(translate("en", "editor.error.invalidGridSize")).toBe(
      "Width and height must be whole numbers from 1 to {max}.",
    );
    expect(translate("en", "editor.error.unexpected")).toBe(
      "Something went wrong. Please try again.",
    );
    expect(translate("en", "editor.exportConfirmation")).toBe(
      "Exported {filename} — download started.",
    );
    expect(translate("en", "play.swatchColorAriaLabel")).toBe("Color {number}");
    expect(translate("en", "editor.selectColorAriaLabel")).toBe(
      "Select color {number}",
    );
    expect(translate("en", "editor.editColorAriaLabel")).toBe(
      "Edit color {number}",
    );
    expect(translate("en", "editor.removeColorAriaLabel")).toBe(
      "Remove color {number}",
    );
    expect(translate("en", "library.opensInNewTab")).toBe("opens in a new tab");
    expect(translate("en", "editor.cellColorAriaLabel")).toBe(
      "Row {row}, column {column}, Color {number}",
    );
    expect(translate("en", "editor.cellEmptyAriaLabel")).toBe(
      "Row {row}, column {column}, Empty",
    );
    expect(translate("en", "editor.importJsonLabel")).toBe("Import puzzle");
    expect(translate("en", "editor.importJsonFileLabel")).toBe("Puzzle file");
    expect(translate("en", "editor.importJsonButton")).toBe("Import");
    expect(translate("en", "editor.importJsonHint")).toBe(
      "Loads an existing puzzle file (this project's own format, or a reMarkable export) — replaces the current grid, palette, name, and filename.",
    );
    expect(translate("en", "editor.solvabilityLabel")).toBe(
      "Solvability check",
    );
    expect(translate("en", "editor.checkSolvabilityButton")).toBe(
      "Check solvability",
    );
    expect(translate("en", "editor.error.importJsonNoFile")).toBe(
      "Choose a puzzle file first.",
    );
    expect(translate("en", "editor.error.importJsonInvalid")).toBe(
      "This file isn't a valid puzzle.",
    );
    expect(translate("en", "editor.error.importJsonTooLarge")).toBe(
      "This puzzle is too large to edit here (max {max}×{max}).",
    );
    expect(translate("en", "editor.importJsonConfirmation")).toBe(
      "Imported {filename}.",
    );
    expect(translate("en", "editor.solvabilityOk")).toBe(
      "This puzzle is fully solvable by logical deduction alone — no guessing required.",
    );
    expect(translate("en", "editor.error.solvabilityNoFilledCells")).toBe(
      "This puzzle has no filled cells — nothing to check.",
    );
    expect(translate("en", "editor.error.solvabilityProblem")).toBe(
      "Not solvable without guessing. Problem rows: {rows}. Problem columns: {columns}.",
    );
    expect(translate("en", "editor.solvabilitySuggestion")).toBe(
      "Also try: change row {row}, column {column} to {value} — that alone would make it solvable.",
    );
    expect(translate("en", "editor.valueEmptyLabel")).toBe("Empty");
    expect(translate("en", "editor.valueColorLabel")).toBe("Color {number}");
  });

  it("returns the exact French string for each key", () => {
    expect(translate("fr", "library.title")).toBe("Kindle Nonograms");
    expect(translate("fr", "library.empty")).toBe(
      "Aucun puzzle disponible pour le moment.",
    );
    expect(translate("fr", "library.solvedBadge")).toBe("Résolu");
    expect(translate("fr", "library.solvedPuzzleLinkAriaLabel")).toBe(
      "{label}, {status}",
    );
    expect(translate("fr", "play.modeFill")).toBe("Remplir");
    expect(translate("fr", "play.modeCross")).toBe("Croix");
    expect(translate("fr", "play.winBanner.solved")).toBe("Puzzle résolu !");
    expect(translate("fr", "play.check")).toBe("Vérifier");
    expect(translate("fr", "play.winBanner.notSolved")).toBe(
      "Pas encore résolu",
    );
    expect(translate("fr", "play.winBanner.corrected")).toBe(
      "Certaines cases incorrectes ont été effacées, continuez !",
    );
    expect(translate("fr", "play.loadError")).toBe(
      "Ce puzzle n'a pas pu être chargé",
    );
    expect(translate("fr", "play.restoreWarning")).toBe(
      "Votre progression enregistrée pour ce puzzle n'a pas pu être restaurée.",
    );
    expect(translate("fr", "i18n.languageSwitcherLabel")).toBe("Langue");
    expect(translate("fr", "play.backToLibrary")).toBe(
      "Retour à la liste des puzzles",
    );
    expect(translate("fr", "library.sectionLabel")).toBe("Choisir un puzzle");
    expect(translate("fr", "library.filterColorLabel")).toBe("Couleur");
    expect(translate("fr", "library.filterColorMono")).toBe(
      "Monochrome uniquement",
    );
    expect(translate("fr", "library.filterColorMulti")).toBe(
      "Multicolore uniquement",
    );
    expect(translate("fr", "library.sortRecentLabel")).toBe(
      "Récemment ouverts",
    );
    expect(translate("fr", "library.filterNoResults")).toBe(
      "Aucun puzzle ne correspond à ces filtres.",
    );
    expect(translate("fr", "library.paginationPrev")).toBe("Précédent");
    expect(translate("fr", "library.paginationNext")).toBe("Suivant");
    expect(translate("fr", "library.paginationStatusLabel")).toBe("Page");
    expect(translate("fr", "editor.error.emptyName")).toBe(
      "Le nom du puzzle est requis.",
    );
    expect(translate("fr", "editor.error.emptyFilename")).toBe(
      "Le nom de fichier est requis.",
    );
    expect(translate("fr", "editor.error.imageUnsupported")).toBe(
      "Ce navigateur ne peut pas importer d'images.",
    );
    expect(translate("fr", "editor.error.imageUnreadable")).toBe(
      "Impossible de lire ce fichier image. Essayez-en un autre.",
    );
    expect(translate("fr", "editor.error.imageTimeout")).toBe(
      "Le chargement de cette image a pris trop de temps.",
    );
    expect(translate("fr", "editor.error.invalidGridSize")).toBe(
      "La largeur et la hauteur doivent être des nombres entiers de 1 à {max}.",
    );
    expect(translate("fr", "editor.error.unexpected")).toBe(
      "Une erreur est survenue. Veuillez réessayer.",
    );
    expect(translate("fr", "editor.exportConfirmation")).toBe(
      "Exporté {filename} — téléchargement lancé.",
    );
    expect(translate("fr", "play.swatchColorAriaLabel")).toBe(
      "Couleur {number}",
    );
    expect(translate("fr", "editor.selectColorAriaLabel")).toBe(
      "Choisir la couleur {number}",
    );
    expect(translate("fr", "editor.editColorAriaLabel")).toBe(
      "Modifier la couleur {number}",
    );
    expect(translate("fr", "editor.removeColorAriaLabel")).toBe(
      "Retirer la couleur {number}",
    );
    expect(translate("fr", "library.opensInNewTab")).toBe(
      "s'ouvre dans un nouvel onglet",
    );
    expect(translate("fr", "editor.cellColorAriaLabel")).toBe(
      "Ligne {row}, colonne {column}, Couleur {number}",
    );
    expect(translate("fr", "editor.cellEmptyAriaLabel")).toBe(
      "Ligne {row}, colonne {column}, Vide",
    );
    expect(translate("fr", "editor.importJsonLabel")).toBe(
      "Importer un puzzle",
    );
    expect(translate("fr", "editor.importJsonFileLabel")).toBe(
      "Fichier puzzle",
    );
    expect(translate("fr", "editor.importJsonButton")).toBe("Importer");
    expect(translate("fr", "editor.importJsonHint")).toBe(
      "Charge un fichier puzzle existant (le format natif du projet, ou un export reMarkable) — remplace la grille, la palette, le nom et le nom de fichier actuels.",
    );
    expect(translate("fr", "editor.solvabilityLabel")).toBe(
      "Vérification de solvabilité",
    );
    expect(translate("fr", "editor.checkSolvabilityButton")).toBe(
      "Vérifier la solvabilité",
    );
    expect(translate("fr", "editor.error.importJsonNoFile")).toBe(
      "Choisissez d'abord un fichier puzzle.",
    );
    expect(translate("fr", "editor.error.importJsonInvalid")).toBe(
      "Ce fichier n'est pas un puzzle valide.",
    );
    expect(translate("fr", "editor.error.importJsonTooLarge")).toBe(
      "Ce puzzle est trop grand pour être édité ici (max {max}×{max}).",
    );
    expect(translate("fr", "editor.importJsonConfirmation")).toBe(
      "Importé {filename}.",
    );
    expect(translate("fr", "editor.solvabilityOk")).toBe(
      "Ce puzzle est entièrement résolvable par déduction logique — aucune supposition nécessaire.",
    );
    expect(translate("fr", "editor.error.solvabilityNoFilledCells")).toBe(
      "Ce puzzle n'a aucune case remplie — rien à vérifier.",
    );
    expect(translate("fr", "editor.error.solvabilityProblem")).toBe(
      "Non résolvable sans deviner. Lignes concernées : {rows}. Colonnes concernées : {columns}.",
    );
    expect(translate("fr", "editor.solvabilitySuggestion")).toBe(
      "Essayez aussi : changez la case ligne {row}, colonne {column} en {value} — cela suffirait à le rendre solvable.",
    );
    expect(translate("fr", "editor.valueEmptyLabel")).toBe("Vide");
    expect(translate("fr", "editor.valueColorLabel")).toBe("Couleur {number}");
  });

  it("has a non-empty string for every key in every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of ALL_KEYS) {
        expect(translate(locale, key).length).toBeGreaterThan(0);
      }
    }
  });

  it("falls back to the default locale when given an unsupported locale value", () => {
    const bogusLocale = "de" as unknown as Locale;
    expect(translate(bogusLocale, "play.modeFill")).toBe(
      translate(DEFAULT_LOCALE, "play.modeFill"),
    );
  });
});

describe("play.winBanner.corrected wording", () => {
  it("does not claim wrong cells were fixed or corrected in English", () => {
    const message = translate("en", "play.winBanner.corrected");
    expect(message.toLowerCase()).not.toMatch(/fixed|corrected/);
  });

  it("does not claim wrong cells were corrected in French", () => {
    const message = translate("fr", "play.winBanner.corrected");
    expect(message.toLowerCase()).not.toMatch(/corrig/);
  });
});

describe("isSupportedLocale", () => {
  it("returns true for every supported locale value", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(true);
  });

  it("returns false for an unsupported locale string", () => {
    expect(isSupportedLocale("de")).toBe(false);
  });

  it("returns false for non-string and malformed input", () => {
    expect(isSupportedLocale("")).toBe(false);
    expect(isSupportedLocale("EN")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(42)).toBe(false);
  });
});
