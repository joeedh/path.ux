/**
 * Static import-resolution pass for the typed `updateFrom` catalog.
 *
 * The runtime DataAPI walk (datapath-walker.mjs) knows each mapped struct's
 * *name*, but not the TypeScript *type* or where it is declared — the bundle has
 * erased source identity. To emit `import type { Vertex } from "…"` in
 * generated/struct-catalog.ts we need each mapped class's import specifier.
 *
 * This pass parses the api-define module (default example/api/api_define.ts) with
 * the TypeScript compiler API, finds every `*.mapStruct / mapStructCustom /
 * inheritStruct(<ClassIdent>, …)` call, and maps that class identifier back to
 * the module it was imported from. No type-checker/program is needed: the mapped
 * classes are always plain named imports at the top of the api-define module.
 *
 * Limitation (fine for the prototype): only resolves classes that are both
 * (a) imported by name into the api-define module and (b) passed as the first
 * argument to a struct-mapping call *in that module*. Structs mapped in other
 * modules, or via computed/aliased class expressions, are skipped (and simply
 * won't get a typed catalog entry).
 *
 * @param {string} apiDefineFile absolute path to the api-define .ts module
 * @returns {Map<string, {specifier: string, fromFile: string}>}
 *   className → { original module specifier, the file it was imported into }
 */
import { readFileSync } from "node:fs";
import ts from "typescript";

const MAP_METHODS = new Set(["mapStruct", "mapStructCustom", "inheritStruct"]);

export function resolveStructImports(apiDefineFile) {
  const source = readFileSync(apiDefineFile, "utf8");
  const sf = ts.createSourceFile(apiDefineFile, source, ts.ScriptTarget.Latest, true);

  // local import name -> module specifier (only named type/value imports)
  const importOf = new Map();
  // class identifier names passed to a struct-mapping call
  const mappedClasses = new Set();

  const visit = (node) => {
    // import { A, B } from "mod";
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const spec = node.moduleSpecifier.text;
      for (const el of node.importClause.namedBindings.elements) {
        importOf.set(el.name.text, spec);
      }
    }

    // *.mapStruct(Ident, …) / mapStructCustom / inheritStruct
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      MAP_METHODS.has(node.expression.name.text) &&
      node.arguments.length > 0 &&
      ts.isIdentifier(node.arguments[0])
    ) {
      mappedClasses.add(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);

  const out = new Map();
  for (const cls of mappedClasses) {
    const specifier = importOf.get(cls);
    if (specifier) {
      out.set(cls, { specifier, fromFile: apiDefineFile });
    }
  }
  return out;
}
