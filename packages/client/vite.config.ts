import { defineConfig } from "vite";

// Kindle's built-in browser runs an old WebKit engine, so the build
// targets a conservative baseline instead of the latest evergreen browsers.
export default defineConfig({
  // Relative base so the built assets resolve correctly regardless of the
  // subpath they're served from (e.g. a GitHub Pages project page).
  base: "./",
  build: {
    target: "es2015",
  },
});
