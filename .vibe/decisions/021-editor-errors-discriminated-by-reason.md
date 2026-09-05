---
date: 2026-09-06
status: accepted
---
# Editor errors discriminated by reason, not by message text

**Context:** `createPuzzle`'s validation failures and `decodeImageFile`'s
decode failures were shown to the puzzle editor's contributor as their raw
`Error#message`, some of it literal, untranslatable browser text.

**Decision:** Both throw a typed error carrying a stable `reason` field
(`PuzzleValidationError.reason`, `ImageDecodeError.reason`) in addition to
their existing developer-facing `message`. The editor switches on `reason`
to pick a translated, contributor-facing string; anything it doesn't
recognize (including a raw browser exception) falls back to one fixed
generic translated message. `message` itself is unchanged, since
`discoverPuzzles.ts`'s build-time diagnostics already depend on its exact
wording.

**Reason:** Matching on `message` text is brittle (breaks silently if
wording changes) and can't be localized without duplicating dev-facing
strings per locale. A `reason` discriminant is stable, exhaustive-checkable,
and keeps the developer-facing message and the contributor-facing
translation independent of each other.

**Rejected alternatives:** Parsing/pattern-matching `message` strings in the
editor to pick a translation key — rejected as brittle and coupling the UI
to internal wording. Adding an i18n dependency directly into `puzzle.ts` (a
`TranslationKey` field on the error) — rejected to keep the shared domain
module free of UI/translation concerns; the mapping from `reason` to
`TranslationKey` lives in the client instead.
