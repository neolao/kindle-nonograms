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
  "play.modeFill",
  "play.modeCross",
  "play.winBanner.solved",
  "play.check",
  "play.winBanner.notSolved",
  "play.winBanner.corrected",
  "i18n.languageSwitcherLabel",
  "play.backToLibrary",
  "library.sectionLabel",
  "library.filterSizeLabel",
  "library.filterSizeAll",
  "library.filterSizeSmall",
  "library.filterSizeMedium",
  "library.filterSizeLarge",
  "library.filterColorLabel",
  "library.filterColorAll",
  "library.filterColorMono",
  "library.filterColorMulti",
  "library.filterNoResults",
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
    expect(translate("en", "play.modeFill")).toBe("Fill");
    expect(translate("en", "play.modeCross")).toBe("Cross");
    expect(translate("en", "play.winBanner.solved")).toBe("Puzzle solved!");
    expect(translate("en", "play.check")).toBe("Check");
    expect(translate("en", "play.winBanner.notSolved")).toBe("Not solved yet");
    expect(translate("en", "play.winBanner.corrected")).toBe(
      "Some mistakes were fixed — keep going!",
    );
    expect(translate("en", "i18n.languageSwitcherLabel")).toBe("Language");
    expect(translate("en", "play.backToLibrary")).toBe("Back to puzzle list");
    expect(translate("en", "library.sectionLabel")).toBe("Choose a puzzle");
    expect(translate("en", "library.filterSizeLabel")).toBe("Size");
    expect(translate("en", "library.filterSizeAll")).toBe("All sizes");
    expect(translate("en", "library.filterSizeSmall")).toBe("Small");
    expect(translate("en", "library.filterSizeMedium")).toBe("Medium");
    expect(translate("en", "library.filterSizeLarge")).toBe("Large");
    expect(translate("en", "library.filterColorLabel")).toBe("Color");
    expect(translate("en", "library.filterColorAll")).toBe("All colors");
    expect(translate("en", "library.filterColorMono")).toBe("Monochrome only");
    expect(translate("en", "library.filterColorMulti")).toBe(
      "Multi-color only",
    );
    expect(translate("en", "library.filterNoResults")).toBe(
      "No puzzles match these filters.",
    );
  });

  it("returns the exact French string for each key", () => {
    expect(translate("fr", "library.title")).toBe("Kindle Nonograms");
    expect(translate("fr", "library.empty")).toBe(
      "Aucun puzzle disponible pour le moment.",
    );
    expect(translate("fr", "library.solvedBadge")).toBe("Résolu");
    expect(translate("fr", "play.modeFill")).toBe("Remplir");
    expect(translate("fr", "play.modeCross")).toBe("Croix");
    expect(translate("fr", "play.winBanner.solved")).toBe("Puzzle résolu !");
    expect(translate("fr", "play.check")).toBe("Vérifier");
    expect(translate("fr", "play.winBanner.notSolved")).toBe(
      "Pas encore résolu",
    );
    expect(translate("fr", "play.winBanner.corrected")).toBe(
      "Certaines erreurs ont été corrigées, continuez !",
    );
    expect(translate("fr", "i18n.languageSwitcherLabel")).toBe("Langue");
    expect(translate("fr", "play.backToLibrary")).toBe(
      "Retour à la liste des puzzles",
    );
    expect(translate("fr", "library.sectionLabel")).toBe("Choisir un puzzle");
    expect(translate("fr", "library.filterSizeLabel")).toBe("Taille");
    expect(translate("fr", "library.filterSizeAll")).toBe("Toutes les tailles");
    expect(translate("fr", "library.filterSizeSmall")).toBe("Petit");
    expect(translate("fr", "library.filterSizeMedium")).toBe("Moyen");
    expect(translate("fr", "library.filterSizeLarge")).toBe("Grand");
    expect(translate("fr", "library.filterColorLabel")).toBe("Couleur");
    expect(translate("fr", "library.filterColorAll")).toBe(
      "Toutes les couleurs",
    );
    expect(translate("fr", "library.filterColorMono")).toBe(
      "Monochrome uniquement",
    );
    expect(translate("fr", "library.filterColorMulti")).toBe(
      "Multicolore uniquement",
    );
    expect(translate("fr", "library.filterNoResults")).toBe(
      "Aucun puzzle ne correspond à ces filtres.",
    );
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
