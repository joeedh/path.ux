/**
 * ESLint rule: flag `createElement("some-x")` calls that build a path.ux widget,
 * and point at `UIBase.constructElement(tag, ctx)` instead.
 *
 * `createElement` hands back a widget whose `init()` has not run. Initialization
 * is deferred to the element's first `update()`, so anything the caller does to
 * the widget in the meantime races with it: a `.setValue()` can be overwritten
 * by the widget's own `init()`, and a child added there may never appear.
 * `constructElement` assigns `ctx` and calls `checkInit()` before returning, so
 * the widget is fully built by the time the caller touches it.
 *
 * This rule is for consumers of path.ux. path.ux itself calls `createElement`
 * from inside the widget layer, where the deferred init is the intended
 * behavior, and does not enable it.
 *
 * Only a literal tag is checked -- a string literal, or a template literal with
 * no substitutions. A tag computed at runtime is left alone rather than guessed
 * at, so a call built from a variable can hide the problem this catches.
 *
 * The receiver is not checked. `createElement` is a static that every `UIBase`
 * subclass inherits, so the call reads `UIBase.createElement`,
 * `Container.createElement` or `MyPanel.createElement` interchangeably, and
 * `document.createElement("some-x")` leaves the widget in the same state.
 */

const DEFAULT_SUFFIX = "-x";

/** The tag a call names, or undefined when it is not a literal. */
function literalTag(node) {
  if (node?.type === "Literal") {
    return typeof node.value === "string" ? node.value : undefined;
  }
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? undefined;
  }
  return undefined;
}

export default {
  meta: {
    type    : "problem",
    docs: {
      description: "require UIBase.constructElement over createElement for path.ux custom elements",
    },
    schema: [
      {
        type                : "object",
        properties: {
          // Tag suffix that marks a path.ux custom element.
          suffix: { type: "string" },
          // Tags to leave alone, matched case-insensitively.
          allow : { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      useConstructElement:
        'createElement("{{tag}}") returns a widget before its init() has run; ' +
        'use UIBase.constructElement("{{tag}}", ctx) instead.',
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const suffix = (options.suffix ?? DEFAULT_SUFFIX).toLowerCase();
    const allow = new Set((options.allow ?? []).map((tag) => tag.toLowerCase()));

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.property.name !== "createElement") return;

        const tag = literalTag(node.arguments[0]);
        if (tag === undefined) return;

        const lower = tag.toLowerCase();
        if (!lower.endsWith(suffix) || allow.has(lower)) return;

        context.report({
          node     : node.arguments[0],
          messageId: "useConstructElement",
          data     : { tag },
        });
      },
    };
  },
};
