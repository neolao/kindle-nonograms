---
status: todo
---
# Shared Translation Table (i18n)

## Description
Add a new module `packages/shared/src/i18n.ts` defining `Locale = "en" | "fr"`, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE = "en"`, and a `TranslationKey` union covering every currently hardcoded UI string (`library.title`, `library.empty`, `library.solvedBadge`, `play.modeFill`, `play.modeCross`, `play.winBanner.solved`) plus the new keys needed by items 017 and 018 (`play.check`, `play.winBanner.notSolved`, `i18n.languageSwitcherLabel`). Provide `TRANSLATIONS` (EN + FR), `translate(locale, key)`, and `isSupportedLocale()`. Export everything from `packages/shared/src/index.ts`.

## Acceptance Criteria
- [ ] Every translation key has a non-empty string for both `en` and `fr`
- [ ] `translate(locale, key)` returns the correct string for each (locale, key) pair
- [ ] `isSupportedLocale` correctly distinguishes supported from unsupported locale values
- [ ] Dedicated test `packages/shared/src/i18n.test.ts` (no jsdom required)

## Notes
Foundation for items 017 and 018 — ship first. See the approved plan at `/home/neolao/.claude/plans/ajoute-une-passe-graphique-twinkling-dijkstra.md`.
