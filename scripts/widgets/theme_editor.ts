import { UIBase, theme, flagThemeUpdate, saveUIData, loadUIData } from "../core/ui_base";
import { Container, ColumnFrame } from "../core/ui";
import { IContextBase } from "../core/context_base";
import { validateCSSColor, color2css, css2color, ThemeScrollBars } from "../core/ui_theme";
import type { ThemeItem, ThemeRecord } from "../core/ui_theme";
import { CSSFont } from "../core/cssfont";
import {
  addVar,
  bindSlot,
  copyThemeItem,
  copyVarItem,
  createThemeFile,
  deleteVar,
  isPlainRecord,
  parseVarComments,
  pathKey,
  renameVar,
  toLivePath,
  unbindSlot,
  varSlots,
} from "../core/ui_theme_utils";
import type { ThemePath, ThemeRecordWithVar, ThemeVarsDef } from "../core/ui_theme_utils";
import type { MenuTemplate } from "./ui_menu";
import type { PanelContents } from "./ui_panel";

interface CatKey {
  key: string;
  category: string;
  help: string;
}

/** Dispatched by {@link ThemeEditor} whenever a theme value is edited or added. */
export class ThemeChangeEvent extends Event {
  category: string;
  key: string;
  record?: ThemeRecord;
  /** The variable that was edited, when the change came through one. */
  varKey?: string;

  constructor(category: string, key: string, record?: ThemeRecord, varKey?: string) {
    super("change");

    this.category = category;
    this.key = key;
    this.record = record;
    this.varKey = varKey;
  }
}

/** Which editor a theme value gets. `skip` values are left out of the panel. */
export type ItemKind = "color" | "string" | "number" | "boolean" | "font" | "record" | "skip";

/** One group of the theme's top-level keys, as {@link ThemeEditor} lays them out. */
export interface ThemeCategory {
  category: string;
  keys: CatKey[];
}

const FONT_FIELDS = ["font", "variant", "weight", "style"] as const;

const VAR_NAME_WIDTH = 110;
const VAR_VALUE_WIDTH = 150;
const VAR_COMMENT_WIDTH = 150;

function strcmp(a: string, b: string): number {
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();
  return a < b ? -1 : a === b ? 0 : 1;
}

export function themeItemKind(name: string, value: ThemeItem): ItemKind {
  if (name.toLowerCase().search("flag") >= 0) {
    return "skip";
  }

  if (typeof value === "string") {
    return validateCSSColor(value.toLowerCase().trim()) ? "color" : "string";
  } else if (typeof value === "number") {
    return "number";
  } else if (typeof value === "boolean") {
    return "boolean";
  } else if (value instanceof CSSFont) {
    return "font";
  } else if (typeof value === "object" && value !== null) {
    return "record";
  }

  return "skip";
}

/**
 * Whether a slot the editor shows as `kind` may read a variable holding `value`.
 * A colour is a string the editor happens to have recognised, so the two are
 * interchangeable; every other kind has to match.
 */
function varFits(kind: ItemKind, value: ThemeItem): boolean {
  const other = themeItemKind("", value);

  if (kind === "color" || kind === "string") {
    return other === "color" || other === "string";
  }

  return other === kind;
}

/**
 * Groups the theme's top-level keys by category, sorting the categories and the keys
 * within each. A `categoryMap` entry may be a bare category name, which is expanded
 * into a {@link CatKey} whose `key` is the theme key it was found under.
 */
export function groupThemeCategories(
  rec: ThemeRecord,
  categoryMap: Record<string, string | CatKey>
): ThemeCategory[] {
  const categories: Record<string, CatKey[]> = {};

  for (const k of Object.keys(rec)) {
    const mapped = categoryMap[k];
    let catkey: CatKey;

    if (typeof mapped === "string") {
      catkey = { category: mapped, help: "", key: k };
    } else if (mapped) {
      catkey = { ...mapped, key: mapped.key || k };
    } else {
      catkey = { category: k, help: "", key: k };
    }

    if (!(catkey.category in categories)) {
      categories[catkey.category] = [];
    }

    categories[catkey.category].push(catkey);
  }

  return Object.keys(categories)
    .sort(strcmp)
    .map((category) => ({
      category,
      keys: categories[category].sort((a, b) => strcmp(a.key, b.key)),
    }));
}

