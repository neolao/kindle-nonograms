---
date: 2026-08-18
status: accepted
---
# `translate()` falls back to the default locale instead of throwing on an unsupported locale

**Context:** `translate(locale, key)` is typed to accept only `Locale` (`"en" | "fr"`), but its future callers (item 017) will resolve the actual locale from untyped runtime sources — a cookie value, `navigator.language` — which can hold any string despite the type.
**Decision:** When `locale` is not one of `SUPPORTED_LOCALES`, `translate()` silently renders the string in `DEFAULT_LOCALE` instead of throwing.
**Reason:** A translation lookup is not a place where the project wants a hard failure — the Kindle browser has no error-reporting UI, and a thrown error deep in a render/hydration path would break the whole page over a bad cookie value. Degrading to a readable default locale keeps the page usable.
**Rejected alternatives:** Throwing on an unsupported locale — rejected as too strict for a value sourced from outside the type system, and out of proportion with the actual harm (a wrong-language string).
