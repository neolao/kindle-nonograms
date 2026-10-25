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
 * Name of the cookie a player's chosen locale is persisted under. Shared
 * between `packages/client/src/i18n.ts` (which reads/writes it once the
 * hydration bundle runs) and `packages/site/src/earlyLangScript.ts` (which
 * reads it from a tiny inline script, before hydration runs) so the two
 * can never drift onto different cookie names.
 */
export const LOCALE_COOKIE_NAME = "kindle-nonograms-locale";

/**
 * Native display name for each supported locale, always shown in its own
 * language — used to label the language switcher's options, both when the
 * static site generator bakes its default markup and when the client
 * hydration bundle reads/attaches to it.
 */
export const NATIVE_LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

/**
 * Identifier for a single translatable UI string. Grouped by the page/area
 * it belongs to (`library.*`, `play.*`, `i18n.*`), or by `puzzle.*` for a
 * string shown identically on more than one page (e.g. the difficulty
 * badge, shown on both the library and the play page).
 */
export type TranslationKey =
  | "library.title"
  | "library.empty"
  | "library.solvedBadge"
  | "library.solvedPuzzleLinkAriaLabel"
  | "play.modeFill"
  | "play.modeCross"
  | "play.winBanner.solved"
  | "play.check"
  | "play.winBanner.notSolved"
  | "play.winBanner.corrected"
  | "play.restoreWarning"
  | "play.storageWarning"
  | "play.dismissWarning"
  | "play.loadError"
  | "i18n.languageSwitcherLabel"
  | "play.backToLibrary"
  | "library.sectionLabel"
  | "library.filterColorLabel"
  | "library.filterColorMono"
  | "library.filterColorMulti"
  | "library.filterColorMonoAriaLabel"
  | "library.filterColorMultiAriaLabel"
  | "library.filterStatusLabel"
  | "library.filterStatusUnsolved"
  | "library.filterStatusInProgress"
  | "library.filterStatusSolved"
  | "library.sortRecentLabel"
  | "library.filterNoResults"
  | "library.paginationPrev"
  | "library.paginationNext"
  | "library.paginationStatusLabel"
  | "library.createPuzzleLink"
  | "library.contributeLink"
  | "library.opensInNewTab"
  | "editor.title"
  | "editor.sizeLabel"
  | "editor.widthLabel"
  | "editor.heightLabel"
  | "editor.importLabel"
  | "editor.importFileLabel"
  | "editor.importPaletteSizeLabel"
  | "editor.importBackgroundLabel"
  | "editor.importButton"
  | "editor.importHint"
  | "editor.importJsonLabel"
  | "editor.importJsonFileLabel"
  | "editor.importJsonButton"
  | "editor.importJsonHint"
  | "editor.solvabilityLabel"
  | "editor.checkSolvabilityButton"
  | "editor.paletteLabel"
  | "editor.canvasLabel"
  | "editor.metaLabel"
  | "editor.nameLabel"
  | "editor.filenameLabel"
  | "editor.export"
  | "editor.addColor"
  | "editor.modeErase"
  | "editor.selectColorAriaLabel"
  | "editor.editColorAriaLabel"
  | "editor.removeColorAriaLabel"
  | "editor.error.emptyName"
  | "editor.error.emptyFilename"
  | "editor.error.invalidFilenameFormat"
  | "editor.error.imageUnsupported"
  | "editor.error.imageUnreadable"
  | "editor.error.imageTimeout"
  | "editor.error.invalidGridSize"
  | "editor.error.unexpected"
  | "editor.exportConfirmation"
  | "editor.error.importJsonNoFile"
  | "editor.error.importJsonInvalid"
  | "editor.error.importJsonTooLarge"
  | "editor.importJsonConfirmation"
  | "editor.solvabilityOk"
  | "editor.error.solvabilityNoFilledCells"
  | "editor.error.solvabilityProblem"
  | "editor.solvabilitySuggestion"
  | "editor.valueEmptyLabel"
  | "editor.valueColorLabel"
  | "play.swatchColorAriaLabel"
  | "editor.cellColorAriaLabel"
  | "editor.cellEmptyAriaLabel"
  | "puzzle.difficultyLabel"
  | "editor.solvabilityDifficulty"
  | "library.syncLink"
  | "sync.title"
  | "sync.optionalNote"
  | "sync.urlLabel"
  | "sync.urlHint"
  | "sync.keyLabel"
  | "sync.showKey"
  | "sync.hideKey"
  | "sync.saveButton"
  | "sync.testing"
  | "sync.forgetButton"
  | "sync.status.notConfigured"
  | "sync.status.saved"
  | "sync.status.connected"
  | "sync.error.invalidUrl"
  | "sync.error.emptyKey"
  | "sync.error.unauthorized"
  | "sync.error.unreachable"
  | "sync.error.notSyncServer"
  | "sync.error.mixedContent"
  | "sync.error.serverError"
  | "sync.error.storage"
  | "sync.confirmForget"
  | "sync.lastSync"
  | "sync.lastFailed"
  | "sync.neverSynced";

