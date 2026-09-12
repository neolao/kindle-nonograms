#!/usr/bin/env node
// Minimal chromium-cli-style REPL driver for Kindle Nonograms (a static
// site — chromium-cli itself is not installed in this environment).
// Reads one command per line from stdin, drives a headless Chromium via
// Playwright, prints one "OK ..."/"ERR ..." line per command.
//
// Commands:
//   nav <url>
//   wait-for text=<substring>          (waits for an element containing it)
//   wait-for <css-selector>
//   click <css-selector>
//   screenshot [path]                  (default: screenshots/<n>.png)
//   screenshot-element <selector> [path]
//   eval <js-expression>               (runs in page context, result printed as JSON)
//   console-errors                     (prints every console/page error seen so far)
//   quit
//
// Usage (see SKILL.md for a full walkthrough):
//   node .claude/skills/run-kindle-nonograms/driver.mjs <<'EOF'
//   nav http://localhost:4173/
//   wait-for text=Kindle Nonograms
//   screenshot
//   quit
//   EOF

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

function resolvePlaywright() {
  const req = createRequire(import.meta.url);
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    scriptDir, // npm install --no-save --prefix <this dir> playwright
    process.cwd(),
    "/tmp/node_modules", // pre-provisioned in some agent containers
    `${process.env.HOME}/.local/lib/node_modules`,
  ];
  for (const base of candidates) {
    try {
      return req(req.resolve("playwright", { paths: [base] }));
    } catch {
      // try next candidate
    }
  }
  // Last resort: plain require, in case NODE_PATH already covers it.
  return req("playwright");
}

const { chromium } = resolvePlaywright();

const SCREENSHOT_DIR = "screenshots";
mkdirSync(SCREENSHOT_DIR, { recursive: true });
let shotCount = 0;

const consoleEntries = [];

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleEntries.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) =>
    consoleEntries.push(`[pageerror] ${String(err)}`),
  );

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const [cmd, ...rest] = line.split(" ");
    const arg = rest.join(" ");

    try {
      if (cmd === "nav") {
        await page.goto(arg, { waitUntil: "load" });
        console.log(`OK nav ${arg}`);
      } else if (cmd === "wait-for") {
        if (arg.startsWith("text=")) {
          const text = arg.slice("text=".length);
          await page
            .getByText(text, { exact: false })
            .first()
            .waitFor({ timeout: 15000 });
        } else {
          await page.waitForSelector(arg, { timeout: 15000 });
        }
        console.log(`OK wait-for ${arg}`);
      } else if (cmd === "click") {
        await page.click(arg);
        console.log(`OK click ${arg}`);
      } else if (cmd === "screenshot") {
        const path =
          arg ||
          `${SCREENSHOT_DIR}/${String(++shotCount).padStart(2, "0")}.png`;
        await page.screenshot({ path });
        console.log(`OK screenshot ${path}`);
      } else if (cmd === "screenshot-element") {
        const [selector, path] = rest;
        const outPath =
          path ||
          `${SCREENSHOT_DIR}/${String(++shotCount).padStart(2, "0")}-el.png`;
        const el = await page.$(selector);
        if (!el) throw new Error(`no element matches ${selector}`);
        await el.screenshot({ path: outPath });
        console.log(`OK screenshot-element ${selector} ${outPath}`);
      } else if (cmd === "eval") {
        const result = await page.evaluate(new Function(`return (${arg})`));
        console.log(`OK eval ${JSON.stringify(result)}`);
      } else if (cmd === "console-errors") {
        console.log(`OK console-errors ${JSON.stringify(consoleEntries)}`);
      } else if (cmd === "quit") {
        console.log("OK quit");
        break;
      } else {
        console.log(`ERR unknown command: ${cmd}`);
      }
    } catch (err) {
      console.log(`ERR ${cmd}: ${err.message}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(`FATAL ${err.stack || err}`);
  process.exit(1);
});
