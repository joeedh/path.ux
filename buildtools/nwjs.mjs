/*
 * Launches the example/ app under NW.js with the Chrome DevTools Protocol
 * enabled, for use via `pnpm nwjs`.
 *
 *   pnpm nwjs [--port=9222] [--no-wait] [-- <extra chromium args>]
 *
 * The CDP endpoint is http://127.0.0.1:<port>. Drive it with
 * `pnpm nwjs:cdp <command>` (see buildtools/nwjs-cdp.mjs).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "example");

let port = 9222;
let wait = true;
const extraArgs = [];

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--port=")) {
    port = parseInt(arg.slice("--port=".length));
  } else if (arg === "--no-wait") {
    wait = false;
  } else {
    extraArgs.push(arg);
  }
}

if (isNaN(port)) {
  console.error("Invalid --port");
  process.exit(1);
}

/* The example bundle is produced by the main build. */
if (!fs.existsSync(path.join(appDir, "dist", "app.js"))) {
  console.log("example/dist/app.js missing; running build...");
  const res = spawnSync(process.execPath, [path.join(root, "buildtools", "esbuild.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

/* The nw package's findpath() has been async since 0.85; awaiting also
 * tolerates older sync versions. */
const nwModule = await import("nw");
const findpath = nwModule.findpath ?? nwModule.default.findpath;
const nwPath = await findpath("nwjs", { flavor: "sdk" });

const args = [appDir, `--remote-debugging-port=${port}`, ...extraArgs];

console.log(`Launching NW.js: ${nwPath}`);
console.log(`  app: ${appDir}`);
console.log(`  CDP: http://127.0.0.1:${port}`);

const child = spawn(nwPath, args, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

if (wait) {
  const deadline = Date.now() + 30000;
  let version;

  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/json/version`);
      version = await resp.json();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (version) {
    console.log(`CDP ready: ${version.Browser}`);
    console.log(`  ${version.webSocketDebuggerUrl}`);
  } else {
    console.warn("CDP endpoint did not come up within 30s (app may still be running).");
  }
}
