/**
 * ESLint rule: flag invalid data-path strings.
 *
 * Validates string-literal path arguments to `container.prop(...)` and related
 * widget methods, `path="..."` attributes inside xmlpage template strings, and
 * `path` props in JSX (`<prop path="..." />`), against the catalog in
 * generated/api-paths.json.
 *
 * A container declares its data-path prefix as a literal type through
 * `withDataPrefix<"foo.bar[n].">()`, which the checker surfaces as the phantom
 * `__dataPathPrefix` property. When type information is available and the
 * receiver carries a non-empty prefix, the argument is checked as prefix + path
 * against the whole catalog. Without a prefix there is nothing to resolve
 * against, so a relative path is accepted whenever it matches a known path
 * suffix. If generated/api-paths.json is missing, the rule is a no-op.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePath } from "../datapath-walker.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Widget methods whose first string argument is a data path.
const PATH_METHODS = new Set([
  "prop",
  "slider",
  "simpleslider",
  "check",
  "checkenum",
  "listenum",
  "pathlabel",
  "textbox",
]);

function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

const DEFAULT_CATALOG = resolve(__dirname, "../../generated/api-paths.json");

const catalogCache = new Map();

function loadCatalog(file) {
  if (catalogCache.has(file)) {
    return catalogCache.get(file);
  }
  let result;
  try {
    const json = JSON.parse(readFileSync(file, "utf8"));
    const known = new Set();
    const suffixes = new Set();
    for (const path of Object.keys(json.paths ?? {})) {
      const norm = normalizePath(path);
      known.add(norm);
      // every trailing-segment suffix, so a relative "brush.size" or "size" validates
      const segs = norm.split(".");
      for (let i = 0; i < segs.length; i++) {
        suffixes.add(segs.slice(i).join("."));
      }
    }
    result = { known, suffixes, all: [...known] };
  } catch {
    result = undefined;
  }
  catalogCache.set(file, result);
  return result;
}

/**
 * The catalog the current lint run reads. The helpers below close over this
 * rather than taking it as an argument, so one run has to use one catalog —
 * `create` reassigns it, and every rule instance in a run resolves the same
 * path unless a config gives different ones per file glob.
 */
let catalog = loadCatalog(DEFAULT_CATALOG);

/** Catalog to read: rule option, then env var, then the path.ux submodule copy. */
function catalogPathFor(context) {
  const fromOption = context.options?.[0]?.catalogPath;
  const raw = fromOption ?? process.env.PATHUX_DATAPATH_CATALOG;
  return raw ? resolve(context.cwd ?? process.cwd(), raw) : DEFAULT_CATALOG;
}

function matches(norm) {
  return catalog.known.has(norm) || catalog.suffixes.has(norm);
}

function isValid(rawPath) {
  if (!catalog) {
    return true; // no manifest -> no-op
  }
  let p = rawPath.trim();
  if (!p || p.includes("{") || p.includes("$") || p.includes("`") || p.includes("(")) {
    return true; // empty, a mass-set / interpolated expression, or a tool/method call
  }
  if (p.startsWith("/")) {
    p = p.slice(1).trim();
  }
  const norm = normalizePath(p);
  if (matches(norm)) {
    return true;
  }
  // Indexed access into a known property (e.g. a vector or list): the catalog
  // lists the base "data.vector_test", not "data.vector_test[0]".
  const deindexed = norm.replace(/\[n\]$/, "");
  if (deindexed !== norm && matches(deindexed)) {
    return true;
  }
  // DataList virtual members resolved at runtime (e.g. "canvas.paths.active").
  const virt = norm.match(/^(.*)\.(active|length)$/);
  if (virt && matches(virt[1])) {
    return true;
  }
  return false;
}

/** Mirrors Container._joinPrefix: "/" escapes the prefix, "." is inserted if missing. */
function joinPrefix(prefix, path) {
  if (path.startsWith("/")) {
    return path.slice(1).trim();
  }
  if (prefix.length > 0 && path.length > 0 && !prefix.endsWith(".") && !path.startsWith(".")) {
    return `${prefix}.${path}`;
  }
  return prefix + path;
}

