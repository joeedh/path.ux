<!-- toc -->

- [Overview](#overview)
- [Theme variables](#theme-variables)
  - [Variants](#variants)
- [The theme file](#the-theme-file)
  - [Example theme file](#example-theme-file)
  - [Variable comments](#variable-comments)
- [The theme editor widget](#the-theme-editor-widget)
  - [Variable mode](#variable-mode)
- [A theme editor area with an export button](#a-theme-editor-area-with-an-export-button)
  - [The export handler](#the-export-handler)
- [Typed theme lookups](#typed-theme-lookups)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

# Overview

A theme is a record of style classes, each mapping keys to values: colors (CSS color
strings), numbers, booleans, `CSSFont` instances, `ThemeScrollBars`, and nested
sub-records such as `disabled` or `highlight`. Widgets read values with
`UIBase.getDefault(key)`, which searches the widget's own style class (from
`define().style`), then `parentStyle`, then `base`.

`setTheme(record)` merges a theme into the live global `theme` object (it does not
replace it), so an app theme only needs the keys it overrides — everything else falls
through to path.ux's defaults. After changing the live theme at runtime, call
`flagThemeUpdate()` and repaint (`screen.completeSetCSS()`, `screen.completeUpdate()`);
the `ThemeEditor` widget does this itself after every edit.

The **theme file is the ground source of truth**: a TypeScript file in the app's
source tree holding a `themeVars` block and a `theme` record that references those
variables. Everything else is derived from it. The live global theme is a runtime
instance of the file. There is a theme editor widget that edits this live instance,
clients typically add an Export button that writes a new theme file directly
with (hopefully) comments preserved. This is done to avoid using
complex JSON or CSS files that inevitably must be hand-edited by non-programmers.

The cycle, in order:

1. The app ships the theme file and at startup loads it with
   `setTheme(instanceThemeVars(theme, themeVars))`.
2. A **theme editor area** embeds the `ThemeEditor` widget, which edits the live
   theme in place. The edits are runtime-only until exported.
3. An app-written **Export** button regenerates the file's source with
   `createThemeFile` and downloads it; the downloaded file replaces the old one, and
   the next build ships the edits. `createThemeFile` preserves the variables' `//`
   comments when handed the current source (use `//` comments only, and verify the
   round-trip when wiring this up); see [Variable comments](#variable-comments).

Everything named here (`getVars`, `instanceThemeVars`, `createThemeFile`,
`parseVarComments`, `ThemeVar`, `ThemeEditor`, `setTheme`, `flagThemeUpdate`,
`theme`) is exported from the pathux entry point. The variable system itself lives in
`scripts/core/ui_theme_utils.ts`, the editor in `scripts/widgets/theme_editor.ts`.

# Theme variables

Most themes repeat a handful of decisions — an accent color, a body font, a border
radius — across dozens of keys. Theme variables name each decision once:

```ts
import { CSSFont, getVars, instanceThemeVars } from "pathux";
import type { ThemeRecordWithVar, VarKeys } from "pathux";

export const themeVars = {
  // accent color for interactive widgets
  accent: "rgba(103, 143, 187, 1)",
  // the body font
  body  : new CSSFont({ size: 14, color: "rgba(35, 35, 35, 1)" }),
  radius: 6,
} as const;

const vars = getVars(themeVars);

export const theme = {
  base: {
    DefaultText    : vars.body,
    "border-radius": vars.radius,
  },
  button: {
    BoxHighlight   : vars.accent,
    "border-radius": vars.radius,
  },
} satisfies ThemeRecordWithVar<VarKeys<typeof vars>>;
```

`getVars(themeVars)` returns one `ThemeVar` placeholder per key; writing `vars.accent`
in the theme records "this slot takes the value of `accent`". The
`satisfies ThemeRecordWithVar<VarKeys<typeof vars>>` annotation type-checks the
references: a variable from a different `getVars` set, or a typo reached through
`vars[...]`, is rejected at compile time.

`instanceThemeVars(theme, themeVars)` substitutes the values in and returns a plain
theme record ready for `setTheme`:

```ts
import { setTheme } from "pathux";

setTheme(instanceThemeVars(theme, themeVars));
```

Neither argument is mutated and the result shares no object with either, so a variable
used in several places yields a separate copy at each slot — editing one slot in the
theme editor later does not bleed into the others. An unknown variable throws, naming
the key and the path it was used at.

## Variants

A variant instances the same theme with different variable values:

```ts
const darkVars = {
  ...themeVars,
  accent: "rgba(80, 120, 170, 1)",
  body  : new CSSFont({ size: 14, color: "rgba(220, 220, 220, 1)" }),
} as const;

setTheme(instanceThemeVars(theme, darkVars));
flagThemeUpdate();
screen.completeSetCSS();
screen.completeUpdate();
```

The original theme still holds its variables afterward, so switching back is another
`instanceThemeVars` call away.

# The theme file

`createThemeFile({ theme, vars })` generates the source text of a theme module. The
file has four blocks, always in this order:

1. a header — an auto-generated warning plus an import of exactly the names the file
   uses (`getVars`, `instanceThemeVars`, and `CSSFont` / `ThemeScrollBars` when a value
   needs them), from `importPath` (default `"pathux"`);
2. `export const themeVars = { ... } as const;` — the variables, each preceded by its
   comment;
3. `export const theme = { ... } satisfies ThemeRecordWithVar<VarKeys<typeof vars>>;`
   — the theme, with each `ThemeVar` written back as a `vars.foo` reference (or
   `vars["odd-key"]` when the name is not an identifier) rather than the value it
   currently holds;
4. `export const instancedTheme = instanceThemeVars(theme, themeVars);` — so a
   consumer can import the resolved theme directly.

`CSSFont` and `ThemeScrollBars` values are written as constructor calls carrying only
the fields that differ from the constructor's own defaults. An `onAssemble(header,
vars, theme, footer)` option lets the app rearrange or extend the blocks (the header
always includes the auto-generated warning). Arrays are not theme values and are
rejected.

The generated file evaluates back to the records it was written from, so regenerating
a file that nothing edited reproduces it byte for byte.

## Example theme file

A small but complete generated theme file:

```ts
//XXX warning: auto-generated file!

import { CSSFont, getVars, instanceThemeVars } from "pathux";
import type { ThemeRecordWithVar, VarKeys } from "pathux";

export const themeVars = {
  // accent color for interactive widgets
  accent: "rgba(103, 143, 187, 1)",
  // panel and widget background
  bg    : "rgba(217, 217, 217, 1)",
  // the body font
  body  : new CSSFont({ size: 14, color: "rgba(35, 35, 35, 1)" }),
  // corner rounding, in pixels
  radius: 6,
} as const;

const vars = getVars(themeVars);

export const theme = {
  base: {
    "background-color"  : vars.bg,
    "border-radius"     : vars.radius,
    BoxHighlight        : vars.accent,
    DefaultText         : vars.body,
    LabelText           : vars.body,
    "focus-border-width": 2,
  },
  button: {
    "background-color": vars.bg,
    "border-radius"   : vars.radius,
    BoxHighlight      : vars.accent,
    DefaultText       : new CSSFont({ size: 12, weight: "bold", color: "rgba(35, 35, 35, 1)" }),
    padding           : 4,
  },
  numslider: {
    "background-color": vars.bg,
    "border-radius"   : vars.radius,
    BoxHighlight      : vars.accent,
  },
} satisfies ThemeRecordWithVar<VarKeys<typeof vars>>;

export const instancedTheme = instanceThemeVars(theme, themeVars);
```

The app loads it with either import:

```ts
import { instancedTheme } from "./theme";
setTheme(instancedTheme);

// or, when the app also builds variants:
import { theme, themeVars } from "./theme";
setTheme(instanceThemeVars(theme, themeVars));
```

## Variable comments

The `//` comments above each variable (and any trailing one on its line) survive
regeneration. Pass the current file's source as `existingThemeFile` and
`createThemeFile` reads the comments out of it with `parseVarComments` and writes them
into the new file. `parseVarComments` also reads a hand-authored theme module — it
finds the variable block by the file's own `getVars` call — so a theme that started
out hand-written keeps its comments on first export. A comment separated from its
variable by a blank line or other code does not attach to it.

# The theme editor widget

`ThemeEditor` (tagname `theme-editor-x`) builds a panel per style class of the live
global theme, with a color button, slider, checkbox, textbox or font sub-panel per
value, chosen by the value's type (a string that parses as a CSS color gets a color
button). Keys whose name contains "flag" are skipped. A "+" menu on each panel adds a
new property to that record.

Every edit writes into the live `theme` object in place, then flags the theme dirty
and repaints the screen — the app restyles as the user drags a slider. The editor also
dispatches a `"change"` event (a `ThemeChangeEvent` carrying `category`, `key`, and
for added properties the edited `record`); the old `on_change` callback remains as a
deprecated shim.

The edits exist only in the running app. The theme file on disk stays the source of
truth, and keeping an edit means exporting a regenerated file over it — the next
section's Export button.

`categoryMap` optionally regroups the theme's top-level keys into named categories for
display; keys it does not mention appear under their own name.

## Variable mode

Hand the editor the untransformed theme and its variables and it also edits those:

```ts
import { theme as varTheme, themeVars } from "./theme";

editor.setVarTheme(varTheme, themeVars);
```

Both records are deep-copied, so nothing the user does reaches the module's own
state — an app keeping `themeVars` around to build a variant is unaffected. A third
argument takes the theme file's source, which brings each variable's comment across
into the panel. Without `setVarTheme` the widget behaves exactly as the section above
describes.

A Variables panel then appears above the style classes, listing each variable with its
name, its value, how many slots read it, the comment it is exported with and a delete
entry. A "+" menu beside a name box adds one. Each theme value grows a menu offering
the variables its type fits, "New variable from this value", and "Detach" where it is
already bound. A colour and a string are interchangeable, because a colour is a string
the editor recognised; every other type has to match. Binding is offered for whole
values only, so the fields inside a font or a `ThemeScrollBars` have no menu of their
own.

Four rules govern what an edit does:

- Editing a slot bound to a variable edits the variable, and every other slot reading
  it repaints. Each slot holds its own copy of the value, so detaching one later leaves
  the rest alone.
- Deleting a variable writes its current value into every slot that read it, then
  removes it. Nothing on screen moves.
- `ThemeChangeEvent` carries a `varKey` when the change came through a variable,
  dispatched once per edit rather than once per affected slot. `category` and `key`
  still name the slot the user was editing.
- Binding a slot the theme file never mentioned creates the entry then and there,
  rather than mirroring path.ux's whole default theme into the file. `setTheme`
  rewrites the key inside a style class through `compatMap` — an authored
  `base: { BoxBG: … }` is read back as `theme.base["background-color"]` — so the new
  entry is written under the name the file authored, and the editor warns rather than
  binding both when two legacy keys collapse onto one live key.

Creating an entry two levels down inside a style class seeds the sub-record from the
current live values, because `setTheme` assigns a sub-record by reference and a partial
one would replace the library's wholesale at the next load. The cost is that path.ux's
current defaults for those keys are frozen into the app's file, so a later library
upgrade does not reach them.

`invertTheme()` rewrites live colours in place behind the editor's back. The bindings
survive, but the values the rows show no longer match what the variables hold; rebuild
the editor after calling it.

# A theme editor area with an export button

The editor edits the live theme; it does not write files. The client app typically
wraps it in an editor area of its own, adding an Export button that regenerates the
theme file and hands it to the user as a download:

```ts
import { Area, UIBase } from "pathux";
import type { ThemeEditor } from "pathux";

export class ThemeEditorArea extends Area {
  init() {
    super.init();

    const container = this.container;
    container.button("Export Theme", () => exportThemeFile()).description =
      "Download a regenerated theme.ts with your edits";

    const editor = UIBase.createElement<ThemeEditor>("theme-editor-x");
    container.add(editor);
    this.style.overflowY = "scroll";
  }

  static define() {
    return {
      tagname : "theme-editor-area-x",
      areaname: "theme_editor",
      uiname  : "Theme Editor",
    };
  }
}
```

## The export handler

An editor in variable mode owns the authored record, so it writes the file itself:

```ts
import { UIBase } from "pathux";
import type { ThemeEditor } from "pathux";
import { theme as varTheme, themeVars } from "./theme";

const editor = UIBase.createElement<ThemeEditor>("theme-editor-x");
editor.setVarTheme(varTheme, themeVars);

function exportThemeFile() {
  const src = editor.createFile({ importPath: "pathux" });

  const blob = new Blob([src], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "theme.ts";
  a.click();

  URL.revokeObjectURL(url);
}
```

The user drops the downloaded `theme.ts` over the old one; the next build picks it up.
An Electron or NW.js app can write the file directly through its platform's file API
instead of downloading.

`createFile` also takes `existingThemeFile`, which reads the variable comments out of
the source the app is running on; the comments typed into the Variables panel win over
them. With vite a `?raw` import supplies the source, and a bundler without one can
fetch the file over HTTP. Passing it is optional, because `setVarTheme` already takes
the same source. `createFile` throws if `setVarTheme` was never called, since there is
no authored record to write. The plain `exportTheme` still writes the live theme out
as a flat literal, with every variable resolved.

# Typed theme lookups

The theme file governs values; the keys widgets read are typed separately. A widget
declares the keys it reads in `static define().theme`, and `pnpm run gen:themes`
regenerates the per-class key catalog that `pnpm run typecheck:themes` checks
`getDefault` calls against. See the "Theme typing (`getDefault`)" section of
CLAUDE.md for that workflow; adding a key to a theme file does not require a catalog
change unless a widget's `define().theme` declares it.
