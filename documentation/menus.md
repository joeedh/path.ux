# Menus

Menus, dropdown boxes and the popup menu bar live in `scripts/menu/`,
re-exported from `pathux.js`. The folder has five files: `menu.ts` (the `Menu`
widget, a popup list of items), `dropbox.ts` (the `DropBox` button that opens
one), `wrangler.ts` (`MenuWrangler`, the singleton that routes keyboard and
pointer events to whichever menu is open), `menu_ops.ts` (`createMenu`,
`startMenu`, `openMenuPopup`) and `menu_types.ts` (the template types).
`scripts/widgets/ui_menu.ts` remains as a deprecated re-export shim for old deep
imports.

<!-- toc -->

- [Menu templates](#menu-templates)
  * [Tool path strings](#tool-path-strings)
  * [Separators](#separators)
  * [Custom entries](#custom-entries)
  * [Submenus](#submenus)
  * [DOM callbacks](#dom-callbacks)
- [Putting a menu on screen](#putting-a-menu-on-screen)
  * [A menu bar button](#a-menu-bar-button)
  * [A context menu](#a-context-menu)
  * [An enum dropdown](#an-enum-dropdown)
- [Building a menu by hand](#building-a-menu-by-hand)
- [The application menu bar](#the-application-menu-bar)
- [The menu wrangler](#the-menu-wrangler)
- [Search mode](#search-mode)
- [Tooltips](#tooltips)
- [Theming](#theming)
- [Which editors a menu offers](#which-editors-a-menu-offers)
- [Gotchas](#gotchas)
<!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Menu templates

Most callers never touch `Menu` directly. They pass a `MenuTemplate` — an array
whose entries are each one of the forms below — to `Container.menu` or to
`createMenu(ctx, title, template)`.

### Tool path strings

A string entry is a tool path. `createMenu` resolves it through
`ctx.api.getToolDef`, takes the label and icon from the tool definition, looks up
the tool's hotkey through `ctx.api.getToolPathHotkey`, and runs
`ctx.api.execTool(ctx, toolpath)` when the entry is picked. An unresolvable path
becomes a `(tool path error)` row rather than a throw.

Two suffixes override what the tool definition says:

```js
"app.save()"; // label and hotkey from the tool
"app.save(forceDialog=true)|Save As"; // |  overrides the label
"app.open()|Open::Ctrl-O"; // :: overrides the hotkey string
```

The hotkey override is display text only; it does not create a key binding.

### Separators

`Menu.SEP` (also exported as `SEP`) draws a horizontal rule.

### Custom entries

The object form is preferred:

```js
{
  name: "Reset View",
  callback: (id) => { view.reset() },
  hotkey: "Home",        // string or a HotKey instance
  icon: Icons.HOME,      // optional, -1 for none
  tooltip: "Frame the whole graph",
  id: "resetView",       // optional; an integer is allocated when omitted
}
```

An older positional array — `[name, callback, hotkey, icon, tooltip, id]` — is
still accepted. Prefer the object: skipping an optional slot in the array
silently shifts an argument into the wrong field.

The callback receives the entry's id.

### Submenus

A `Menu` instance placed in a template becomes a submenu row, labelled by its
`name` attribute. Build one with `Menu.menu(title)` from a parent menu, or with
`createMenu` and then `parent.addItem(sub)`.

A submenu built by `createMenu` keeps its own dispatch: its entries' callbacks are
filed on the submenu and keyed by that submenu's ids. Picking a submenu entry runs
that callback and then closes both menus. A submenu assembled by hand, with no
dispatch of its own, falls back to the parent's.

### DOM callbacks

A function entry is called with a fresh `div` and must return an item — usually a
DOM element to use as the row's contents.

## Putting a menu on screen

### A menu bar button

`Container.menu(title, template)` adds a `DropBox` marked `simple`, which is the
flat, borderless form used in a menu bar. It returns the dropbox.

```js
container.menu("File", ["app.new()", Menu.SEP, "app.save()", "app.save(forceDialog=true)|Save As"]);
```

`Container.dynamicMenu` is an alias of `menu`.

Pass a function instead of an array to rebuild the template every time the button
is pressed:

```js
const dbox = container.menu("Add", []);
dbox.template = () => nodeTypes.map((t) => ({ name: t.uiName, callback: () => add(t) }));
```

### A context menu

Build the menu, then pop it up at the pointer:

```js
const menu = createMenu(this.ctx, "", [
  { name: "Delete", callback: () => this.deleteSelected(), icon: Icons.TINY_X },
]);
this.ctx.screen.popupMenu(menu, e.x, e.y);
```

`Screen.popupMenu(menu, x, y)` wraps `startMenu(menu, x, y, searchMenuMode,
safetyDelay)` and flushes layout so the menu is measured before it is shown.
`startMenu` closes any open menus first, so a second right-click replaces the
first menu rather than stacking on it.

Two knobs matter for pointer-driven menus. `menu.ignoreFirstClick = 2` swallows
the clicks the opening gesture itself produces (`FrameManager_mesh`'s border menu
opens on a double-click and sets this). `menu.closeOnMouseUp = false` keeps the
menu open when the button that opened it is released, which is what a right-click
menu wants; leaving it `true` makes the menu behave like a press-drag-release
dropdown.

Also suppress the browser's own menu on the element that opens yours:

```js
elem.addEventListener("contextmenu", (e) => e.preventDefault());
```

### An enum dropdown

`Container.listenum(path, name?, enumDef?, defaultval?, callback?, iconmap?)`
returns a `DropBox` that builds its items from an `EnumProperty` — its
`ui_value_names` for labels, `iconmap` for icons and `descriptions` for tooltips.
Bound to a datapath, it writes the picked value back through `setPathValue`; with
`enumDef` and no path, it reports through the property and `on_select`.

`container.prop("some.enum.path")` reaches the same widget through the normal
property machinery.

Set `searchMenuMode = true` on a dropbox to open it as a filterable list.

## Building a menu by hand

`createMenu` covers most cases. Build the widget directly when the items are not
known as data:

```js
const menu = newMenu("", this.ctx);
menu._init();

menu.addItem("Plain row", "plain");
menu.addItemExtra("With icon", "fancy", "Ctrl-D", Icons.DUPLICATE, true, "Duplicate the node");
menu.seperator();
const sub = menu.menu("More");
sub.addItem("Nested", "nested");

menu.on_select = (id) => {
  console.log("picked", id);
};
startMenu(menu, x, y, false, 0);
```

- `addItem(item, id?, add?, tooltip?)` — `item` is a string, a DOM element or a
  `Menu`. The id defaults to the item itself.
- `addItemExtra(text, id, hotkey?, icon?, add?, tooltip?)` — the row form with an
  icon column and a right-aligned hotkey.
- `seperator()`, `menu(title)`, `close()`, `start()`, `startSearch()`.
- `on_select(id)` is the public callback. `_onselect(id)` is the internal one
  `createMenu` installs for template dispatch; both fire when both are set.
- `_onclose` runs when the menu closes for any reason.

`start()` is called for you by `startMenu` and by `DropBox`; call it directly only
when you are hosting the menu in a container of your own.

## The application menu bar

`Editor.registerAppMenu(fn)` — called on the `simple.Editor` base class, and only
there — installs the function that fills the menu bar:

```js
Editor.registerAppMenu((ctx, container, menuBarEditor) => {
  container.menu("File", ["app.new()", Menu.SEP, "app.save()"]);
  container.menu("Edit", ["app.undo()", "app.redo()"]);
});
```

`registerMenuBarEditor()` registers `MenuBarEditor`, the fixed-height area that
hosts that row. It is `AreaFlags.HIDDEN`, so it never appears in an editor list.
`flagRebuild()` rebuilds the row on the next update, which is how a menu whose
contents depend on application state is refreshed. Under Electron the bar hands
off to the native menu through `electron_api.initMenuBar` and shrinks itself to
one pixel.

## The menu wrangler

`menuWrangler` is a module-level singleton holding the stack of open menus. The
screen installs it once through `setWranglerScreen(screen)` (which calls
`startMenuEventWrangling`); the handlers are registered on `window` with
`capture: true`.

What it does:

- Arrow keys move the selection, Enter and Space pick, Escape closes. Left and
  Right move to the previous or next `DropBox` sibling, which is what makes a menu
  bar walkable from the keyboard.
- Hovering a different `simple` dropbox while a menu is open closes the current
  menu and opens that one.
- A pointer that leaves the menu schedules a close, `cconst.menu_close_time`
  milliseconds later, checked by a 150 ms timer.
- `endMenus()` closes the whole stack.

`cconst.menusCanPopupAbove` lets a dropbox in the lower half of the screen measure
its menu and reposition it above the button.

Set `window.DEBUG.menu = true` for the wrangler's push/pop/close tracing.

## Search mode

A menu with more than 15 items opens in search mode on its own, unless
`autoSearchMode` is set to `false`. Search mode adds a text box that filters rows
by substring, fixes the list at 300 pixels tall and scrolls it. `startSearch()`
enters it explicitly, and `DropBox.searchMenuMode` forces it for that dropbox.
`startFancy()` is a deprecated alias of `startSearch()`; the old `start_fancy()`
shim is removed.

## Tooltips

Every row should say what it does. Ordinary rows take their tooltip through the
`tooltip` argument of `addItem`/`addItemExtra`, or the `tooltip` field of a
template entry. A submenu is added as the menu itself, so there is no argument to
pass: set `submenu.tooltip` and the parent uses it for the row it draws.

Tool path entries take no tooltip. Fix the tool's own `description` instead.

## Theming

The `menu` style class carries the keys `MenuBG`, `MenuHighlight`, `MenuText` (a
`CSSFont`, whose `color` also sets the item text), `MenuSpacing` (vertical padding
per item), `MenuSeparator` (an object of CSS declarations), `item-radius`,
`box-shadow`, and the usual `border-*`, `padding-*` and `border-radius` keys.
A row's right-aligned hotkey takes its font from `HotkeyText` and its color from
`HotkeyTextColor`, which `addItemExtra` applies separately from the font. `DropBox`
uses the `dropbox` class and additionally reads `dropTextBG` and `BoxDepressed`.

## Which editors a menu offers

`setAreaMenuFilter(filter)` narrows the editor list that the pane switcher and the
docker's add menu build from the area registry. It is application policy rather
than a property of an editor class — `AreaFlags.HIDDEN` is the per-class answer.
See `scripts/screen/area_base.ts`.

## Gotchas

- A menu widget needs `ctx` before it is started. `createMenu` sets it, and
  `newMenu(title, ctx?)` creates a named, unstarted `menu-x` with it set; a
  hand-built menu still needs `_init()`.
- Ids are not namespaced across a menu and its submenus. `createMenu` allocates
  integers from zero per menu, so supply explicit ids when a single `on_select`
  handles several menus.
- `Container.menu` keeps the template on the dropbox and builds the `Menu` on each
  press. Mutating the array after the fact is therefore visible on the next press.
- Menus are popups on the screen, not children of the widget that opened them.
  They do not inherit that widget's style class.
