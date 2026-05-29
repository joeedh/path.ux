import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests live in tests/. The playwright/ specs are run separately via
    // `pnpm run playwright` and must not be collected by vitest.
    include: ["tests/**/*.test.ts"],
  },
});
