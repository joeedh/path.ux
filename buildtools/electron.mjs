/*
 * Launches the example/ app under Electron with the Chrome DevTools Protocol
 * enabled, for use via `pnpm electron`.
 *
 *   pnpm electron [--port=9222] [--no-wait] [-- <extra chromium args>]
 *
 * The CDP endpoint is http://127.0.0.1:<port>. Drive it with
 * `pnpm cdp <command>` (see buildtools/cdp.mjs).
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

/* In a plain Node context the electron package's default export is the path
 * to the Electron binary. */
const electronPath = (await import("electron")).default;

const args = [path.join(appDir, "electron_app.cjs"), `--remote-debugging-port=${port}`, ...extraArgs];

console.log(`Launching Electron: ${electronPath}`);
console.log(`  app: ${appDir}`);
console.log(`  CDP: http://127.0.0.1:${port}`);

const child = spawn(electronPath, args, { cwd: appDir, stdio: "inherit" });

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
