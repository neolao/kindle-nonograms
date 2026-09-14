const COOKIE_NAME = "kindle-nonograms-library-filters";

/** The library's color filter value — mirrors the color toggle buttons. */
export type ColorFilterValue = "all" | "mono" | "multi";

/** The library's solve-status filter value — mirrors the status toggle buttons. */
export type StatusFilterValue = "all" | "unsolved" | "in-progress" | "solved";

/** The player's current color/status/sort selection on the library page. */
export interface LibraryFiltersState {
  color: ColorFilterValue;
  status: StatusFilterValue;
  sortByRecent: boolean;
}

/** What a player who has never chosen a filter sees — nothing filtered, default order. */
export const DEFAULT_LIBRARY_FILTERS: LibraryFiltersState = {
  color: "all",
  status: "all",
  sortByRecent: false,
};

const VALID_COLORS: readonly ColorFilterValue[] = ["all", "mono", "multi"];
const VALID_STATUSES: readonly StatusFilterValue[] = [
  "all",
  "unsolved",
  "in-progress",
  "solved",
];

function isColorFilterValue(value: string | null): value is ColorFilterValue {
  return value !== null && (VALID_COLORS as readonly string[]).includes(value);
}

function isStatusFilterValue(value: string | null): value is StatusFilterValue {
  return (
    value !== null && (VALID_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Reads the player's saved library filter/sort preference from
 * `document.cookie`. Each field (color, status, sort) is validated and
 * defaulted independently, the same tolerant, per-field spirit as
 * `resolveLocale` in `i18n.ts` — an old-shaped or hand-edited cookie (an
 * unknown color value, a missing field) never discards the player's whole
 * saved preference, only the one field that doesn't parse. Returns
 * `undefined` when no such cookie is set at all, or when reading cookies
 * throws (disabled/restricted mode) — degrades silently, same defensive
 * spirit as `readLocaleCookie`.
 */
export function readLibraryFiltersCookie(): LibraryFiltersState | undefined {
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const separatorIndex = cookie.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const name = cookie.slice(0, separatorIndex).trim();
      if (name !== COOKIE_NAME) {
        continue;
      }

      const rawValue = decodeURIComponent(cookie.slice(separatorIndex + 1));
      const params = new URLSearchParams(rawValue);

      return {
        color: isColorFilterValue(params.get("color"))
          ? (params.get("color") as ColorFilterValue)
          : DEFAULT_LIBRARY_FILTERS.color,
        status: isStatusFilterValue(params.get("status"))
          ? (params.get("status") as StatusFilterValue)
          : DEFAULT_LIBRARY_FILTERS.status,
        sortByRecent: params.get("sort") === "1",
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Persists the player's current filter/sort selection to a long-lived
 * cookie, written on every change (including a change back to the default
 * "all") so the saved preference never lags behind what's on screen.
 * Degrades silently (nothing saved, no error thrown) if writing cookies is
 * unavailable or throws — the caller's own in-memory state for the current
 * page view is unaffected either way, same defensive spirit as
 * `writeLocaleCookie`.
 */
export function writeLibraryFiltersCookie(state: LibraryFiltersState): void {
  try {
    const rawValue = new URLSearchParams({
      color: state.color,
      status: state.status,
      sort: state.sortByRecent ? "1" : "0",
    }).toString();
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(rawValue)}; path=/; max-age=31536000`;
  } catch {
    // Cookie write unavailable or throwing — nothing more we can do here.
  }
}