/** Tails of the catalog paths that sit under `prefix`, nearest to `rawPath` first. */
function tailSuggestion(prefix, rawPath) {
  const norm = normalizePath(prefix);
  const target = normalizePath(rawPath.trim()).toLowerCase();
  // A prefix may or may not carry its trailing ".", so drop one off each tail.
  const tails = catalog.all
    .filter((k) => k.startsWith(norm) && k.length > norm.length)
    .map((k) => k.slice(norm.length).replace(/^\./, ""));
  if (!tails.length) {
    return "";
  }
  const ranked = tails
    .map((k) => ({ k, d: editDistance(target, k.toLowerCase()) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((r) => r.k);
  return ` Paths under this prefix include: ${ranked.join(", ")}.`;
}

function nearestSuggestion(rawPath) {
  if (!catalog?.all.length) {
    return "";
  }
  const target = normalizePath(rawPath.trim().replace(/^\//, "")).toLowerCase();
  const last = target.split(".").pop();
  const ranked = catalog.all
    .map((k) => ({ k, d: editDistance(target, k.toLowerCase()) }))
    .sort((a, b) => a.d - b.d)
    .filter((r) => r.d <= Math.max(2, Math.ceil(target.length / 2)))
    .slice(0, 3)
    .map((r) => r.k);
  if (ranked.length) {
    return ` Did you mean: ${ranked.join(", ")}?`;
  }
  // fall back to last-segment suffix matches
  const bySuffix = catalog.all.filter((k) => k.toLowerCase().endsWith("." + last)).slice(0, 3);
  return bySuffix.length ? ` Closest paths ending in "${last}": ${bySuffix.join(", ")}.` : "";
}

/** Name of Container's phantom prefix tag (declared in scripts/core/ui.ts). */
const PREFIX_TAG = "__dataPathPrefix";

/**
 * Reads the data-path prefix a container declared through `withDataPrefix()`.
 * Returns undefined when there is no type information, the receiver is not a
 * container, or its prefix is the empty default.
 */
function readPrefixTag(context, objNode) {
  const services = context.sourceCode?.parserServices;
  if (!services?.program || !services.esTreeNodeToTSNodeMap) {
    return undefined;
  }
  const tsNode = services.esTreeNodeToTSNodeMap.get(objNode);
  if (!tsNode) {
    return undefined;
  }
  const checker = services.program.getTypeChecker();
  const type = checker.getTypeAtLocation(tsNode);
  // A union receiver (`Container | undefined`) resolves to the one prefix its
  // container constituents agree on; disagreement means we cannot say.
  const parts = type.isUnion?.() ? type.types : [type];
  let found;
  for (const part of parts) {
    const sym = part.getProperty?.(PREFIX_TAG);
    if (!sym) {
      continue;
    }
    const tagType = checker.getTypeOfSymbolAtLocation(sym, tsNode);
    if (!tagType.isStringLiteral?.()) {
      return undefined;
    }
    if (found !== undefined && found !== tagType.value) {
      return undefined;
    }
    found = tagType.value;
  }
  return found ? found : undefined;
}

const ATTR_RE = /\bpath\s*=\s*["']([^"']+)["']/g;

export default {
  meta: {
    type    : "problem",
    docs: { description: "validate path.ux data-path strings against generated/api-paths.json" },
    schema: [
      {
        type                : "object",
        properties: {
          // Where to read the catalog, absolute or relative to the lint cwd.
          // Also settable as PATHUX_DATAPATH_CATALOG, which the tests use.
          catalogPath: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unknownPath        : 'Unknown data path "{{path}}".{{hint}}',
      unknownPrefixedPath:
        'Unknown data path "{{joined}}" ("{{path}}" under prefix "{{prefix}}").{{hint}}',
    },
  },
  create(context) {
    catalog = loadCatalog(catalogPathFor(context));
    if (!catalog) {
      return {};
    }

    function reportNode(node, rawPath) {
      context.report({
        node,
        messageId: "unknownPath",
        data     : { path: rawPath, hint: nearestSuggestion(rawPath) },
      });
    }

    /**
     * Checks a path against the prefix its container declared. Returns false
     * when there is no declared prefix, leaving the caller on the untyped path.
     */
    function checkPrefixed(node, objNode, rawPath) {
      const prefix = readPrefixTag(context, objNode);
      if (prefix === undefined) {
        return false;
      }
      const p = rawPath.trim();
      if (!p || p.includes("{") || p.includes("$") || p.includes("`") || p.includes("(")) {
        return true; // interpolated or a tool/method call — nothing static to check
      }
      const joined = normalizePath(joinPrefix(prefix, p));
      if (!catalog.known.has(joined)) {
        context.report({
          node,
          messageId: "unknownPrefixedPath",
          data     : { joined, path: p, prefix, hint: tailSuggestion(prefix, p) },
        });
      }
      return true;
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) {
          return;
        }
        if (!PATH_METHODS.has(callee.property.name)) {
          return;
        }
        const arg = node.arguments[0];
        if (arg?.type !== "Literal" || typeof arg.value !== "string") {
          return;
        }
        if (checkPrefixed(arg, callee.object, arg.value)) {
          return;
        }
        if (!isValid(arg.value)) {
          reportNode(arg, arg.value);
        }
      },

      // JSX `<prop path="..." />` / `<prop path={"..."} />`. The `path` prop on
      // <tool>/<toolPanel> is a toolpath, not a data path, so skip those tags.
      JSXAttribute(node) {
        if (node.name?.name !== "path") {
          return;
        }
        const tag = node.parent?.name;
        if (tag?.type === "JSXIdentifier" && (tag.name === "tool" || tag.name === "toolPanel")) {
          return;
        }
        const value = node.value;
        let lit;
        if (value?.type === "Literal") {
          lit = value;
        } else if (
          value?.type === "JSXExpressionContainer" &&
          value.expression?.type === "Literal"
        ) {
          lit = value.expression;
        }
        if (lit && typeof lit.value === "string" && !isValid(lit.value)) {
          reportNode(lit, lit.value);
        }
      },

      // xmlpage `<prop path="...">` lives inside template strings.
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          const text = quasi.value.cooked ?? quasi.value.raw;
          if (!text?.includes("path=") || !text.includes("<")) {
            continue;
          }
          let m;
          ATTR_RE.lastIndex = 0;
          while ((m = ATTR_RE.exec(text)) !== null) {
            if (!isValid(m[1])) {
              reportNode(quasi, m[1]);
            }
          }
        }
      },
    };
  },
};