const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    "library.title": "Kindle Nonograms",
    "library.empty": "No puzzles are available yet.",
    "library.solvedBadge": "Solved",
    "library.solvedPuzzleLinkAriaLabel": "{label}, {status}",
    "play.modeFill": "Fill",
    "play.modeCross": "Cross",
    "play.winBanner.solved": "Puzzle solved!",
    "play.check": "Check",
    "play.winBanner.notSolved": "Not solved yet",
    "play.winBanner.corrected": "Some wrong cells were cleared — keep going!",
    "play.restoreWarning":
      "Your saved progress for this puzzle could not be restored.",
    "play.storageWarning": "Progress can't be saved on this device.",
    "play.dismissWarning": "Dismiss",
    "play.loadError": "This puzzle couldn't be loaded",
    "i18n.languageSwitcherLabel": "Language",
    "play.backToLibrary": "Back to puzzle list",
    "library.sectionLabel": "Choose a puzzle",
    "library.filterColorLabel": "Color",
    "library.filterColorMono": "Mono",
    "library.filterColorMulti": "Multi",
    "library.filterColorMonoAriaLabel": "Color: Mono",
    "library.filterColorMultiAriaLabel": "Color: Multi",
    "library.filterStatusLabel": "Status",
    "library.filterStatusUnsolved": "Unsolved",
    "library.filterStatusInProgress": "In progress",
    "library.filterStatusSolved": "Solved",
    "library.sortRecentLabel": "Recently opened",
    "library.filterNoResults": "No puzzles match these filters.",
    "library.paginationPrev": "Previous",
    "library.paginationNext": "Next",
    "library.paginationStatusLabel": "Page",
    "library.createPuzzleLink": "Create a puzzle",
    "library.contributeLink": "Contribute a puzzle on GitHub",
    "library.opensInNewTab": "opens in a new tab",
    "editor.title": "Puzzle Editor",
    "editor.sizeLabel": "Grid size",
    "editor.widthLabel": "Width",
    "editor.heightLabel": "Height",
    "editor.importLabel": "Import image",
    "editor.importFileLabel": "Image file",
    "editor.importPaletteSizeLabel": "Palette size",
    "editor.importBackgroundLabel": "Background color",
    "editor.importButton": "Import",
    "editor.importJsonLabel": "Import puzzle",
    "editor.importJsonFileLabel": "Puzzle file",
    "editor.importJsonButton": "Import",
    "editor.importJsonHint":
      "Loads an existing puzzle file (this project's own format, a reMarkable export, or a pixel-art-serializer export) — replaces the current grid, palette, name, and filename.",
    "editor.solvabilityLabel": "Solvability check",
    "editor.checkSolvabilityButton": "Check solvability",
    "editor.importHint":
      "The image is fitted to the grid size above and reduced to the palette size above; pixels close to the background color become blank.",
    "editor.paletteLabel": "Palette",
    "editor.canvasLabel": "Canvas",
    "editor.metaLabel": "Name and export",
    "editor.nameLabel": "Puzzle name",
    "editor.filenameLabel": "Filename (id)",
    "editor.export": "Export",
    "editor.addColor": "Add color",
    "editor.modeErase": "Erase",
    "editor.selectColorAriaLabel": "Select color {number}",
    "editor.editColorAriaLabel": "Edit color {number}",
    "editor.removeColorAriaLabel": "Remove color {number}",
    "editor.error.emptyName": "Puzzle name is required.",
    "editor.error.emptyFilename": "Filename is required.",
    "editor.error.invalidFilenameFormat":
      "Filename can only contain lowercase letters, digits, hyphens and underscores.",
    "editor.error.imageUnsupported": "This browser can't import images.",
    "editor.error.imageUnreadable":
      "Couldn't read this image file. Try a different one.",
    "editor.error.imageTimeout": "This image took too long to load.",
    "editor.error.invalidGridSize":
      "Width and height must be whole numbers from 1 to {max}.",
    "editor.error.unexpected": "Something went wrong. Please try again.",
    "editor.exportConfirmation": "Exported {filename} — download started.",
    "editor.error.importJsonNoFile": "Choose a puzzle file first.",
    "editor.error.importJsonInvalid": "This file isn't a valid puzzle.",
    "editor.error.importJsonTooLarge":
      "This puzzle is too large to edit here (max {max}×{max}).",
    "editor.importJsonConfirmation": "Imported {filename}.",
    "editor.solvabilityOk":
      "This puzzle is fully solvable by logical deduction alone — no guessing required.",
    "editor.error.solvabilityNoFilledCells":
      "This puzzle has no filled cells — nothing to check.",
    "editor.error.solvabilityProblem":
      "Not solvable without guessing. Problem rows: {rows}. Problem columns: {columns}.",
    "editor.solvabilitySuggestion":
      "Also try: change row {row}, column {column} to {value} — that alone would make it solvable.",
    "editor.valueEmptyLabel": "Empty",
    "editor.valueColorLabel": "Color {number}",
    "play.swatchColorAriaLabel": "Color {number}",
    "editor.cellColorAriaLabel": "Row {row}, column {column}, Color {number}",
    "editor.cellEmptyAriaLabel": "Row {row}, column {column}, Empty",
    "puzzle.difficultyLabel": "Difficulty",
    "editor.solvabilityDifficulty": "Difficulty: {score}/10.",
    "library.syncLink": "Sync progress",
    "sync.title": "Sync",
    "sync.optionalNote":
      "Sync is optional. The game works fully without it. Use it to keep your progress on a server you run yourself.",
    "sync.urlLabel": "Server address (required)",
    "sync.urlHint": "Example: http://192.168.1.20:3000",
    "sync.keyLabel": "Key (required)",
    "sync.showKey": "Show",
    "sync.hideKey": "Hide",
    "sync.saveButton": "Save and test",
    "sync.testing": "Testing…",
    "sync.forgetButton": "Forget this server",
    "sync.status.notConfigured": "Not configured",
    "sync.status.saved": "Server saved. Sync is active.",
    "sync.status.connected": "Connected",
    "sync.error.invalidUrl":
      "Failed: invalid address – enter an address starting with http:// or https://",
    "sync.error.emptyKey": "Failed: no key – enter the key set on the server",
    "sync.error.unauthorized":
      "Failed: wrong key – check the key set on the server",
    "sync.error.unreachable":
      "Failed: server not reachable – check the address and that the server is running",
    "sync.error.notSyncServer": "Failed: not a sync server – check the address",
    "sync.error.mixedContent":
      "Failed: an http address cannot be used from this https page – use an https address",
    "sync.error.serverError":
      "Failed: the server reports an internal error – check the server log",
    "sync.error.storage":
      "Failed: could not save – check that the browser allows local storage",
    "sync.confirmForget":
      "Forget this server? Your progress on this device is kept.",
    "sync.lastSync": "Last sync: {time}",
    "sync.lastFailed": "Last attempt failed",
    "sync.neverSynced": "No sync yet",
  },
  fr: {
    "library.title": "Kindle Nonograms",
    "library.empty": "Aucun puzzle disponible pour le moment.",
    "library.solvedBadge": "Résolu",
    "library.solvedPuzzleLinkAriaLabel": "{label}, {status}",
    "play.modeFill": "Remplir",
    "play.modeCross": "Croix",
    "play.winBanner.solved": "Puzzle résolu !",
    "play.check": "Vérifier",
    "play.winBanner.notSolved": "Pas encore résolu",
    "play.winBanner.corrected":
      "Certaines cases incorrectes ont été effacées, continuez !",
    "play.restoreWarning":
      "Votre progression enregistrée pour ce puzzle n'a pas pu être restaurée.",
    "play.storageWarning":
      "Impossible d'enregistrer la progression sur cet appareil.",
    "play.dismissWarning": "Ignorer",
    "play.loadError": "Ce puzzle n'a pas pu être chargé",
    "i18n.languageSwitcherLabel": "Langue",
    "play.backToLibrary": "Retour à la liste des puzzles",
    "library.sectionLabel": "Choisir un puzzle",
    "library.filterColorLabel": "Couleur",
    "library.filterColorMono": "Mono",
    "library.filterColorMulti": "Multi",
    "library.filterColorMonoAriaLabel": "Couleur : Mono",
    "library.filterColorMultiAriaLabel": "Couleur : Multi",
    "library.filterStatusLabel": "Statut",
    "library.filterStatusUnsolved": "Non résolu",
    "library.filterStatusInProgress": "En cours",
    "library.filterStatusSolved": "Résolu",
    "library.sortRecentLabel": "Récemment ouverts",
    "library.filterNoResults": "Aucun puzzle ne correspond à ces filtres.",
    "library.paginationPrev": "Précédent",
    "library.paginationNext": "Suivant",
    "library.paginationStatusLabel": "Page",
    "library.createPuzzleLink": "Créer un puzzle",
    "library.contributeLink": "Contribuer un puzzle sur GitHub",
    "library.opensInNewTab": "s'ouvre dans un nouvel onglet",
    "editor.title": "Éditeur de puzzle",
    "editor.sizeLabel": "Taille de la grille",
    "editor.widthLabel": "Largeur",
    "editor.heightLabel": "Hauteur",
    "editor.importLabel": "Importer une image",
    "editor.importFileLabel": "Fichier image",
    "editor.importPaletteSizeLabel": "Nombre de couleurs",
    "editor.importBackgroundLabel": "Couleur de fond",
    "editor.importButton": "Importer",
    "editor.importJsonLabel": "Importer un puzzle",
    "editor.importJsonFileLabel": "Fichier puzzle",
    "editor.importJsonButton": "Importer",
    "editor.importJsonHint":
      "Charge un fichier puzzle existant (le format natif du projet, un export reMarkable, ou un export pixel-art-serializer) — remplace la grille, la palette, le nom et le nom de fichier actuels.",
    "editor.solvabilityLabel": "Vérification de solvabilité",
    "editor.checkSolvabilityButton": "Vérifier la solvabilité",
    "editor.importHint":
      "L'image est ajustée à la taille de grille ci-dessus et réduite au nombre de couleurs ci-dessus ; les pixels proches de la couleur de fond deviennent vides.",
    "editor.paletteLabel": "Palette",
    "editor.canvasLabel": "Grille",
    "editor.metaLabel": "Nom et export",
    "editor.nameLabel": "Nom du puzzle",
    "editor.filenameLabel": "Nom de fichier (id)",
    "editor.export": "Exporter",
    "editor.addColor": "Ajouter une couleur",
    "editor.modeErase": "Effacer",
    "editor.selectColorAriaLabel": "Choisir la couleur {number}",
    "editor.editColorAriaLabel": "Modifier la couleur {number}",
    "editor.removeColorAriaLabel": "Retirer la couleur {number}",
    "editor.error.emptyName": "Le nom du puzzle est requis.",
    "editor.error.emptyFilename": "Le nom de fichier est requis.",
    "editor.error.invalidFilenameFormat":
      "Le nom de fichier ne peut contenir que des lettres minuscules, des chiffres, des tirets et des underscores.",
    "editor.error.imageUnsupported":
      "Ce navigateur ne peut pas importer d'images.",
    "editor.error.imageUnreadable":
      "Impossible de lire ce fichier image. Essayez-en un autre.",
    "editor.error.imageTimeout":
      "Le chargement de cette image a pris trop de temps.",
    "editor.error.invalidGridSize":
      "La largeur et la hauteur doivent être des nombres entiers de 1 à {max}.",
    "editor.error.unexpected": "Une erreur est survenue. Veuillez réessayer.",
    "editor.exportConfirmation": "Exporté {filename} — téléchargement lancé.",
    "editor.error.importJsonNoFile": "Choisissez d'abord un fichier puzzle.",
    "editor.error.importJsonInvalid": "Ce fichier n'est pas un puzzle valide.",
    "editor.error.importJsonTooLarge":
      "Ce puzzle est trop grand pour être édité ici (max {max}×{max}).",
    "editor.importJsonConfirmation": "Importé {filename}.",
    "editor.solvabilityOk":
      "Ce puzzle est entièrement résolvable par déduction logique — aucune supposition nécessaire.",
    "editor.error.solvabilityNoFilledCells":
      "Ce puzzle n'a aucune case remplie — rien à vérifier.",
    "editor.error.solvabilityProblem":
      "Non résolvable sans deviner. Lignes concernées : {rows}. Colonnes concernées : {columns}.",
    "editor.solvabilitySuggestion":
      "Essayez aussi : changez la case ligne {row}, colonne {column} en {value} — cela suffirait à le rendre solvable.",
    "editor.valueEmptyLabel": "Vide",
    "editor.valueColorLabel": "Couleur {number}",
    "play.swatchColorAriaLabel": "Couleur {number}",
    "editor.cellColorAriaLabel":
      "Ligne {row}, colonne {column}, Couleur {number}",
    "editor.cellEmptyAriaLabel": "Ligne {row}, colonne {column}, Vide",
    "puzzle.difficultyLabel": "Difficulté",
    "editor.solvabilityDifficulty": "Difficulté : {score}/10.",
    "library.syncLink": "Synchroniser la progression",
    "sync.title": "Synchronisation",
    "sync.optionalNote":
      "La synchronisation est facultative. Le jeu fonctionne très bien sans elle. Elle sert à conserver votre progression sur un serveur que vous hébergez vous-même.",
    "sync.urlLabel": "Adresse du serveur (obligatoire)",
    "sync.urlHint": "Exemple : http://192.168.1.20:3000",
    "sync.keyLabel": "Clé (obligatoire)",
    "sync.showKey": "Afficher",
    "sync.hideKey": "Masquer",
    "sync.saveButton": "Enregistrer et tester",
    "sync.testing": "Test en cours…",
    "sync.forgetButton": "Oublier ce serveur",
    "sync.status.notConfigured": "Non configuré",
    "sync.status.saved": "Serveur enregistré. La synchronisation est active.",
    "sync.status.connected": "Connecté",
    "sync.error.invalidUrl":
      "Échec : adresse invalide – saisissez une adresse commençant par http:// ou https://",
    "sync.error.emptyKey":
      "Échec : clé manquante – saisissez la clé définie sur le serveur",
    "sync.error.unauthorized":
      "Échec : mauvaise clé – vérifiez la clé définie sur le serveur",
    "sync.error.unreachable":
      "Échec : serveur injoignable – vérifiez l'adresse et que le serveur est démarré",
    "sync.error.notSyncServer":
      "Échec : ce n'est pas un serveur de synchronisation – vérifiez l'adresse",
    "sync.error.mixedContent":
      "Échec : une adresse http ne peut pas être utilisée depuis cette page https – utilisez une adresse https",
    "sync.error.serverError":
      "Échec : le serveur signale une erreur interne – consultez le journal du serveur",
    "sync.error.storage":
      "Échec : enregistrement impossible – vérifiez que le navigateur autorise le stockage local",
    "sync.confirmForget":
      "Oublier ce serveur ? Votre progression sur cet appareil est conservée.",
    "sync.lastSync": "Dernière synchro : {time}",
    "sync.lastFailed": "Dernier essai échoué",
    "sync.neverSynced": "Aucune synchro pour l'instant",
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
