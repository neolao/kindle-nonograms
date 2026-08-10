/**
 * Formats a nonogram clue line (e.g. the numbers shown above a column)
 * as a compact, human-readable string.
 */
export function formatClueLine(clues: number[]): string {
  if (clues.length === 0) {
    return "0";
  }

  return clues.join(" ");
}

function mount(): void {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }

  root.textContent = "Kindle Nonograms";
}

if (typeof document !== "undefined") {
  mount();
}
