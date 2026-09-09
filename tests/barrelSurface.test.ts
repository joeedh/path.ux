import { describe, expect, test } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRY = join(HERE, "../scripts/pathux.ts");
const FIXTURE = join(HERE, "fixtures/barrel-surface.json");

interface BarrelSurface {
  values: string[];
  types: string[];
}

/**
 * Every name `pathux.ts` exports, split by whether it survives to runtime. The checker resolves
 * the `export *` chain, so a name added to any module in it lands here without the barrel
 * changing.
 */
function barrelSurface(): BarrelSurface {
  const program = ts.createProgram([ENTRY], {
    target          : ts.ScriptTarget.ES2022,
    module          : ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs         : true,
    skipLibCheck    : true,
    noEmit          : true,
    strict          : true,
  });

  const checker = program.getTypeChecker();
  const source = program.getSourceFile(ENTRY);
  if (!source) {
    throw new Error(`barrel entry point not in the program: ${ENTRY}`);
  }

  const entrySymbol = checker.getSymbolAtLocation(source);
  if (!entrySymbol) {
    throw new Error("the barrel entry point resolved to no module symbol");
  }

  const values: string[] = [];
  const types: string[] = [];

  for (const exported of checker.getExportsOfModule(entrySymbol)) {
    const target =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;

    (target.flags & ts.SymbolFlags.Value ? values : types).push(exported.name);
  }

  return { values: values.sort(), types: types.sort() };
}

describe("the pathux barrel", () => {
  test("exports exactly the names the fixture records", () => {
    const surface = barrelSurface();

    // regenerate with UPDATE_BARREL_FIXTURE=1 once the diff has been read and accepted
    if (process.env.UPDATE_BARREL_FIXTURE) {
      writeFileSync(FIXTURE, JSON.stringify(surface, null, 2) + "\n");
    }

    const baseline = JSON.parse(readFileSync(FIXTURE, "utf8")) as BarrelSurface;

    // Both halves are checked: a type export is erased from the bundle, so a runtime-only
    // check cannot see one arriving through an `export * from "…"` line
    expect(surface.values).toEqual(baseline.values);
    expect(surface.types).toEqual(baseline.types);
  }, 60000);
});
