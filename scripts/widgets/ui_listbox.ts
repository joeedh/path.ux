import { UIBase } from "../core/ui_base";
import { Container, RowFrame } from "../core/ui";
import { IContextBase } from "../core/context_base";
import { parsepx } from "../core/ui_theme";
import { keymap } from "../path-controller/util/events";
import { DataList } from "../path-controller/controller/controller_base";
import { ToolOp, ToolFlags } from "../path-controller/toolsys/toolsys";
import { StringProperty, BoolProperty } from "../path-controller/toolsys/toolprop";

export class ListItem<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> extends RowFrame<CTX> {
  highlight: boolean = false;
  is_active: boolean = false;
  declare listId: IDTYPE;

  constructor() {
    super();

    const highlight = () => {
      this.highlight = true;
      this.setBackground();
    };

    const unhighlight = () => {
      this.highlight = false;
      this.setBackground();
    };

    this.addEventListener("pointerenter", highlight);
    this.addEventListener("pointerleave", unhighlight);

    const style = document.createElement("style");
    style.textContent = `
      .listitem {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;

    this.shadowRoot!.prepend(style);
  }

  static define() {
    return {
      tagname: "listitem-x",
      style  : "listbox",
    };
  }

  init() {
    super.init();

    this.setAttribute("class", "listitem");

    this.style.width = "100%";
    this.style.height = this.getDefault("ItemHeight") + "px";
    this.style.flexGrow = "unset";

    this.setCSS();
  }

  setBackground() {
    if (this.highlight && this.is_active) {
      this.background = this.getDefault("ListActiveHighlight");
    } else if (this.highlight) {
      this.background = this.getDefault("ListHighlight");
    } else if (this.is_active) {
      this.background = this.getDefault("ListActive");
    } else {
      this.background = this.getDefault("background-color");
    }
  }

  setCSS() {
    super.setCSS();

    this.setBackground();
  }
}

UIBase.internalRegister(ListItem);

export interface ListItems<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> extends Array<ListItem<CTX, IDTYPE>> {
  /** @deprecated Use `ListBox.active` (or `ListBox.activeId`) instead. */
  active?: ListItem<CTX, IDTYPE> | undefined;
}

/** Payload describing the newly-active list entry. */
export interface ListBoxChange<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> {
  id: IDTYPE | undefined;
  item: ListItem<CTX, IDTYPE> | undefined;
}

/** Dispatched by {@link ListBox} whenever the active entry changes. */
export class ListBoxChangeEvent<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> extends Event {
  selection: ListBoxChange<CTX, IDTYPE>;

  constructor(selection: ListBoxChange<CTX, IDTYPE>) {
    super("change");
    this.selection = selection;
  }
}

/** Which axes a {@link ListBox} may be resized along via its corner grip. */
export type ResizeAxes = "x" | "y" | "xy";

export class ListBox<
  CTX extends IContextBase = IContextBase,
  IDTYPE extends string | number = string | number,
> extends Container<CTX> {
  items: ListItems<CTX, IDTYPE>;
  idmap: Map<IDTYPE, ListItem<CTX, IDTYPE>>;

  lastListRef?: WeakRef<any>;

  private _active: ListItem<CTX, IDTYPE> | undefined = undefined;
  private _idgen = 0;

  /** Whether the corner resize grip is shown. */
  resizable = true;
  /** Minimum/maximum drag-resize bounds (px). */
  minWidth = 60;
  maxWidth = Infinity;
  minHeight = 24;
  maxHeight = Infinity;

  private _resizeAxes: ResizeAxes = "y";
  private _userSized = false;
  private _grip?: HTMLElement;

  /**
   * Optional label provider for data-path-backed lists. If unset the widget
   * uses the element's `.name` (when a string) and otherwise the key.
   */
  getItemName?: (obj: unknown, key: IDTYPE) => string;

  /**
   * When true (and the bound list exposes `setActive`), user selection is
   * written back through an undoable tool op instead of a direct call.
   * Requires `ctx.toolstack`; falls back to the direct call when absent.
   */
  useActiveUndo = false;

  // data-path binding state (manual mode leaves all of these untouched)
  private _last_datapath?: string;
  private _dataList?: DataList;
  private _listKey?: string;
  private _dataMode = false;
  private _syncingFromData = false;

  /**
   * @deprecated Listen for the `"change"` DOM event instead, e.g.
   * `listbox.addEventListener("change", e => { const {id, item} = e.selection; })`.
   *
   */
  onitemchange?: (val: IDTYPE | undefined, item: ListItem<CTX, IDTYPE> | undefined) => void;

  constructor() {
    super();

    Object.defineProperty(this, "on_change", {
      get() {
        return this.onitemchange;
      },
      set(v: any) {
        console.warn(
          'Deprecated use of ListBox.on_change, use the "change" event or .onitemchange instead.'
        );
        this.onitemchange = v;
      },
    });

    this.items = [];
    this.idmap = new Map();

    // Backwards-compat: keep `listbox.items.active` working as an alias of
    // `listbox.active` (deprecated — see ListItems.active).
    Object.defineProperty(this.items, "active", {
      get         : () => this._active,
      set         : (v: ListItem<CTX, IDTYPE> | undefined) => (this._active = v),
      enumerable  : false,
      configurable: true,
    });

    const style = document.createElement("style");
    style.textContent = `
      .listbox {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
    `;
    this.shadow.prepend(style);

    this.onkeydown = (e) => {
      switch (e.keyCode) {
        case keymap["Up"]:
        case keymap["Down"]: {
          if (this.items.length == 0) return;

          if (this._active === undefined) {
            this.setActive(this.items[0]);
            return;
          }

          let i = this.items.indexOf(this._active);
          const dir = e.keyCode == keymap["Up"] ? -1 : 1;

          i = Math.max(Math.min(i + dir, this.items.length - 1), 0);
          this.setActive(this.items[i]);

          e.preventDefault();
          e.stopPropagation();

          break;
        }
      }
    };
  }

  static define() {
    return {
      tagname: "listbox-x",
      style  : "listbox",
    };
  }

  /** The currently-active list entry, or `undefined`. */
  get active(): ListItem<CTX, IDTYPE> | undefined {
    return this._active;
  }

  /** The id of the currently-active entry, or `undefined`. */
  get activeId(): IDTYPE | undefined {
    return this._active?.listId;
  }

  /** Fluent setter for {@link getItemName} (data-path-backed mode). */
  itemNames(cb: (obj: unknown, key: IDTYPE) => string): this {
    this.getItemName = cb;
    return this;
  }

  /**
   * Axes the box may be resized along via its corner grip. Defaults to `"y"`
   * (vertical only); set to `"x"` or `"xy"` to allow horizontal resizing.
   */
  get resizeAxes(): ResizeAxes {
    return this._resizeAxes;
  }
  set resizeAxes(v: ResizeAxes) {
    this._resizeAxes = v;
    this.setAttribute("resize-axes", v);
    this._updateGrip();
  }

  private _ensureGrip(): void {
    if (this._grip) {
      this._updateGrip();
      return;
    }

    const grip = document.createElement("div");
    const s = grip.style;
    s.position = "absolute";
    s.right = "0px";
    s.bottom = "0px";
    s.width = "0px";
    s.height = "0px";
    s.borderStyle = "solid";
    s.zIndex = "5";

    grip.addEventListener("pointerdown", (e) => this._startResize(e as PointerEvent));

    this._grip = grip;
    this.shadow.appendChild(grip);

    // The host is the scroll container, so an absolutely-positioned grip would
    // drift with the content. Re-pin it to the visible corner on every scroll.
    this.addEventListener("scroll", () => this._positionGrip());

    this._updateGrip();
    this._positionGrip();
  }

  private _updateGrip(): void {
    const grip = this._grip;
    if (!grip) {
      return;
    }

    grip.style.display = this.resizable ? "block" : "none";

    const sz = 12;
    grip.style.borderWidth = `0 0 ${sz}px ${sz}px`;
    grip.style.borderColor = "transparent transparent rgba(120, 120, 120, 0.7) transparent";

    const axes = this._resizeAxes;
    grip.style.cursor = axes === "xy" ? "nwse-resize" : axes === "x" ? "ew-resize" : "ns-resize";
  }

  /**
   * Keep the grip pinned to the visible bottom-right corner of the scroll
   * viewport by undoing the current scroll offset (it lives inside the
   * scrolling host, so it would otherwise scroll out of view).
   */
  private _positionGrip(): void {
    if (!this._grip) {
      return;
    }
    this._grip.style.transform = `translate(${this.scrollLeft}px, ${this.scrollTop}px)`;
  }

  private _startResize(e: PointerEvent): void {
    if (!this.resizable) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const startX = e.x;
    const startY = e.y;
    const startW = parsepx(this.style.width) || (this.getDefault("width") as number);
    const startH = parsepx(this.style.height) || (this.getDefault("height") as number);
    const axes = this._resizeAxes;

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    this.pushModal({
      on_pointermove: (ev: PointerEvent) => {
        if (axes.includes("x")) {
          this.style.width = clamp(startW + (ev.x - startX), this.minWidth, this.maxWidth) + "px";
        }
        if (axes.includes("y")) {
          this.style.height =
            clamp(startH + (ev.y - startY), this.minHeight, this.maxHeight) + "px";
        }
        this._userSized = true;
        this._positionGrip();
      },
      on_pointerup    : () => this._endResize(),
      on_pointercancel: () => this._endResize(),
      on_keydown: (ev: KeyboardEvent) => {
        if (ev.keyCode === keymap["Escape"]) {
          if (axes.includes("x")) this.style.width = startW + "px";
          if (axes.includes("y")) this.style.height = startH + "px";
          this.popModal();
        }
      },
    });
  }

  private _endResize(): void {
    this.popModal();

    // Persist within the session so a later setCSS()/init() won't reset it.
    this.overrideDefault("width", parsepx(this.style.width));
    this.overrideDefault("height", parsepx(this.style.height));
  }

  addEventListener(
    type: "change",
    listener: (this: ListBox<CTX, IDTYPE>, ev: ListBoxChangeEvent<CTX, IDTYPE>) => void,
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
      | ((this: ListBox<CTX, IDTYPE>, ev: ListBoxChangeEvent<CTX, IDTYPE>) => void)
      | EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListenerOrEventListenerObject, options);
  }

  setCSS() {
    super.setCSS();
  }

  init() {
    super.init();

    this.setCSS();

    this.tabIndex = 1;
    this.setAttribute("tabindex", "1");

    this.minHeight = 2 * (this.getDefault("ItemHeight") as number);

    if (!this._userSized) {
      this.style.width = this.getDefault("width") + "px";
      this.style.height = this.getDefault("height") + "px";
    }
    this.style.overflow = "scroll";
    this.style.position = "relative";

    if (this.hasAttribute("resize-axes")) {
      this._resizeAxes = this.getAttribute("resize-axes") as ResizeAxes;
    }

    this._ensureGrip();
  }

  saveData(): Record<string, unknown> {
    const data: Record<string, unknown> = { ...super.saveData() };
    if (this._userSized) {
      data.width = parsepx(this.style.width);
      data.height = parsepx(this.style.height);
      data._userSized = true;
    }
    return data;
  }

  loadData(obj: Record<string, unknown>): this {
    super.loadData(obj);

    if (obj && obj._userSized) {
      this._userSized = true;
      if (typeof obj.width === "number") {
        this.style.width = obj.width + "px";
        this.overrideDefault("width", obj.width);
      }
      if (typeof obj.height === "number") {
        this.style.height = obj.height + "px";
        this.overrideDefault("height", obj.height);
      }
    }

    return this;
  }

  update() {
    super.update();

    const path = this.getAttribute("datapath") ?? undefined;
    if (path !== this._last_datapath) {
      this._last_datapath = path;
      this._dataMode = path !== undefined;
      this._dataList = undefined;
      this._listKey = undefined;
    }

    if (this._dataMode) {
      this.updateDataPath();
    }
  }

  /** Resolve the bound DataList prop + the raw list object, or undefined. */
  private _resolveList(): { list: unknown } | undefined {
    if (!this.ctx) {
      return undefined;
    }

    const path = this.getAttribute("datapath");
    if (!path) {
      return undefined;
    }

    try {
      const prop = this.getPathMeta(this.ctx, path);
      if (!(prop instanceof DataList)) {
        this._dataList = undefined;
        return undefined;
      }

      this._dataList = prop;
      return { list: this.ctx.api.getValue(this.ctx, path) };
    } catch (error) {
      console.warn("ListBox: failed to resolve datapath", path, error);
      this._dataList = undefined;
      return undefined;
    }
  }

  updateDataPath() {
    const resolved = this._resolveList();
    // detect if list bound at datapath doesn't exist
    if (this.hasAttribute("datapath") && resolved?.list === undefined) {
      if (this.items.length > 0) {
        this.clear();
      }
      // Reset change-detection state so that if the list reappears (even as the
      // same object with an unchanged version) it repopulates instead of being
      // short-circuited by the ref/key check below.
      this._listKey = undefined;
      this.lastListRef = undefined;
      return;
    }

    // invalid data path
    if (resolved === undefined || this._dataList === undefined) {
      return;
    }

    const api = this.ctx.api;
    const { list } = resolved;
    const dataList = this._dataList;

    const ver = dataList.getVersion(api, list);
    const key = ver !== undefined ? "v" + ver : this._computeKeyDiff(api, list);

    // make sure list reference hasn't changed
    if (this.lastListRef?.deref() === list && key === this._listKey) {
      this._syncActiveOnly(api, list);
      return;
    }
    this.lastListRef = new WeakRef(list as WeakKey);

    // structural change: rebuild
    this.clear();
    for (const obj of dataList.getIter(api, list)) {
      const id = dataList.getKey(api, list, obj) as IDTYPE;
      this.addItem(this._labelFor(obj, id), id);
    }
    this._listKey = key;

    this._syncActiveOnly(api, list);
  }

  private _labelFor(obj: unknown, key: IDTYPE): string {
    if (this.getItemName) {
      return this.getItemName(obj, key);
    }
    const name = (obj as { name?: unknown })?.name;
    return typeof name === "string" ? name : String(key);
  }

  private _computeKeyDiff(api: typeof this.ctx.api, list: unknown): string {
    if (this._dataList === undefined) {
      return "";
    }
    const keys: Array<string | number> = [];
    for (const obj of this._dataList.getIter(api, list)) {
      keys.push(this._dataList.getKey(api, list, obj) as string | number);
    }
    return keys.length + "|" + keys.join(",");
  }

  /** Reflect the data list's active element into the widget (no write-back). */
  private _syncActiveOnly(api: typeof this.ctx.api, list: unknown) {
    const dataList = this._dataList;
    if (dataList === undefined || dataList.cb.getActive === undefined) {
      return;
    }

    const active = dataList.getActive(api, list);
    const activeKey =
      active !== undefined ? (dataList.getKey(api, list, active) as IDTYPE) : undefined;

    if (activeKey !== this.activeId) {
      this.setActiveFromData(activeKey);
    }
  }

  /** Set active from the data side, suppressing the write-back loop. */
  setActiveFromData(item: ListItem<CTX, IDTYPE> | IDTYPE | undefined) {
    this._syncingFromData = true;
    try {
      this.setActive(item);
    } finally {
      this._syncingFromData = false;
    }
  }

  private _writeActiveToData(id: IDTYPE | undefined) {
    const dataList = this._dataList;
    const path = this.getAttribute("datapath");
    if (dataList === undefined || !path || dataList.cb.setActive === undefined) {
      return;
    }

    if (this.useActiveUndo && this.ctx.toolstack) {
      const tool = ListBoxSetActiveToolOp.create(path, id);
      this.ctx.toolstack.execTool(this.ctx, tool);
      return;
    }

    // Direct, non-undoable write. (A list path's `.active` resolves read-only
    // through getActive, so it cannot route a setValue to setActive.)
    const api = this.ctx.api;
    const list = api.getValue(this.ctx, path);
    const obj = id === undefined ? undefined : dataList.get(api, list, id);
    dataList.setActive(api, list, obj);
  }

  addItem(name: string, id?: IDTYPE) {
    const item = UIBase.createElement("listitem-x") as ListItem<CTX, IDTYPE>;

    item.listId = (id === undefined ? this._idgen++ : id) as IDTYPE;
    // Keep auto-generated ids from ever colliding with explicit numeric ones.
    if (typeof item.listId === "number") {
      this._idgen = Math.max(this._idgen, (item.listId as number) + 1);
    }
    this.idmap.set(item.listId, item);

    this.add(item);
    this.items.push(item);

    item.label(name);

    item.addEventListener("click", () => this.setActive(item));

    return item;
  }

  removeItem(item: ListItem<CTX, IDTYPE> | IDTYPE) {
    if (typeof item == "number" || typeof item === "string") {
      item = this.idmap.get(item as IDTYPE) as ListItem<CTX, IDTYPE>;
    }

    if (item === undefined) {
      console.warn("ListBox.removeItem: no such item");
      return;
    }

    if (item === this._active) {
      this.setActive(undefined);
    }

    item.remove();
    this.idmap.delete(item.listId);
    (this.items as any).remove(item);
  }

  setActive(item: ListItem<CTX, IDTYPE> | IDTYPE | undefined) {
    if (typeof item == "number" || typeof item === "string") {
      item = this.idmap.get(item as IDTYPE);
    }

    if (item === this._active) {
      return;
    }

    if (this._active !== undefined) {
      this._active.is_active = false;
      this._active.setBackground();
    }

    this._active = item;

    if (item) {
      item.is_active = true;

      item.setBackground();
      item.scrollIntoView({ block: "nearest" });
    }

    this.dispatchEvent(new ListBoxChangeEvent({ id: item?.listId, item }));

    // Write user-initiated selection back to the bound data list.
    if (!this._syncingFromData && this._dataMode && this._dataList?.cb.setActive) {
      this._writeActiveToData(item?.listId);
    }

    // Backwards-compat shim for the deprecated on_change callback.
    if (this.onitemchange) {
      this.onitemchange(item?.listId, item);
    }
  }

  clear() {
    for (const item of this.items.slice()) {
      this.removeItem(item);
    }
  }
}

UIBase.internalRegister(ListBox);

type SetActiveInputs = {
  dataPath: StringProperty;
  key: StringProperty;
  numericKey: BoolProperty;
  hasKey: BoolProperty;
};

/**
 * Simple undoable "set active list element" op, used by {@link ListBox} when
 * `useActiveUndo` is enabled. Records the previously-active key for undo and
 * routes the change through the bound list's `setActive` callback.
 */
export class ListBoxSetActiveToolOp<CTX extends IContextBase = IContextBase> extends ToolOp<
  SetActiveInputs,
  {},
  CTX
> {
  _undo?: { hadActive: boolean; key: string | number | undefined };

  static tooldef() {
    return {
      uiname  : "Set Active List Item",
      toolpath: "listbox.set_active",
      icon    : -1,
      flag    : ToolFlags.PRIVATE,
      inputs: {
        dataPath  : new StringProperty(),
        key       : new StringProperty(),
        numericKey: new BoolProperty(false),
        hasKey    : new BoolProperty(false),
      },
    };
  }

  static create(path: string, id: string | number | undefined): ListBoxSetActiveToolOp {
    const tool = new ListBoxSetActiveToolOp();

    tool.inputs.dataPath.setValue(path);
    tool.inputs.hasKey.setValue(id !== undefined);

    if (id !== undefined) {
      tool.inputs.numericKey.setValue(typeof id === "number");
      tool.inputs.key.setValue(String(id));
    }

    return tool;
  }

  _resolvedKey(): string | number | undefined {
    if (!this.inputs.hasKey.getValue()) {
      return undefined;
    }
    const k = this.inputs.key.getValue() as string;
    return this.inputs.numericKey.getValue() ? Number(k) : k;
  }

  _resolve(ctx: CTX): { list: unknown; dataList: DataList } | undefined {
    const path = this.inputs.dataPath.getValue() as string;
    const rdef = ctx.api.resolvePath(ctx, path);
    if (rdef?.prop === undefined || !(rdef.prop instanceof DataList)) {
      return undefined;
    }
    return { list: ctx.api.getValue(ctx, path), dataList: rdef.prop };
  }

  _applyKey(ctx: CTX, key: string | number | undefined): void {
    const res = this._resolve(ctx);
    if (res === undefined) {
      return;
    }
    const obj = key === undefined ? undefined : res.dataList.get(ctx.api, res.list, key);
    res.dataList.setActive(ctx.api, res.list, obj);
  }

  undoPre(ctx: CTX): void {
    const res = this._resolve(ctx);
    if (res === undefined || res.dataList.cb.getActive === undefined) {
      this._undo = { hadActive: false, key: undefined };
      return;
    }
    const active = res.dataList.getActive(ctx.api, res.list);
    const key = active !== undefined ? res.dataList.getKey(ctx.api, res.list, active) : undefined;
    this._undo = { hadActive: active !== undefined, key };
  }

  undo(ctx: CTX): void {
    if (this._undo === undefined) {
      return;
    }
    this._applyKey(ctx, this._undo.hadActive ? this._undo.key : undefined);
  }

  exec(ctx: CTX): void {
    this._applyKey(ctx, this._resolvedKey());
  }
}

ToolOp.register(ListBoxSetActiveToolOp as unknown as Parameters<typeof ToolOp.register>[0]);
