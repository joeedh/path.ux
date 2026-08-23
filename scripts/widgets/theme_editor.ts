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

export class ThemeEditor<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "ThemeEditor"
> {
  categoryMap: Record<string, string | CatKey>;

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
        this.valueRow(placed % 2 === 0 ? col1 : col2, path, key, k, v, kind);
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

  private valueRow(
    col: ColumnFrame<CTX>,
    path: string[],
    category: string,
    key: string,
    value: ThemeItem,
    kind: ItemKind
  ): void {
    switch (kind) {
      case "color":
        this.colorRow(col, path, category, key, value as string);
        break;
      case "string":
        this.stringRow(col, path, category, key, value as string);
        break;
      case "number":
        this.numberRow(col, path, category, key, value as number);
        break;
      case "boolean":
        this.boolRow(col, path, category, key);
        break;
      case "font":
        this.fontPanel(col, category, key, value as CSSFont);
        break;
    }
  }

  private colorRow(
    col: ColumnFrame<CTX>,
    path: string[],
    category: string,
    key: string,
    css: string
  ): void {
    const cw = col.colorbutton(undefined);

    try {
      // css2color's result is recycled from a cachering; setRGBA copies it.
      cw.setRGBA(css2color(css.toLowerCase().trim()));
    } catch {
      console.warn("Failed to set color " + key, css);
    }

    cw.label = key;

    cw.on_change = () => {
      resolveRecord(path)[key] = color2css(cw.rgba);
      this.notify(category, key);
    };
  }

  private stringRow(
    col: ColumnFrame<CTX>,
    path: string[],
    category: string,
    key: string,
    text: string
  ): void {
    col.label(key);

    const box = col.textbox();
    box.text = text;

    box.on_change = () => {
      resolveRecord(path)[key] = box.text;
      this.notify(category, key);
    };
  }

  private numberRow(
    col: ColumnFrame<CTX>,
    path: string[],
    category: string,
    key: string,
    value: number
  ): void {
    const slider = col.slider(undefined, key, value, 0, 256, 0.01, false);

    slider.baseUnit = slider.displayUnit = "none";

    slider.on_change = () => {
      resolveRecord(path)[key] = slider.value;
      this.notify(category, key);
    };
  }

  private boolRow(col: ColumnFrame<CTX>, path: string[], category: string, key: string): void {
    const check = col.check(undefined, key);

    // Assigning value fires on_change, so wire the handler after it.
    check.value = !!resolveRecord(path)[key];

    check.on_change = () => {
      resolveRecord(path)[key] = !!check.value;
      this.notify(category, key);
    };
  }

  /** A closed sub-panel editing a {@link CSSFont} in place. */
  private fontPanel(col: ColumnFrame<CTX>, category: string, key: string, font: CSSFont): void {
    const panel = col.panel(key);

    for (const field of FONT_FIELDS) {
      panel.label(field);

      const tbox = panel.textbox(undefined, font[field]);
      tbox.width = tbox.getDefault<number>("width");

      tbox.on_change = () => {
        font[field] = tbox.text;
        this.notify(category, key);
      };
    }

    const cw = panel.colorbutton(undefined);
    cw.label = "color";
    cw.setRGBA(css2color(font.color));

    cw.on_change = () => {
      font.color = color2css(cw.rgba);
      this.notify(category, key);
    };

    const slider = panel.slider(undefined, "size", font.size);
    slider.setAttribute("min", "1");
    slider.setAttribute("max", "100");
    slider.baseUnit = slider.displayUnit = "none";

    slider.on_change = () => {
      font.size = slider.value;
      this.notify(category, key);
    };

    panel.closed = true;
  }

  build(): void {
    const uidata = saveUIData(this, "theme");

    this.clear();

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
