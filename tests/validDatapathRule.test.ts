import { describe, expect, test } from "vitest";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// @ts-expect-error - pure JS build helper, no type decls
import validDatapath from "../buildtools/eslint-rules/valid-datapath.mjs";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures/valid-datapath");
const CATALOG = join(FIXTURES, "catalog.json");

interface Finding {
  messageId: string;
  message: string;
}

/**
 * Lints one fixture file with only this rule enabled. `typeAware: false` drops
 * parserOptions.project, which is how the rule runs in a config without type
 * information — it should fall back to the untyped path rather than throw.
 */
async function lint(file: string, { typeAware = true } = {}): Promise<Finding[]> {
  const eslint = new ESLint({
    cwd               : FIXTURES,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files          : ["**/*.ts"],
        languageOptions: {
          parser       : tseslint.parser,
          parserOptions: typeAware ? { project: "./tsconfig.json", tsconfigRootDir: FIXTURES } : {},
        },
        plugins        : { pathux: { rules: { "valid-datapath": validDatapath } } },
        rules          : { "pathux/valid-datapath": ["warn", { catalogPath: CATALOG }] },
      },
    ],
  });

  const results = await eslint.lintFiles([join(FIXTURES, file)]);
  return results[0].messages.map((m) => ({ messageId: m.messageId!, message: m.message }));
}

/** The path a finding leads with: joined for a prefixed report, raw otherwise. */
function reported(f: Finding): string {
  return f.message.match(/^Unknown data path "([^"]+)"/)![1];
}

describe("pathux/valid-datapath", () => {
  test("a declared prefix is joined onto the path and checked exactly", async () => {
    const found = await lint("tagged.ts");

    expect(found.map(reported)).toEqual([
      "scene.objects[n].sizee",
      // A real path elsewhere in the catalog, but not under this prefix — the
      // untyped fallback would have accepted it as a suffix match.
      "scene.objects[n].strength",
      // A prefix written without its trailing "." still joins with one.
      "scene.objects[n].nope",
    ]);
    expect(found.every((f) => f.messageId === "unknownPrefixedPath")).toBe(true);
  });

  test("the report names the relative path and the prefix it was joined to", async () => {
    const [typo] = await lint("tagged.ts");

    expect(typo.message).toContain('"sizee" under prefix "scene.objects[n]."');
    expect(typo.message).toContain("Paths under this prefix include:");
    expect(typo.message).toContain("size");
  });

  test("valid paths under the prefix, and a leading slash, report nothing", async () => {
    const found = await lint("tagged.ts");

    // size, material.roughness and /workspace.brush.strength all resolve.
    expect(found).toHaveLength(3);
  });

  test("without a prefix, a known path suffix is accepted", async () => {
    const found = await lint("untagged.ts");

    expect(found.map(reported)).toEqual(["nonsense"]);
    expect(found[0].messageId).toBe("unknownPath");
  });

  test("without type information the prefixed file falls back to suffix matching", async () => {
    const found = await lint("tagged.ts", { typeAware: false });

    // No receiver type to read, so every argument is judged as a bare path:
    // "size" and "strength" are known suffixes, "sizee" and "nope" are not.
    expect(found.map(reported)).toEqual(["sizee", "nope"]);
    expect(found.every((f) => f.messageId === "unknownPath")).toBe(true);
  });
});
