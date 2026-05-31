import { defineConfig } from "vitest/config";
import { transform } from "esbuild";

// The source uses TC39 class auto-accessors (`accessor foo`). Vite 8 transforms
// TS with oxc, which (as of this version) does NOT lower auto-accessors, so the
// `accessor` keyword reaches Node and throws "Unexpected identifier". esbuild
// DOES lower them when targeting < esnext, so we run a pre-transform with
// esbuild on the few source files that use the keyword, before oxc runs.
const lowerAutoAccessors = () => ({
  name   : "lower-auto-accessors",
  enforce: "pre" as const,
  async transform(code: string, id: string) {
    const path = id.split("?")[0];
    if (id.includes("node_modules") || !/\.(ts|js)$/.test(path)) return null;
    if (!/\baccessor\s/.test(code)) return null;

    const res = await transform(code, {
      target    : "es2021",
      loader    : path.endsWith(".ts") ? "ts" : "js",
      sourcefile: id,
      sourcemap : true,
    });
    return { code: res.code, map: res.map };
  },
});

export default defineConfig({
  plugins: [lowerAutoAccessors()],
  test: {
    // Unit tests live in tests/. The playwright/ specs are run separately via
    // `pnpm run playwright` and must not be collected by vitest.
    include    : ["tests/**/*.test.ts"],
    // Widget tests need a DOM (custom elements + shadow DOM). The pure
    // data-api tests shim `window` in beforeAll and are unaffected by this.
    environment: "happy-dom",
  },
});
