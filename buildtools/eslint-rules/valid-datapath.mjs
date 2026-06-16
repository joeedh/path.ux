/**
 * ESLint rule: flag invalid data-path strings.
 *
 * Validates string-literal path arguments to `container.prop(...)` and related
 * widget methods, `path="..."` attributes inside xmlpage template strings, and
 * `path` props in JSX (`<prop path="..." />`), against the catalog in
 * generated/api-paths.json.
 *
 * Relative/prefixed paths (resolved at runtime via Container._joinPrefix) are
 * accepted when they match a known path *suffix*, to avoid false positives.
 * If generated/api-paths.json is missing, the rule is a no-op.
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

function loadCatalog() {
  try {
    const file = resolve(__dirname, "../../generated/api-paths.json");
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
    return { known, suffixes, all: [...known] };
  } catch {
    return undefined;
  }
}

const catalog = loadCatalog();

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

const ATTR_RE = /\bpath\s*=\s*["']([^"']+)["']/g;

export default {
  meta: {
    type    : "problem",
    docs: { description: "validate path.ux data-path strings against generated/api-paths.json" },
    schema  : [],
    messages: {
      unknownPath: 'Unknown data path "{{path}}".{{hint}}',
    },
  },
  create(context) {
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
