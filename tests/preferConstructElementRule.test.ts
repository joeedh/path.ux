import { describe, test } from "vitest";
import { RuleTester } from "eslint";

// @ts-expect-error - pure JS build helper, no type decls
import preferConstructElement from "../buildtools/eslint-rules/prefer-construct-element.mjs";

// RuleTester emits its cases through whatever test framework it is handed;
// vitest does not install describe/test globally.
RuleTester.describe = describe;
RuleTester.it = test;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("pathux/prefer-construct-element", preferConstructElement, {
  valid: [
    // The replacement itself.
    'UIBase.constructElement("panel-x", ctx);',
    // A plain HTML tag is not a path.ux widget.
    'document.createElement("div");',
    'UIBase.createElement("span");',
    // A tag only known at runtime is left alone rather than guessed at.
    "UIBase.createElement(tagname);",
    "UIBase.createElement(`${prefix}-x`);",
    // A computed member call is not the static being matched.
    'UIBase["createElement"[0]]("panel-x");',
    {
      code   : 'UIBase.createElement("panel-x");',
      options: [{ allow: ["panel-x"] }],
    },
    {
      code   : 'UIBase.createElement("panel-x");',
      options: [{ suffix: "-widget" }],
    },
  ],
  invalid: [
    {
      code  : 'UIBase.createElement("panel-x");',
      errors: [
        {
          messageId: "useConstructElement",
          data     : { tag: "panel-x" },
        },
      ],
    },
    // Any receiver: createElement is a static every UIBase subclass inherits,
    // and document.createElement leaves the widget in the same state.
    {
      code  : 'Container.createElement("colorpicker-x");',
      errors: [{ messageId: "useConstructElement" }],
    },
    {
      code  : 'document.createElement("panel-x");',
      errors: [{ messageId: "useConstructElement" }],
    },
    // A substitution-free template literal is as readable as a quoted string.
    {
      code  : "UIBase.createElement(`panel-x`);",
      errors: [{ messageId: "useConstructElement" }],
    },
    // Tag names reach the DOM lowercased, so the check is case-insensitive.
    {
      code  : 'UIBase.createElement("Panel-X");',
      errors: [{ messageId: "useConstructElement" }],
    },
    // The internal registry overload is no more initialized than the public one.
    {
      code  : 'UIBase.createElement("panel-x", true);',
      errors: [{ messageId: "useConstructElement" }],
    },
    {
      code   : 'UIBase.createElement("panel-x");',
      options: [{ allow: ["listbox-x"] }],
      errors : [{ messageId: "useConstructElement" }],
    },
    {
      code   : 'UIBase.createElement("panel-widget");',
      options: [{ suffix: "-widget" }],
      errors : [{ messageId: "useConstructElement" }],
    },
  ],
});
