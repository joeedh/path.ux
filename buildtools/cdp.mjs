/*
 * Drives a running example app — NW.js (`pnpm nwjs`) or Electron
 * (`pnpm electron`) — over the Chrome DevTools Protocol, via Playwright's
 * connectOverCDP.
 *
 *   pnpm cdp pages                      # list debuggable pages
 *   pnpm cdp eval "<js expression>"     # evaluate in the app page
 *   pnpm cdp screenshot [file.png]      # capture the app page
 *   pnpm cdp click <x> <y>              # click at viewport coordinates
 *   pnpm cdp key <key>                  # press a key (Playwright names)
 *
 * All commands accept --port=<n> (default 9222). Each invocation connects,
 * acts, and disconnects; the app keeps running.
 *
 * For richer scripting, import the helper instead of shelling out:
 *
 *   import { connectApp } from "./buildtools/cdp.mjs";
 *   const { browser, page } = await connectApp();
 *   await page.mouse.click(100, 100);
 *   await browser.close(); // disconnects only
 */
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

/**
 * Connect to the app's CDP endpoint and locate the example app's page.
 * `browser.close()` disconnects without killing the app.
 */
export async function connectApp({ port = 9222 } = {}) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const pages = browser.contexts().flatMap((ctx) => ctx.pages());

  /* NW.js also exposes its background page; prefer the app window. */
  const page =
    pages.find((p) => p.url().includes("nwjs_app.html") || p.url().includes("electron_app.html")) ?? pages[0];

  if (!page) {
    await browser.close();
    throw new Error(`No pages found on CDP port ${port}. Is \`pnpm nwjs\` or \`pnpm electron\` running?`);
  }

  return { browser, page };
}

async function main() {
  let port = 9222;
  const args = [];

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--port=")) {
      port = parseInt(arg.slice("--port=".length));
    } else {
      args.push(arg);
    }
  }

  const [cmd, ...rest] = args;

  if (!cmd) {
    console.error("Usage: pnpm cdp <pages|eval|screenshot|click|key> [args] [--port=9222]");
    process.exit(1);
  }

  const { browser, page } = await connectApp({ port });

  try {
    switch (cmd) {
      case "pages": {
        for (const ctx of browser.contexts()) {
          for (const p of ctx.pages()) {
            console.log(JSON.stringify({ url: p.url(), title: await p.title() }));
          }
        }
        break;
      }
      case "eval": {
        if (rest.length === 0) {
          throw new Error("eval requires a JavaScript expression argument");
        }
        const result = await page.evaluate(rest[0]);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "screenshot": {
        const file = rest[0] ?? "nwjs-screenshot.png";
        await page.screenshot({ path: file });
        console.log(`Saved ${file}`);
        break;
      }
      case "click": {
        const [x, y] = [parseFloat(rest[0]), parseFloat(rest[1])];
        if (isNaN(x) || isNaN(y)) {
          throw new Error("click requires numeric <x> <y>");
        }
        await page.mouse.click(x, y);
        console.log(`Clicked (${x}, ${y})`);
        break;
      }
      case "key": {
        if (!rest[0]) {
          throw new Error("key requires a key name, e.g. Enter, a, Control+z");
        }
        await page.keyboard.press(rest[0]);
        console.log(`Pressed ${rest[0]}`);
        break;
      }
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  } finally {
    await browser.close();
  }
}

/* Only run the CLI when executed directly, not when imported. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
}
