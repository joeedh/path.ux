import js from "@eslint/js";
import globals from "globals";
import { quickbuild } from "@pathtx/eslint-dispatcher";

//import tseslint from "typescript-eslint";
const tseslint = await quickbuild.quickBundleModule("typescript-eslint", { format: "cjs" }, true);

const eslintConfig = await quickbuild.quickBundleModule("eslint/config", { format: "cjs" }, true);
const { defineConfig, globalIgnores } = eslintConfig;
//import { defineConfig } from 'eslint/config';

import validDatapath from "./buildtools/eslint-rules/valid-datapath.mjs";

export default defineConfig([
  globalIgnores([
    "index.d.ts",
    "pathux.d.ts",
    "pathux.js",
    "pathux_with_docbrowser.js",
    //old rollup config files
    "rollup*.js",
    "scripts/path-controller/util/*.js",
    "**tinymce**",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "generated/**",
    "simple_docsys/doc_build",
    "scripts/lib/tinymce/**",
    // Deliberately-wrong data paths that validDatapathRule.test.ts lints itself.
    "tests/fixtures/valid-datapath/**",
  ]),
  {
    files          : ["**/*.{js,mjs,cjs,ts,mts,cts,tsx,jsx}"],
    plugins        : { js },
    extends        : ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    rules: {
      "no-unused-vars"                                            : "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args        : "none",
          caughtErrors: "none",
        },
      ],
      "sort-imports"                                              : "off",
      "no-constant-condition"                                     : "off",
      "no-unassigned-vars"                                        : "error",
      "no-unreachable-loop"                                       : "off",
      // off during typification
      "no-unreachable"                                            : "off",
      "no-unsafe-negation"                                        : "error",
      "no-useless-assignment"                                     : "error",
      "@typescript-eslint/array-type"                             : "error",
      // off during typification
      "@typescript-eslint/no-explicit-any"                        : "off",
      "@typescript-eslint/no-this-alias"                          : "off",
      // off during typification
      "@typescript-eslint/ban-ts-comment"                         : "off",
      // off during typification
      "no-debugger"                                               : "off",
      // off during typification
      "@typescript-eslint/no-unsafe-function-type"                : "off",
      "@typescript-eslint/no-for-in-array"                        : "error",
      "@typescript-eslint/no-mixed-enums"                         : "error",
      "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",

      // Note: you must disable the base shadow rule as it can report incorrect errors
      "no-shadow"                   : "off",
      // off during typification
      "@typescript-eslint/no-shadow": "off",

      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",

      // Note: you must disable the base rule as it can report incorrect errors
      "no-unused-private-class-members"                   : "off",
      // off during typification
      "@typescript-eslint/no-unused-private-class-members": "off",

      "@typescript-eslint/no-useless-default-assignment": "error",
      "@typescript-eslint/prefer-includes"              : "error",
      "@typescript-eslint/prefer-optional-chain"        : "error",
      "@typescript-eslint/related-getter-setter-pairs"  : "error",
      "@typescript-eslint/no-empty-object-type"         : "off",
      "one-var"                                         : ["error", "never"],
    },
  },
  {
    plugins: { pathux: { rules: { "valid-datapath": validDatapath } } },
    rules  : { "pathux/valid-datapath": "warn" },
  },
  {
    // Build-tool CLIs run under Node, not the browser.
    files          : ["buildtools/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
]);
