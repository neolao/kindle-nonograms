/**
 * Every `localStorage` key starting with `prefix`. Throws when storage is
 * unavailable, so a caller picks its own fallback.
 */
export function keysWithPrefix(prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== null && key.indexOf(prefix) === 0) {
      keys.push(key);
    }
  }
  return keys;
}