/** Walks `path` from the theme root. */
function resolveRecord(path: string[]): ThemeRecord {
  let rec: ThemeRecord = theme;

  for (const key of path) {
    rec = rec[key] as ThemeRecord;
  }

  return rec;
}

/** Walks `path` from the theme root, answering undefined where it does not exist. */
function findRecord(path: string[]): ThemeRecord | undefined {
  let rec: ThemeItem = theme;

  for (const key of path) {
    if (typeof rec !== "object" || rec === null) {
      return undefined;
    }
    rec = (rec as ThemeRecord)[key];
  }

  return typeof rec === "object" && rec !== null ? (rec as ThemeRecord) : undefined;
}

/**
 * Reading and writing one value a row edits. The same row builders serve a plain
 * theme slot, a slot bound to a theme variable, and a row of the Variables panel.
 */
export interface ValueSlot {
  get(): ThemeItem;
  set(value: ThemeItem): void;
  /** The variable this slot writes, when it is bound to one. */
  varKey?: string;
}

/** A row's own re-read of its slot, run when something else writes the same value. */
interface RowRefresh<CTX extends IContextBase> {
  widget: UIBase<CTX>;
  slot: ValueSlot;
  refresh(): void;
}

export class ThemeEditor<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "ThemeEditor"
> {
  categoryMap: Record<string, string | CatKey>;

  private _refreshes: RowRefresh<CTX>[] = [];
  private _refreshing = false;

  private _varTheme?: ThemeRecordWithVar<string>;
  private _vars: ThemeVarsDef = {};
  private _varComments: Record<string, string> = {};
  //live path of a bound slot, as pathKey, to the variable it reads
  private _bindings = new Map<string, string>();
  //live path of an authored slot, as pathKey, to the path it is written at
  private _authored = new Map<string, ThemePath>();
  //the row whose gesture is writing, so a broadcast does not refresh it
  private _origin?: UIBase<CTX>;
  private _varsPanel?: PanelContents<CTX>;

  constructor() {
    super();

    this.categoryMap = {};
  }

  static define() {
    return {
      tagname: "theme-editor-x",
      style  : "theme-editor",
    };
  }

  init() {
    super.init();

    this.build();
  }

  addEventListener(
    type: "change",
    listener: (this: ThemeEditor<CTX>, ev: ThemeChangeEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener:
      | ((this: ThemeEditor<CTX>, ev: ThemeChangeEvent) => void)
      | EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListenerOrEventListenerObject, options);
  }

  /** Builds a panel of editors for `obj`, recursing into its sub-records. */
  doFolder(
    catkey: CatKey,
    obj: ThemeRecord,
    container: Container<CTX> = this,
    panel?: PanelContents<CTX>,
    path?: string[],
    bindable = true
  ): void {
    const key = catkey.key;

    if (!path) {
      path = [key];
    }

    if (!panel) {
      panel = container.panel(key, undefined, undefined, catkey.help);
      panel.style.marginLeft = "15px";
    }

    this.addPropMenu(panel, catkey, obj, container, path);

    const row = panel.row();
    const col1 = row.col();
    const col2 = row.col();

    let placed = 0;

    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const kind = themeItemKind(k, v);

      if (kind === "skip") {
        continue;
      }

      if (kind === "record") {
        this.doFolder(
          { ...catkey, key: k },
          v as ThemeRecord,
          panel,
          undefined,
          [...path, k],
          bindable && !(v instanceof ThemeScrollBars)
        );
      } else {
        const col = placed % 2 === 0 ? col1 : col2;
        const livePath = [...path, k];

        this.valueRow(col, k, this.slotFor(livePath, key, k), kind);

        if (bindable && this._varTheme) {
          this.bindMenu(col, livePath, kind);
        }
      }

      placed++;
    }

    if (placed === 0) {
      panel.remove();
    } else {
      panel.closed = true;
    }
  }

  /** Adds the "+" menu that creates a new property in `obj`. */
  private addPropMenu(
    panel: PanelContents<CTX>,
    catkey: CatKey,
    obj: ThemeRecord,
    container: Container<CTX>,
    path: string[]
  ): void {
    const row = panel.row();
    const textbox = row.textbox(undefined, "");

    const add = (value: ThemeItem) => {
      const propkey = (textbox.text || "").trim();

      if (!propkey) {
        console.error("Cannot have empty theme property name");
        return;
      }

      obj[propkey] = value;

      this.rebuildFolder(panel, catkey, obj, container, path);
      this.notify(catkey.key, propkey, obj);
    };

    row.menu("+", [
      { name: "Float", callback: () => add(0.0) },
      { name: "Color", callback: () => add("grey") },
      { name: "Subfolder", callback: () => add({ test: 0 }) },
      { name: "Font", callback: () => add(new CSSFont()) },
      { name: "String", callback: () => add("") },
    ]);
  }

  /** Rebuilds `panel` in place, preserving which of its sub-panels are open. */
  private rebuildFolder(
    panel: PanelContents<CTX>,
    catkey: CatKey,
    obj: ThemeRecord,
    container: Container<CTX>,
    path: string[]
  ): void {
    const uidata = saveUIData(panel, "theme-panel");

    panel.clear();
    this.doFolder(catkey, obj, container, panel, path);

    loadUIData(panel, uidata);
    panel.flushUpdate();
    panel.flushSetCSS();
  }

  /** Repaints the screen against the edited theme and reports the change. */
  private notify(category: string, key: string, record?: ThemeRecord, varKey?: string): void {
    flagThemeUpdate();

    this.dispatchEvent(new ThemeChangeEvent(category, key, record, varKey));

    // Backwards-compat shim for the deprecated on_change callback, whose declared
    // type on UIBase takes a single argument.
    const on_change = this.on_change as
      | ((category: string, key: string, record?: ThemeRecord) => void)
      | null;

    if (on_change) {
      on_change(category, key, record);
    }

    if (this.ctx) {
      this.ctx.screen.completeSetCSS();
      this.ctx.screen.completeUpdate();
    }
  }

  /**
   * Hands the editor the untransformed theme the live one was instanced from,
   * plus its variables. Both are deep-copied, so editing here never reaches the
   * caller's module state. Without this the widget edits the live theme only.
   * Passing the theme's own source brings each variable's comment across.
   */
  setVarTheme(
    varTheme: ThemeRecordWithVar<string>,
    vars: ThemeVarsDef,
    existingThemeFile?: string
  ): void {
    this._varTheme = copyVarItem(varTheme) as ThemeRecordWithVar<string>;

    this._vars = {};
    for (const key of Object.keys(vars)) {
      this._vars[key] = copyThemeItem(vars[key]);
    }

    this._varComments = existingThemeFile ? parseVarComments(existingThemeFile) : {};

    this.rebuildBindings();

    if (this._init_done) {
      this.build();
    }
  }

  /** The editor's own copy of the authored theme, or undefined in plain mode. */
  getVarTheme(): ThemeRecordWithVar<string> | undefined {
    return this._varTheme ? (copyVarItem(this._varTheme) as ThemeRecordWithVar<string>) : undefined;
  }

  /** The editor's own copy of the variable values. */
  getThemeVars(): ThemeVarsDef {
    const ret: ThemeVarsDef = {};

    for (const key of Object.keys(this._vars)) {
      ret[key] = copyThemeItem(this._vars[key]);
    }

    return ret;
  }

  /**
   * Writes the edited theme back out as TypeScript source. The editor owns the
   * authored record, so an edit at a bound slot is written as the variable it
   * came from rather than dropped. Comments typed in the Variables panel win
   * over the ones read out of `existingThemeFile`.
   */
  createFile({
    existingThemeFile,
    importPath,
    onAssemble,
  }: {
    existingThemeFile?: string;
    importPath?: string;
    onAssemble?: (header: string, vars: string, theme: string, footer: string) => string;
  } = {}): string {
    const varTheme = this.getVarTheme();

    if (!varTheme) {
      throw new Error("the theme editor has no authored theme to write");
    }

    return createThemeFile({
      theme      : varTheme,
      vars       : this.getThemeVars(),
      varComments: {
        ...(existingThemeFile ? parseVarComments(existingThemeFile) : {}),
        ...this._varComments,
      },
      importPath,
      onAssemble,
    });
  }

  /** Re-reads which live slots are bound to which variable, and where each was authored. */
  private rebuildBindings(): void {
    this._bindings = new Map();
    this._authored = new Map();

    if (!this._varTheme) {
      return;
    }

    const walk = (rec: ThemeRecordWithVar<string>, path: ThemePath) => {
      for (const key in rec) {
        const here = [...path, key];
        this._authored.set(pathKey(toLivePath(here)), here);

        const v = rec[key];
        if (isPlainRecord(v)) {
          walk(v, here);
        }
      }
    };

    walk(this._varTheme, []);

    for (const varKey of Object.keys(this._vars)) {
      for (const slot of varSlots(this._varTheme, varKey)) {
        const live = pathKey(slot.livePath);

        if (this._bindings.has(live)) {
          console.warn(
            `theme slot ${live} is bound twice, to "${this._bindings.get(live)}" and "${varKey}"`
          );
          continue;
        }

        this._bindings.set(live, varKey);
      }
    }
  }

  /**
   * Where a live slot is written in the authored theme. A slot the theme file
   * never mentioned is authored at its live path, so nothing else of the
   * library's defaults is exported alongside it.
   */
  private varPathFor(livePath: string[]): ThemePath {
    return this._authored.get(pathKey(livePath)) ?? [...livePath];
  }

  /**
   * Points the live slot at `livePath` at `varKey` and takes the variable's
   * value. Creating the authored entry seeds any sub-record it has to make from
   * the live values, because `setTheme` assigns one by reference.
   */
  bindLiveSlot(livePath: string[], varKey: string): void {
    if (!this._varTheme || !(varKey in this._vars)) {
      return;
    }

    bindSlot(this._varTheme, this.varPathFor(livePath), varKey, theme);

    const parent = findRecord(livePath.slice(0, -1));
    if (parent) {
      parent[livePath[livePath.length - 1]!] = copyThemeItem(this._vars[varKey]);
    }

    this.rebuildBindings();
    this.rebuild();
    this.notify(livePath[0]!, livePath[livePath.length - 1]!, undefined, varKey);
  }

  /** Writes the variable's current value into the authored slot and stops reading it. */
  detachLiveSlot(livePath: string[]): void {
    const varPath = this._authored.get(pathKey(livePath));

    if (!this._varTheme || !varPath) {
      return;
    }

    unbindSlot(this._varTheme, this._vars, varPath);

    this.rebuildBindings();
    this.rebuild();
    this.notify(livePath[0]!, livePath[livePath.length - 1]!);
  }

  /** Adds a variable, returning the name it was stored under. */
  addThemeVar(name: string, value: ThemeItem): string {
    const key = addVar(this._vars, name, copyThemeItem(value));

    this.rebuild();
    this.notify("themeVars", key, undefined, key);

    return key;
  }

  /**
   * Removes a variable, inlining its current value at every slot that read it.
   * Nothing on screen changes.
   */
  deleteThemeVar(key: string): void {
    if (!this._varTheme) {
      return;
    }

    deleteVar(this._varTheme, this._vars, key);
    delete this._varComments[key];

    this.rebuildBindings();
    this.rebuild();
    this.notify("themeVars", key);
  }

  /** Renames a variable, rewriting every slot that reads it. */
  renameThemeVar(from: string, to: string): string {
    if (!this._varTheme) {
      return from;
    }

    const key = renameVar(this._varTheme, this._vars, this._varComments, from, to);

    this.rebuildBindings();
    this.rebuild();
    this.notify("themeVars", key, undefined, key);

    return key;
  }

  /** The comment a variable is exported with. */
  setVarComment(key: string, comment: string): void {
    this._varComments[key] = comment;
  }

  /**
   * Makes a variable out of a slot's current value and binds the slot to it.
   * The name is taken from the slot and deduped; the Variables panel opens so
   * it can be renamed there.
   */
  varFromSlot(livePath: string[]): string | undefined {
    if (!this._varTheme) {
      return undefined;
    }

    const value = findRecord(livePath.slice(0, -1))?.[livePath[livePath.length - 1]!];
    const stem = livePath.join("_").replace(/[^a-zA-Z0-9_]/g, "_");

    let name = stem;
    for (let i = 2; name in this._vars; i++) {
      name = `${stem}_${i}`;
    }

    addVar(this._vars, name, copyThemeItem(value));
    this.bindLiveSlot(livePath, name);

    if (this._varsPanel && !this._varsPanel.isDead()) {
      this._varsPanel.closed = false;
    }

    return name;
  }

  /** The menu binding one theme slot to a variable, detaching it, or making one. */
  private bindMenu(col: ColumnFrame<CTX>, livePath: string[], kind: ItemKind): void {
    const bound = this._bindings.get(pathKey(livePath));
    const dbox = col.menu(bound !== undefined ? `= ${bound}` : "…", []);

    dbox.description =
      bound !== undefined
        ? `This value follows the theme variable "${bound}"`
        : "Read this value from a theme variable";

    dbox.template = () => this.bindTemplate(livePath, kind);
  }

  private bindTemplate(livePath: string[], kind: ItemKind): MenuTemplate {
    const entries: MenuTemplate = [];
    const bound = this._bindings.get(pathKey(livePath));

    for (const key of Object.keys(this._vars)) {
      if (key === bound || !varFits(kind, this._vars[key])) {
        continue;
      }

      entries.push({
        name    : key,
        tooltip : `Take this value from "${key}", and follow it from now on`,
        callback: () => this.bindLiveSlot(livePath, key),
      });
    }

    entries.push({
      name    : "New variable from this value",
      tooltip : "Make a variable holding this value, and read it here",
      callback: () => this.varFromSlot(livePath),
    });

    if (bound !== undefined) {
      entries.push({
        name    : "Detach",
        tooltip : `Keep the value "${bound}" has now, and stop following it`,
        callback: () => this.detachLiveSlot(livePath),
      });
    }

    return entries;
  }

  /** The panel listing every variable, above the theme's own categories. */
  private buildVarsPanel(): void {
    const panel = this.panel(
      "Variables",
      "theme-variables",
      undefined,
      "Values shared by the theme slots bound to them"
    );

    this._varsPanel = panel;

    for (const key of Object.keys(this._vars)) {
      this.varRow(panel, key);
    }

    this.addVarMenu(panel);
    panel.closed = true;
  }

  private varRow(panel: PanelContents<CTX>, key: string): void {
    const row = panel.row();

    const name = row.textbox(undefined, key);
    name.width = VAR_NAME_WIDTH;
    name.description = "The name this variable is written under in the theme file";
    name.on_change = () => {
      try {
        this.renameThemeVar(key, name.text);
      } catch (e) {
        console.error((e as Error).message);
        name.text = key;
      }
    };

    const slot: ValueSlot = {
      varKey: key,
      get   : () => this._vars[key],
      set   : (value) => this.writeVar(key, value, "themeVars", key),
    };

    const kind = themeItemKind(key, this._vars[key]);

    const valueCol = row.col();
    //a fixed width keeps the columns after it aligned across rows of mixed kinds
    valueCol.style["width"] = `${VAR_VALUE_WIDTH}px`;

    //the name textbox already says which variable this is, so the value goes unlabelled
    this.valueRow(valueCol, kind === "font" ? key : "", slot, kind);

    const uses = this._varTheme ? varSlots(this._varTheme, key).length : 0;
    row.label(uses === 1 ? "1 slot" : `${uses} slots`);

    const comment = row.textbox(undefined, this._varComments[key] ?? "");
    comment.width = VAR_COMMENT_WIDTH;
    comment.description = "A note written above this variable in the exported theme file";
    comment.on_change = () => this.setVarComment(key, comment.text);

    const del = row.menu("×", [
      {
        name    : "Delete",
        tooltip : `Write the value "${key}" has now into all ${uses} slots, and remove it`,
        callback: () => this.deleteThemeVar(key),
      },
    ]);
    del.description = `Remove "${key}"`;
  }

  /** Adds the "+" menu that creates a variable under the name typed beside it. */
  private addVarMenu(panel: PanelContents<CTX>): void {
    const row = panel.row();

    const textbox = row.textbox(undefined, "");
    textbox.width = VAR_NAME_WIDTH;
    textbox.description = "A name for the variable the menu beside this adds";

    const add = (value: ThemeItem) => {
      try {
        this.addThemeVar(textbox.text || "", value);
      } catch (e) {
        console.error((e as Error).message);
      }
    };

    const menu = row.menu("+", [
      { name: "Float", tooltip: "Add a number variable", callback: () => add(0.0) },
      { name: "Color", tooltip: "Add a colour variable", callback: () => add("grey") },
      { name: "String", tooltip: "Add a text variable", callback: () => add("") },
      { name: "Boolean", tooltip: "Add an on-or-off variable", callback: () => add(false) },
      { name: "Font", tooltip: "Add a font variable", callback: () => add(new CSSFont()) },
    ]);

    menu.description = "Add a variable of the kind chosen here";
  }

  /** Rebuilds every row, once the widget is built at all. */
  private rebuild(): void {
    if (this._init_done) {
      this.build();
    }
  }

  /**
   * The slot editing the live theme value at `livePath`. A bound slot writes its
   * variable instead, so every other slot on that variable follows. `category`
   * and `key` name the change the write reports.
   */
  protected slotFor(livePath: string[], category: string, key: string): ValueSlot {
    const parent = livePath.slice(0, -1);
    const leaf = livePath[livePath.length - 1]!;
    const varKey = this._bindings.get(pathKey(livePath));

    if (varKey !== undefined) {
      return {
        varKey,
        get: () => resolveRecord(parent)[leaf],
        set: (value) => this.writeVar(varKey, value, category, key),
      };
    }

    return {
      get: () => resolveRecord(parent)[leaf],
      set: (value) => {
        resolveRecord(parent)[leaf] = value;
        this.notify(category, key);
      },
    };
  }

  /**
   * Writes a variable and fans its value out to every slot reading it, one
   * independent copy each. Sharing a `CSSFont` between slots would work until a
   * detach, after which edits would bleed between them.
   */
  private writeVar(varKey: string, value: ThemeItem, category: string, key: string): void {
    if (!this._varTheme || !(varKey in this._vars)) {
      return;
    }

    this._vars[varKey] = copyThemeItem(value);

    for (const slot of varSlots(this._varTheme, varKey)) {
      const parent = findRecord(slot.livePath.slice(0, -1));

      if (parent) {
        parent[slot.livePath[slot.livePath.length - 1]!] = copyThemeItem(this._vars[varKey]);
      }
    }

    this.refreshVarRows(varKey, this._origin);
    this.notify(category, key, undefined, varKey);
  }

  /**
   * Writes through a slot, unless a refresh is in flight. Assigning a widget's
   * value fires its own `on_change`, so a refresh that did not suppress the
   * write would send it straight back to the slot it came from.
   */
  private setSlot(slot: ValueSlot, value: ThemeItem, origin?: UIBase<CTX>): void {
    if (this._refreshing) {
      return;
    }

    const was = this._origin;
    this._origin = origin;

    try {
      slot.set(value);
    } finally {
      this._origin = was;
    }
  }

  /** Records a row's re-read, so another row writing the same value can trigger it. */
  private onRefresh(widget: UIBase<CTX>, slot: ValueSlot, refresh: () => void): void {
    this._refreshes.push({ widget, slot, refresh });
  }

  /**
   * Re-reads every row bound to `varKey`, dropping the rows a rebuild detached.
   * The row that was edited is left alone, so a refresh cannot fight a gesture
   * still in progress.
   */
  protected refreshVarRows(varKey: string, except?: UIBase<CTX>): void {
    this._refreshes = this._refreshes.filter((entry) => !entry.widget.isDead());

    const was = this._refreshing;
    this._refreshing = true;

    try {
      for (const entry of this._refreshes) {
        if (entry.slot.varKey === varKey && entry.widget !== except) {
          entry.refresh();
        }
      }
    } finally {
      this._refreshing = was;
    }
  }

  protected valueRow(
    col: ColumnFrame<CTX>,
    key: string,
    slot: ValueSlot,
    kind: ItemKind
  ): UIBase<CTX> | undefined {
    switch (kind) {
      case "color":
        return this.colorRow(col, key, slot);
      case "string":
        return this.stringRow(col, key, slot);
      case "number":
        return this.numberRow(col, key, slot);
      case "boolean":
        return this.boolRow(col, key, slot);
      case "font":
        return this.fontPanel(col, key, slot);
    }

    return undefined;
  }

  private colorRow(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    const cw = col.colorbutton(undefined);

    const read = () => {
      const css = String(slot.get() ?? "");

      try {
        // css2color's result is recycled from a cachering; setRGBA copies it.
        cw.setRGBA(css2color(css.toLowerCase().trim()));
      } catch {
        console.warn("Failed to set color " + key, css);
      }
    };

    read();
    cw.label = key;

    cw.on_change = () => this.setSlot(slot, color2css(cw.rgba), cw);
    this.onRefresh(cw, slot, read);

    return cw;
  }

  private stringRow(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    col.label(key);

    const box = col.textbox();
    box.text = String(slot.get() ?? "");

    box.on_change = () => this.setSlot(slot, box.text, box);
    this.onRefresh(box, slot, () => {
      box.text = String(slot.get() ?? "");
    });

    return box;
  }

  private numberRow(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    const slider = col.slider(undefined, key, Number(slot.get() ?? 0), 0, 256, 0.01, false);

    slider.baseUnit = slider.displayUnit = "none";

    slider.on_change = () => this.setSlot(slot, slider.value, slider);
    this.onRefresh(slider, slot, () => {
      slider.value = Number(slot.get() ?? 0);
    });

    return slider;
  }

  private boolRow(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    const check = col.check(undefined, key);

    // Assigning value fires on_change, so wire the handler after it.
    check.value = !!slot.get();

    check.on_change = () => this.setSlot(slot, !!check.value, check);
    this.onRefresh(check, slot, () => {
      check.value = !!slot.get();
    });

    return check;
  }

  /**
   * A closed sub-panel editing a {@link CSSFont}. Each field is written as a
   * whole new font, because a slot bound to a variable holds one independent
   * copy per referencing theme key and mutating this one would leave the rest
   * stale.
   */
  private fontPanel(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    const panel = col.panel(key);
    const font = () => (slot.get() as CSSFont | undefined) ?? new CSSFont();

    const edit = (origin: UIBase<CTX>, apply: (font: CSSFont) => void) => {
      const next = font().copy();
      apply(next);
      this.setSlot(slot, next, origin);
    };

    for (const field of FONT_FIELDS) {
      panel.label(field);

      const tbox = panel.textbox(undefined, font()[field]);
      tbox.width = tbox.getDefault<number>("width");

      tbox.on_change = () =>
        edit(tbox, (next) => {
          next[field] = tbox.text;
        });
      this.onRefresh(tbox, slot, () => {
        tbox.text = font()[field];
      });
    }

    const cw = panel.colorbutton(undefined);
    cw.label = "color";
    cw.setRGBA(css2color(font().color));

    cw.on_change = () =>
      edit(cw, (next) => {
        next.color = color2css(cw.rgba);
      });
    this.onRefresh(cw, slot, () => cw.setRGBA(css2color(font().color)));

    const slider = panel.slider(undefined, "size", font().size);
    slider.setAttribute("min", "1");
    slider.setAttribute("max", "100");
    slider.baseUnit = slider.displayUnit = "none";

    slider.on_change = () =>
      edit(slider, (next) => {
        next.size = slider.value;
      });
    this.onRefresh(slider, slot, () => {
      slider.value = font().size;
    });

    panel.closed = true;

    return panel as unknown as UIBase<CTX>;
  }

  build(): void {
    const uidata = saveUIData(this, "theme");

    this.clear();
    this._refreshes = [];
    this._varsPanel = undefined;

    if (this._varTheme) {
      this.buildVarsPanel();
    }

    for (const { category, keys } of groupThemeCategories(theme, this.categoryMap)) {
      const panel = keys.length > 1 ? this.panel(category) : undefined;

      for (const catkey of keys) {
        const v = theme[catkey.key];

        if (typeof v === "object" && v !== null) {
          this.doFolder(catkey, v as ThemeRecord, panel ?? this);
        }
      }

      if (panel) {
        panel.closed = true;
      }
    }

    loadUIData(this, uidata);

    for (let i = 0; i < 2; i++) {
      this.flushSetCSS();
      this.flushUpdate();
    }

    if (this.ctx) {
      /* Fix panel spacing bug. */
      window.setTimeout(() => {
        this.ctx.screen.completeSetCSS();
      }, 100);
    }
  }
}

UIBase.internalRegister(ThemeEditor);
