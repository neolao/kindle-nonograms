import { resolve } from "node:path";
import { buildSite } from "./build.js";

const puzzlesDir = resolve("data/puzzles");
const outDir = resolve("dist");

try {
  await buildSite({ puzzlesDir, outDir });
  console.log(`Site built into ${outDir}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
