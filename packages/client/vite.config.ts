import { defineConfig } from "vite";

// Kindle's built-in browser runs an old WebKit engine, so the build
// targets a conservative baseline instead of the latest evergreen browsers.
export default defineConfig({
  build: {
    target: "es2015",
  },
});
