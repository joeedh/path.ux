/**
 * ESLint rule: flag string-literal theme keys passed to `getDefault(...)` that
 * don't exist anywhere in the generated theme catalog (generated/themes.json).
 *
 * Deliberately conservative to avoid false positives, because the catalog is a
 * floor, not a closed set — plenty of valid `getDefault` calls read keys that
 * aren't in theme.ts and supply a runtime default instead. So the rule only
 * fires when ALL of these hold:
 *   - the call is `<recv>.getDefault("literal")` with no `defaultval` argument
 *     (i.e. at most key + checkForMobile), and
 *   - the key is a plain identifier-ish string (word chars, dashes, dots), and
 *   - the key appears in NO class entry in the catalog.
 *
 * No-ops if generated/themes.json is missing (run `pnpm run gen:themes`).
 * This catches outright typos; it does not enforce per-class scoping (that is
 * the typed getDefault overload's job under tsconfig.themes.json).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_RE = /^[\w-][\w.-]*$/;

function collectKeys(node, out) {
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    out.add(k);
    if (v && typeof v === "object") collectKeys(v, out);
  }
}

function loadCatalog() {
  try {
    const file = resolve(__dirname, "../../generated/themes.json");
    const json = JSON.parse(readFileSync(file, "utf8"));
    const known = new Set();
    for (const cls of Object.values(json.classes ?? {})) {
      collectKeys(cls.keys ?? {}, known);
    }
    return known.size ? known : undefined;
  } catch {
    return undefined;
  }
}

const catalog = loadCatalog();

export default {
  meta: {
    type    : "problem",
    docs: {
      description: "validate path.ux theme keys against generated/themes.json",
    },
    schema  : [],
    messages: {
      unknownKey: 'Unknown theme key "{{key}}" (not in any class in the theme catalog).',
    },
  },
  create(context) {
    if (!catalog) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.property.name !== "getDefault") return;
        // key + optional checkForMobile only; a defaultval (3rd arg) means the
        // key is allowed to be absent from the catalog.
        if (node.arguments.length > 2) return;
        const arg = node.arguments[0];
        if (arg?.type !== "Literal" || typeof arg.value !== "string") return;
        const key = arg.value;
        if (!KEY_RE.test(key)) return;
        if (!catalog.has(key)) {
          context.report({ node: arg, messageId: "unknownKey", data: { key } });
        }
      },
    };
  },
};
