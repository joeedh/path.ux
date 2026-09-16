import type { CSSFont } from "../../core/cssfont";
import { t } from "../../core/theme_schema";
import { css2color } from "../../core/ui_theme";

// The editor's own stylesheet and theme keys. Every key becomes a `--richtext-<key>` variable
// on the host, so a provider's static sheet reads the theme without a lookup of its own.

/** The editor's shadow stylesheet; the provider's sheet follows it. */
export const EDITOR_CSS = `
  :host {
    display        : flex;
    flex-direction : column;
    position       : relative;
  }

  .rich-text-root {
    flex          : 1 1 auto;
    min-height    : 6em;
    overflow-y    : auto;
    padding       : 5px;
    outline       : none;
    white-space   : pre-wrap;
    overflow-wrap : anywhere;
    background    : var(--richtext-background);
  }

  .rich-text-root[readonly] {
    background : var(--richtext-readonly-background);
  }

  [data-richtext-toolbar] {
    flex-wrap     : wrap;
    gap           : var(--richtext-toolbar-gap);
    padding       : var(--richtext-toolbar-padding);
    background    : var(--richtext-toolbar-background);
    border-bottom : 1px solid var(--richtext-toolbar-border);
  }

  .rich-text-root ::selection {
    background : var(--richtext-selection-background);
  }
`;

/** The keys `define().theme` declares for the editor. */
export const EDITOR_THEME = {
  DefaultText                : t.font,
  "background-color"         : t.color,
  "toolbar-background"       : t.color,
  "toolbar-border"           : t.color,
  "toolbar-padding"          : t.number,
  "toolbar-gap"              : t.number,
  "toolbar-active-background": t.color,
  "readonly-background"      : t.color,
  "selection-background"     : t.color,
  "link-color"               : t.color,
  "link-underline"           : t.bool,
  "code-font"                : t.font,
  "code-background"          : t.color,
  "code-border-radius"       : t.number,
  "quote-border-color"       : t.color,
  "quote-text-color"         : t.color,
  "marker-color"             : t.color,
  "heading-font"             : t.font,
  "hr-color"                 : t.color,
  "opaque-background"        : t.color,
};

// The color keys set as `--richtext-<key>` variables as they are, and the font keys as CSS
const THEME_COLORS = [
  "toolbar-background",
  "toolbar-border",
  "toolbar-active-background",
  "readonly-background",
  "selection-background",
  "link-color",
  "code-background",
  "quote-border-color",
  "quote-text-color",
  "marker-color",
  "hr-color",
  "opaque-background",
] as const;
const THEME_FONTS = ["code-font", "heading-font"] as const;

/** Where the theme is read from; a method signature, so a widget's typed `getDefault` fits. */
export interface ThemeReader {
  getDefault(key: string): unknown;
}

/** Writes the theme onto `host` as `--richtext-*` variables and sets the root's font. */
export function applyEditorTheme(host: HTMLElement, root: HTMLElement, theme: ThemeReader): void {
  const font = theme.getDefault("DefaultText") as CSSFont;
  root.style.font = font.genCSS();
  root.style.color = font.color;

  const set = (name: string, value: string) => host.style.setProperty(`--richtext-${name}`, value);
  set("background", theme.getDefault("background-color") as string);
  for (const key of THEME_COLORS) {
    set(key, theme.getDefault(key) as string);
  }
  for (const key of THEME_FONTS) {
    set(key, (theme.getDefault(key) as CSSFont).genCSS());
  }
  set("code-border-radius", `${theme.getDefault("code-border-radius") as number}px`);
  set("toolbar-padding", `${theme.getDefault("toolbar-padding") as number}px`);
  set("toolbar-gap", `${theme.getDefault("toolbar-gap") as number}px`);
  set("link-underline", theme.getDefault("link-underline") ? "underline" : "none");

  // The toolbar's sprite icons are white, so a brightness filter multiplies them to the text
  // color's luminance, which reads in a light theme and a dark one alike; the toolbar
  // helpers put the variable on each icon div, so a button's own background keeps its color
  const c = css2color(font.color);
  const luminance = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  host.style.setProperty("--richtext-icon-tint", `brightness(${luminance.toFixed(3)})`);
}
