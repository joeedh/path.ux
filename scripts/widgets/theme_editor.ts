import { UIBase, theme, flagThemeUpdate, saveUIData, loadUIData } from "../core/ui_base";
import { Container, ColumnFrame } from "../core/ui";
import { IContextBase } from "../core/context_base";
import { validateCSSColor, color2css, css2color } from "../core/ui_theme";
import type { ThemeItem, ThemeRecord } from "../core/ui_theme";
import { CSSFont } from "../core/cssfont";
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

  constructor(category: string, key: string, record?: ThemeRecord) {
    super("change");

    this.category = category;
    this.key = key;
    this.record = record;
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

/**
 * Reading and writing one value a row edits. The same row builders serve a plain
 * theme slot, a slot bound to a theme variable, and a row of the Variables panel.
 */
export interface ValueSlot {
  get(): ThemeItem;
  set(value: ThemeItem): void;
}

/** A row's own re-read of its slot, run when something else writes the same value. */
interface RowRefresh<CTX extends IContextBase> {
  widget: UIBase<CTX>;
  refresh(): void;
}

export class ThemeEditor<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "ThemeEditor"
> {
  categoryMap: Record<string, string | CatKey>;

  private _refreshes: RowRefresh<CTX>[] = [];
  private _refreshing = false;

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
    path?: string[]
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
        this.doFolder({ ...catkey, key: k }, v as ThemeRecord, panel, undefined, [...path, k]);
      } else {
        const col = placed % 2 === 0 ? col1 : col2;
        this.valueRow(col, k, this.slotFor([...path, k], key, k), kind);
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
  private notify(category: string, key: string, record?: ThemeRecord): void {
    flagThemeUpdate();

    this.dispatchEvent(new ThemeChangeEvent(category, key, record));

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
   * The slot editing the live theme value at `livePath`. `category` and `key`
   * name the change the write reports.
   */
  protected slotFor(livePath: string[], category: string, key: string): ValueSlot {
    const parent = livePath.slice(0, -1);
    const leaf = livePath[livePath.length - 1]!;

    return {
      get: () => resolveRecord(parent)[leaf],
      set: (value) => {
        resolveRecord(parent)[leaf] = value;
        this.notify(category, key);
      },
    };
  }

  /**
   * Writes through a slot, unless a refresh is in flight. Assigning a widget's
   * value fires its own `on_change`, so a refresh that did not suppress the
   * write would send it straight back to the slot it came from.
   */
  private setSlot(slot: ValueSlot, value: ThemeItem): void {
    if (this._refreshing) {
      return;
    }

    slot.set(value);
  }

  /** Records a row's re-read, so another row writing the same value can trigger it. */
  private onRefresh(widget: UIBase<CTX>, refresh: () => void): void {
    this._refreshes.push({ widget, refresh });
  }

  /**
   * Re-reads every registered row except `except`, dropping the rows a rebuild
   * detached.
   */
  protected refreshRows(except?: UIBase<CTX>): void {
    this._refreshes = this._refreshes.filter((entry) => !entry.widget.isDead());

    const was = this._refreshing;
    this._refreshing = true;

    try {
      for (const entry of this._refreshes) {
        if (entry.widget !== except) {
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

    cw.on_change = () => this.setSlot(slot, color2css(cw.rgba));
    this.onRefresh(cw, read);

    return cw;
  }

  private stringRow(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    col.label(key);

    const box = col.textbox();
    box.text = String(slot.get() ?? "");

    box.on_change = () => this.setSlot(slot, box.text);
    this.onRefresh(box, () => {
      box.text = String(slot.get() ?? "");
    });

    return box;
  }

  private numberRow(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    const slider = col.slider(undefined, key, Number(slot.get() ?? 0), 0, 256, 0.01, false);

    slider.baseUnit = slider.displayUnit = "none";

    slider.on_change = () => this.setSlot(slot, slider.value);
    this.onRefresh(slider, () => {
      slider.value = Number(slot.get() ?? 0);
    });

    return slider;
  }

  private boolRow(col: ColumnFrame<CTX>, key: string, slot: ValueSlot): UIBase<CTX> {
    const check = col.check(undefined, key);

    // Assigning value fires on_change, so wire the handler after it.
    check.value = !!slot.get();

    check.on_change = () => this.setSlot(slot, !!check.value);
    this.onRefresh(check, () => {
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

    const edit = (apply: (font: CSSFont) => void) => {
      const next = font().copy();
      apply(next);
      this.setSlot(slot, next);
    };

    for (const field of FONT_FIELDS) {
      panel.label(field);

      const tbox = panel.textbox(undefined, font()[field]);
      tbox.width = tbox.getDefault<number>("width");

      tbox.on_change = () =>
        edit((next) => {
          next[field] = tbox.text;
        });
      this.onRefresh(tbox, () => {
        tbox.text = font()[field];
      });
    }

    const cw = panel.colorbutton(undefined);
    cw.label = "color";
    cw.setRGBA(css2color(font().color));

    cw.on_change = () =>
      edit((next) => {
        next.color = color2css(cw.rgba);
      });
    this.onRefresh(cw, () => cw.setRGBA(css2color(font().color)));

    const slider = panel.slider(undefined, "size", font().size);
    slider.setAttribute("min", "1");
    slider.setAttribute("max", "100");
    slider.baseUnit = slider.displayUnit = "none";

    slider.on_change = () =>
      edit((next) => {
        next.size = slider.value;
      });
    this.onRefresh(slider, () => {
      slider.value = font().size;
    });

    panel.closed = true;

    return panel as unknown as UIBase<CTX>;
  }

  build(): void {
    const uidata = saveUIData(this, "theme");

    this.clear();
    this._refreshes = [];

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
