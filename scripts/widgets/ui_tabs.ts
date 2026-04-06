"use strict";

import * as util from "../path-controller/util/util.js";
import * as events from "../path-controller/util/events.js";
import * as ui from "../core/ui.js";
import { keymap } from "../path-controller/util/events.js";
import { IContextBase } from "../core/context_base.js";
import { UIBase, iconmanager, loadUIData, measureText, saveUIData } from "../core/ui_base";
import { CSSFont } from "../core/cssfont";
import { Number2, Vector2 } from "../util/vectormath.js";

export let tab_idgen = 1;
const debug = false;

function getpx(css: string): number {
  return parseFloat(css.trim().replace("px", ""));
}

const FAKE_TAB_ID = Symbol("fake_tab_id");

const isForwardAttr = (n: string) => n.startsWith("data-");

export class TabItemContainer<CTX extends IContextBase = IContextBase> extends ui.ColumnFrame<CTX> {
  declare name: string;

  static define() {
    return {
      ...ui.ColumnFrame.define(),
      tagname: "tab-item-container-x",
    };
  }

  declare parentTabs: TabContainer<CTX>;
  declare _tab: TabItem<CTX>;

  // forward data- custom attributes
  getAttribute(name: string): string | null {
    return isForwardAttr(name) ? this._tab.getAttribute(name) : super.getAttribute(name);
  }
  setAttribute(name: string, value: string): void {
    if (isForwardAttr(name)) {
      this._tab.setAttribute(name, value);
    } else {
      super.setAttribute(name, value);
    }
  }

  noSwitch(): this {
    this._tab.noSwitch = true as unknown as boolean; // Depending on UIBase types, noSwitch might not be officially exposed, but we carry behavior.
    return this;
  }

  get ontabclick(): ((e: PointerEvent) => void) | null {
    return this._tab.ontabclick;
  }
  set ontabclick(v: ((e: PointerEvent) => void) | null) {
    this._tab.ontabclick = v;
  }

  get ontabdragmove(): ((e: PointerEvent) => void) | null {
    return this._tab.ontabdragmove;
  }
  set ontabdragmove(v: ((e: PointerEvent) => void) | null) {
    this._tab.ontabdragmove = v;
  }

  get ontabdragstart(): ((e: PointerEvent) => void) | null {
    return this._tab.ontabdragstart;
  }
  set ontabdragstart(v: ((e: PointerEvent) => void) | null) {
    this._tab.ontabdragstart = v;
  }

  get ontabdragend(): ((e: PointerEvent) => void) | null {
    return this._tab.ontabdragend;
  }
  set ontabdragend(v: ((e: PointerEvent) => void) | null) {
    this._tab.ontabdragend = v;
  }
}
UIBase.internalRegister(TabItemContainer);

class TabDragEvent extends PointerEvent {}

type TabDragEvents = {
  tabclick: PointerEvent;
  tabdragstart: PointerEvent;
  tabdragmove: PointerEvent;
  tabdragend: PointerEvent;
};
/**
 * This is a kind of phantom buttom DOM element (elements are 100% drawn with canvas).
 **/
export class TabItem<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  name: string;
  icon: number | undefined;
  tooltip: string;
  movable: boolean;
  tbar!: TabBar<CTX>;
  noSwitch?: boolean;

  ontabclick: ((e: PointerEvent) => void) | null;
  ontabdragstart: ((e: PointerEvent) => void) | null;
  ontabdragmove: ((e: PointerEvent) => void) | null;
  ontabdragend: ((e: PointerEvent) => void) | null;

  dom: HTMLDivElement | undefined;
  extra: HTMLElement | undefined;
  extraSize: number | undefined;

  size: Vector2;
  pos: Vector2;

  abssize: Vector2;
  abspos: Vector2;

  watcher?: { timer?: number };

  get parentTabBar(): TabBar<CTX> {
    return this.parentWidget as unknown as TabBar<CTX>;
  }

  constructor() {
    super();

    this.name = "";
    this.icon = undefined;
    this.tooltip = "";
    this.movable = true;

    this.ontabclick = null;
    this.ontabdragstart = null;
    this.ontabdragmove = null;
    this.ontabdragend = null;

    this.addEventListener("tabclick", (e: Event) => {
      if (this.ontabclick) return this.ontabclick(e as PointerEvent);
    });
    this.addEventListener("tabdragstart", (e: Event) => {
      if (this.ontabdragstart) return this.ontabdragstart(e as PointerEvent);
    });
    this.addEventListener("tabdragmove", (e: Event) => {
      if (this.ontabdragmove) return this.ontabdragmove(e as PointerEvent);
    });
    this.addEventListener("tabdragend", (e: Event) => {
      if (this.ontabdragend) return this.ontabdragend(e as PointerEvent);
    });

    this.dom = undefined;
    this.extra = undefined;
    this.extraSize = undefined;

    this.size = new Vector2();
    this.pos = new Vector2();

    this.abssize = new Vector2();
    this.abspos = new Vector2();

    this.addEventListener("pointerdown", (e) => {
      this.parentTabBar.on_pointerdown(e);
    });

    // forward click event too
    this.addEventListener("click", (e) => {
      // prevent tab bar from starting a drag move of tab button itself
      e.preventDefault();
      this.parentTabBar._doclick(e);
    });

    this.addEventListener("pointermove", (e) => {
      this.parentTabBar.on_pointermove(e);
    });

    this.addEventListener("pointerup", (e) => {
      this.parentTabBar.on_pointerup(e);
    });

    this.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      switch (ke.keyCode) {
        case keymap.Enter:
        case keymap.Space:
          this.parentTabBar.setActive(this, ke);
          break;
      }
    });
  }

  addEventListener<K extends keyof (TabDragEvents & HTMLElementEventMap)>(
    type: K,
    listener: (this: HTMLElement, ev: (TabDragEvents & HTMLElementEventMap)[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    cb: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void {
    super.addEventListener(type, cb, options);
  }

  init() {
    this.tabIndex = 1;
  }

  static define() {
    return {
      tagname: "tab-item-x",
    };
  }

  sendEvent(type: string, forwardEvent?: Event): Event {
    type EventConstructor = new (type: string, eventInitDict?: object) => Event;
    let cls: EventConstructor;

    if (type === "tabdragstart" || type === "tabdragend") {
      cls = TabDragEvent as unknown as EventConstructor;
    } else if (forwardEvent && forwardEvent instanceof Event) {
      cls = forwardEvent.constructor as EventConstructor;
    } else {
      cls = PointerEvent as unknown as EventConstructor;
    }

    const e2: Record<string, unknown> = {};

    if (forwardEvent) {
      for (const k in forwardEvent) {
        if (k === "defaultPrevented" || k === "cancelBubble") {
          continue;
        }

        e2[k] = (forwardEvent as unknown as Record<string, unknown>)[k];
      }
    }

    e2.target = this;

    const eventObj = new cls(type, e2);

    this.dispatchEvent(eventObj);
    return eventObj;
  }

  getClientRects() {
    const r = this.tbar.getClientRects()[0];

    const s = this.abssize;
    const p = this.abspos;

    s.load(this.size);
    p.load(this.pos);

    if (r) {
      p[0] += r.x;
      p[1] += r.y;
    }

    return [
      {
        x     : p[0],
        y     : p[1],
        width : s[0],
        height: s[1],
        left  : p[0],
        top   : p[1],
        right : p[0] + s[0],
        bottom: p[1] + s[1],
      },
    ] as unknown as DOMRectList;
  }

  setCSS() {
    const dpi = UIBase.getDPI();
    const x = this.pos[0] / dpi;
    const y = this.pos[1] / dpi;
    const w = this.size[0] / dpi;
    const h = this.size[1] / dpi;

    if (this == this.parentTabBar.tabs.active) {
      this.saneStyle["focus-border-width"] = "0px";
    } else {
      this.saneStyle["focus-border-width"] = "2px";
    }

    this.saneStyle["background-color"] = "transparent";

    this.saneStyle["margin"] = this.style["padding"] = "0px";
    this.saneStyle["position"] = "absolute";
    this.saneStyle["pointer-events"] = "auto";

    this.saneStyle["left"] = x + "px";
    this.saneStyle["top"] = y + "px";
    this.saneStyle["width"] = w + "px";
    this.saneStyle["height"] = h + "px";
  }
}

UIBase.internalRegister(TabItem);

export class ModalTabMove<CTX extends IContextBase = IContextBase> extends events.EventHandler {
  dom: HTMLElement | UIBase<CTX>;
  tab: TabItem<CTX>;
  tbar: TabBar<CTX>;
  first: boolean;

  droptarget: Element | undefined | null;
  start_mpos: Vector2;
  mpos: [number, number] | undefined;

  dragtab: TabItem<CTX> | undefined;
  dragstate: boolean;
  finished: boolean;
  dragevent?: DragEvent;
  dragimg?: ImageData;
  dragcanvas?: HTMLCanvasElement & { visibleToPick?: boolean };
  drag_g?: CanvasRenderingContext2D | null;

  constructor(tab: TabItem<CTX>, tbar: TabBar<CTX>, dom: HTMLElement | UIBase<CTX>) {
    super();

    this.dom = dom;
    this.tab = tab;
    this.tbar = tbar;
    this.first = true;

    this.droptarget = undefined;
    this.start_mpos = new Vector2();
    this.mpos = undefined;

    this.dragtab = undefined;
    this.dragstate = false;
    this.finished = false;
  }

  finish() {
    if (debug) if (debug) console.log("finish");

    if (this.finished) {
      return;
    }

    this.finished = true;

    if (this.tbar.tool === this) {
      this.tbar.tool = undefined;
    }

    this.popModal();
    this.tbar.update(true);
  }

  popModal() {
    if (this.dragcanvas !== undefined) {
      this.dragcanvas.remove();
    }
    const ret = super.popModal();

    this.tab.sendEvent("tabdragend");

    return ret;
  }

  on_pointerenter(e: PointerEvent) {}

  on_pointerleave(e: PointerEvent) {}

  on_pointerstart(e: PointerEvent) {}

  on_pointerend(e: PointerEvent) {}

  on_pointerdown(e: PointerEvent) {
    this.finish();
  }

  on_pointercancel(e: PointerEvent) {
    this.finish();
  }

  on_pointerup(e: PointerEvent) {
    this.finish();
  }

  on_pointermove(e: PointerEvent) {
    return this._on_move(e, e.x, e.y);
  }

  _dragstate(e: PointerEvent, x: number, y: number) {
    this.dragcanvas!.style["left"] = x + "px";
    this.dragcanvas!.style["top"] = y + "px";

    const ctx = this.tbar.ctx;
    const screen = ctx.screen;
    const elem = screen.pickElement(x, y);

    const e2 = new DragEvent("dragenter", this.dragevent);
    if (elem !== this.droptarget) {
      let e2 = new DragEvent("dragexit", this.dragevent);
      if (this.droptarget) {
        this.droptarget.dispatchEvent(e2);
      }

      e2 = new DragEvent("dragover", this.dragevent);
      this.droptarget = elem;
      if (elem) {
        elem.dispatchEvent(e2);
      }
    }
    //console.log(elem);
  }

  _on_move(e: PointerEvent, x: number, y: number) {
    const r = this.tbar.getClientRects()[0];
    const dpi = UIBase.getDPI();

    if (r === undefined) {
      //element was removed during/before move
      this.finish();
      return;
    }

    if (this.dragstate) {
      this._dragstate(e, x, y);
      return;
    }

    x -= r.x;
    y -= r.y;

    let dx;
    let dy;

    x *= dpi;
    y *= dpi;

    if (this.first) {
      this.first = false;
      this.start_mpos[0] = x;
      this.start_mpos[1] = y;
    }
    if (this.mpos === undefined) {
      this.mpos = [0, 0];
      dx = dy = 0;
    } else {
      dx = x - this.mpos[0];
      dy = y - this.mpos[1];
    }

    if (debug) console.log(x, y, dx, dy);

    const tab = this.tab;
    const tbar = this.tbar;
    const axis = tbar.horiz ? 0 : 1;
    let distx;
    let disty;

    if (tbar.horiz) {
      tab.pos[0] += dx;
      disty = Math.abs(y - this.start_mpos[1]);
    } else {
      tab.pos[1] += dy;
      disty = Math.abs(x - this.start_mpos[0]);
    }

    const limit = 50;
    const csize = tbar.horiz ? this.tbar.canvas.width : this.tbar.canvas.height;

    let dragok = tab.pos[axis] + tab.size[axis] < -limit || tab.pos[axis] >= csize + limit;
    dragok = dragok || disty > limit * 1.5;
    dragok = dragok && (this.tbar.draggable || Boolean(this.tbar.getAttribute("draggable")));

    //console.log(dragok, disty, this.tbar.draggable);

    if (dragok) {
      this.dragstate = true;
      this.dragevent = new DragEvent("dragstart", {
        dataTransfer: new DataTransfer(),
      });

      this.dragtab = tab;
      const g = this.tbar.g;
      this.dragimg = g.getImageData(~~tab.pos[0], ~~tab.pos[1], ~~tab.size[0], ~~tab.size[1]);
      this.dragcanvas = document.createElement("canvas");
      const g2 = (this.drag_g = this.dragcanvas.getContext("2d"))!;

      this.dragcanvas.visibleToPick = false;
      this.dragcanvas.width = ~~tab.size[0];
      this.dragcanvas.height = ~~tab.size[1];
      this.dragcanvas.style["width"] = tab.size[0] / dpi + "px";
      this.dragcanvas.style["height"] = tab.size[1] / dpi + "px";
      this.dragcanvas.style["position"] = UIBase.PositionKey;
      this.dragcanvas.style["left"] = e.x + "px";
      this.dragcanvas.style["top"] = e.y + "px";
      this.dragcanvas.style["zIndex"] = "500";
      document.body.appendChild(this.dragcanvas);
      g2.putImageData(this.dragimg, 0, 0);

      this.tbar.dispatchEvent(this.dragevent);

      return;
    }

    const ti = tbar.tabs.indexOf(tab);
    const next = ti < tbar.tabs.length - 1 ? tbar.tabs[ti + 1] : undefined;
    const prev = ti > 0 ? tbar.tabs[ti - 1] : undefined;

    if (next !== undefined && next.movable && tab.pos[axis] > next.pos[axis]) {
      tbar.swapTabs(tab, next);
    } else if (prev !== undefined && prev.movable && tab.pos[axis] < prev.pos[axis] + prev.size[axis] * 0.5) {
      tbar.swapTabs(tab, prev);
    }

    tbar.update(true);

    this.mpos[0] = x;
    this.mpos[1] = y;

    const e2 = tab.sendEvent("tabdragmove", e);

    if (e2.defaultPrevented) {
      this.finish();
    }
  }

  on_keydown(e: KeyboardEvent) {
    if (debug) console.log(e.keyCode);

    switch (e.keyCode) {
      case keymap.Escape: //escape
      case keymap.Space: //space
      case keymap.Enter: //enter
      case keymap.Tab: //tab
        this.finish();
        break;
    }
  }
}

export class TabBar<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  iconsheet: number;
  movableTabs: boolean;
  tabFontScale: number;

  tabs: TabItem<CTX>[] & { active?: TabItem<CTX>; highlight?: TabItem<CTX> };

  _last_style_key?: string;
  r: number;

  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;

  _last_dpi?: number;
  _last_pos?: string;

  horiz: boolean;
  // @ts-ignore fix later
  onchange: ((tab: TabItem<CTX>, e?: Event) => void) | null;
  // @ts-ignore fix later
  onselect: ((e: { tab?: TabItem<CTX>; defaultPrevented: boolean; preventDefault: () => void }) => void) | null;

  _tool?: ModalTabMove<CTX>;
  _last_p_key?: string;
  _size_cb?: () => void;

  constructor() {
    super();

    const style = document.createElement("style");
    const canvas = document.createElement("canvas");

    this.iconsheet = 0;
    this.movableTabs = true;

    this.tabFontScale = 1.0;

    const tabsArr: any = [];
    tabsArr.active = undefined;
    tabsArr.highlight = undefined;
    this.tabs = tabsArr;

    this._last_style_key = undefined;

    canvas.style.width = "145px";
    canvas.style.height = "45px";

    this.r = this.getDefault("TabBarRadius", undefined, 8) as number;

    this.canvas = canvas;
    this.g = canvas.getContext("2d") as CanvasRenderingContext2D;

    this.canvas.style.touchAction = "none";

    style.textContent = `
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(canvas);

    this._last_dpi = undefined;
    this._last_pos = undefined;

    this.horiz = true;
    this.onchange = null;
    this.onselect = null; //onselect is like onchange, but fires even if tab hasn't changed

    this.canvas.addEventListener(
      "pointermove",
      (e: Event) => {
        this.on_pointermove(e as PointerEvent);
      },
      false
    );

    this.canvas.addEventListener("pointerdown", (e: Event) => {
      this.on_pointerdown(e as PointerEvent);
    });
  }

  _doelement(e: PointerEvent, mx: number, my: number) {
    for (const tab of this.tabs) {
      let ok: boolean;

      if (this.horiz) {
        ok = mx >= tab.pos[0] && mx <= tab.pos[0] + tab.size[0];
      } else {
        ok = my >= tab.pos[1] && my <= tab.pos[1] + tab.size[1];
      }

      if (ok && this.tabs.highlight !== tab) {
        this.tabs.highlight = tab;
        this.update(true);
      }
    }
  }

  _domouse(e: PointerEvent) {
    const r = this.canvas.getClientRects()[0];

    const ex = e.clientX || e.x;
    const ey = e.clientY || e.y;
    const rx = r.x;
    const ry = r.y;

    let mx = ex - rx;
    let my = ey - ry;

    const dpi = this.getDPI();

    mx *= dpi;
    my *= dpi;

    this._doelement(e, mx, my);

    const is_mdown = e.type === "mousedown" || e.type == "pointerdown";
    if (is_mdown && this.onselect && this._fireOnSelect().defaultPrevented) {
      e.preventDefault();
    }
  }

  _doclick(e: PointerEvent) {
    this._domouse(e);

    if (e.defaultPrevented) {
      return;
    }

    if (debug) console.log("mdown");

    if (e.button !== 0) {
      return;
    }

    const ht = this.tabs.highlight;

    const acte: any = {};
    for (const k in e) {
      if (k === "defaultPrevented" || k === "cancelBubble") {
        continue;
      }

      acte[k] = (e as any)[k];
    }

    acte.target = ht;
    acte.pointerId = e.pointerId;

    const pointerActe = new PointerEvent("tabactive", acte);

    if (ht) {
      const e2 = ht.sendEvent("tabclick", e);

      if (e2.defaultPrevented) {
        pointerActe.preventDefault();
      }
    }

    if (ht !== undefined && this.tool === undefined) {
      this.setActive(ht, pointerActe);

      if (this.movableTabs && !pointerActe.defaultPrevented) {
        this._startMove(ht, e);
      }

      e.preventDefault();
      e.stopPropagation();
    }
  }

  on_pointerdown(e: PointerEvent) {
    this._doclick(e);
  }

  on_pointermove(e: PointerEvent) {
    const r = this.canvas.getClientRects()[0];
    this._domouse(e);

    e.preventDefault();
    e.stopPropagation();
  }

  on_pointerup(e: PointerEvent) {}

  static setDefault<T extends UIBase>(element: T): T {
    const e = element as unknown as TabBar;
    e.setAttribute("bar_pos", "top");
    e.updatePos(true);
    return element;
  }

  static define() {
    return {
      tagname: "tabbar-x",
      style  : "tabs",
    };
  }

  _ensureNoModal() {
    if (this.tool) {
      this.tool.finish();
      this.tool = undefined;
    }
  }

  get tool() {
    return this._tool;
  }

  set tool(v: ModalTabMove<CTX> | undefined) {
    //console.warn("SET TOOL", v, this._id);
    this._tool = v;
  }

  _startMove(
    tab: TabItem<CTX> | undefined = this.tabs.active,
    event?: PointerEvent,
    pointerId: number | undefined = event ? event.pointerId : undefined,
    pointerElem: HTMLElement | HTMLDocument | Window | TabItem<CTX> | undefined = tab
  ) {
    if (tab && this.movableTabs) {
      const e2 = event ? tab.sendEvent("tabdragstart", event) : new Event("tabdragstart");

      if (e2.defaultPrevented) {
        return;
      }

      if (this.tool) {
        this.tool.finish();
      }

      const edom = this.getScreen()!;
      const tool = (this.tool = new ModalTabMove<CTX>(tab, this, edom));

      if (event && pointerElem && pointerId !== undefined) {
        tool.pushPointerModal(pointerElem as unknown as HTMLElement, pointerId);
      } else {
        tool.pushModal(edom, false);
      }
    }
  }

  _fireOnSelect() {
    const e = this._makeOnSelectEvt();

    if (this.onselect) {
      this.onselect(e);
    }

    return e;
  }

  _makeOnSelectEvt() {
    return {
      tab             : this.tabs.highlight,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    /*
      return new MouseEvent("mousedown", {
        target : [this.tabs.highlight],
        tab : "sdfdsf"
      });

   */
  }

  getTab(name_or_id: string): TabItem<CTX> | undefined {
    for (const tab of this.tabs) {
      if (tab.id === name_or_id || tab.name === name_or_id) return tab;
    }

    return undefined;
  }

  clear() {
    for (const t of this.tabs) {
      if (t.dom) {
        t.dom.remove();
      }

      t.remove();
    }

    const tabsArr: TabItem<CTX>[] & { active?: TabItem<CTX>; highlight?: TabItem<CTX> } = [];
    tabsArr.active = undefined;
    tabsArr.highlight = undefined;
    this.tabs = tabsArr;
    this.setCSS();
    this._redraw();
  }

  saveData() {
    const taborder = [];

    for (const tab of this.tabs) {
      taborder.push(tab.name);
    }

    const act = this.tabs.active !== undefined ? this.tabs.active.name : "null";

    return {
      taborder: taborder,
      active  : act,
    };
  }

  loadData(obj: Record<string, unknown> | any): this {
    if (!obj.taborder) {
      return this;
    }

    const tabs = this.tabs;
    let active: TabItem<CTX> | undefined = undefined;
    const ntabs: any = [];

    ntabs.active = undefined;
    ntabs.highlight = undefined;

    for (const tname of obj.taborder) {
      const tab = this.getTab(tname);

      if (tab === undefined) {
        continue;
      }

      if (tab.name === obj.active) {
        active = tab;
      }

      ntabs.push(tab);
    }

    for (const tab of tabs) {
      if (ntabs.indexOf(tab) < 0) {
        ntabs.push(tab);
      }
    }

    this.tabs = ntabs;

    try {
      if (active !== undefined) {
        this.setActive(active);
      } else if (this.tabs.length > 0) {
        this.setActive(this.tabs[0]);
      }
    } catch (error) {
      util.print_stack(error as Error);
    }

    this.update(true);

    return this;
  }

  swapTabs(a: TabItem<CTX>, b: TabItem<CTX>) {
    const tabs = this.tabs;

    const ai = tabs.indexOf(a);
    const bi = tabs.indexOf(b);

    tabs[ai] = b;
    tabs[bi] = a;

    this.update(true);
  }

  addIconTab(icon: number, id: string, tooltip: string, movable: boolean = true) {
    const tab = this.addTab("", id, tooltip, movable);
    tab.icon = icon;

    return tab;
  }

  addTab(name: string, id: string, tooltip: string = "", movable: boolean = false) {
    const tab = UIBase.createElement<TabItem<CTX>>("tab-item-x", true);

    this.shadow.appendChild(tab);
    tab.parentWidget = this as unknown as UIBase<CTX>;

    tab.name = name;
    tab.id = id;
    tab.tooltip = tooltip;
    tab.movable = movable;
    tab.tbar = this;

    this.tabs.push(tab);
    this.update(true);

    if (this.tabs.length === 1) {
      this.setActive(this.tabs[0]);
    }

    return tab;
  }

  updatePos(force_update: boolean = false) {
    const pos: string | undefined = this.getAttribute("bar_pos") ?? undefined;

    if (pos !== this._last_pos || force_update) {
      this._last_pos = pos;

      this.horiz = pos === "top" || pos === "bottom";
      if (debug) console.log("tab bar position update", this.horiz);

      if (this.horiz) {
        this.style["width"] = "100%";
        delete this.saneStyle["height"];
      } else {
        this.style["height"] = "100%";
        delete this.saneStyle["width"];
      }

      this._redraw();
    }
  }

  updateDPI(force_update: boolean = false) {
    const dpi = this.getDPI();

    if (dpi !== this._last_dpi) {
      if (debug) console.log("DPI update!");
      this._last_dpi = dpi;

      this.updateCanvas(true);
    }
  }

  updateCanvas(force_update: boolean = false) {
    const canvas = this.canvas;

    const dpi = this.getDPI();

    const rwidth = getpx(this.canvas.style["width"]);
    const rheight = getpx(this.canvas.style["height"]);

    const width = ~~(rwidth * dpi);
    const height = ~~(rheight * dpi);

    let update = force_update;
    update = update || canvas.width !== width || canvas.height !== height;

    if (update) {
      canvas.width = width;
      canvas.height = height;

      this._redraw();
    }
  }

  _getFont(tsize?: number) {
    let font = this.getDefault<CSSFont>("TabText");

    if (this.tabFontScale !== 1.0) {
      font = font.copy();
      font.size *= this.tabFontScale;
    }

    return font;
  }

  _layout() {
    if ((!this.ctx || !this.ctx.screen) && !this.isDead()) {
      this.doOnce(this._layout);
    }

    const g = this.g;

    if (debug) console.log("tab layout");

    const dpi = this.getDPI();

    const font = this._getFont();
    const tsize = font.size * dpi;

    g.font = font.genCSS(tsize);

    const axis = this.horiz ? 0 : 1;

    const pad = 4 * dpi + Math.ceil(tsize * 0.25);
    const hpad = this.getDefault("TabPadding", undefined, 0.0) as number;

    let x = pad;
    const y = 0.0;

    let h = tsize + Math.ceil(tsize * 0.5) + hpad;
    const iconsize = iconmanager.getTileSize(this.iconsheet);
    let have_icons = false;

    for (const tab of this.tabs) {
      if (tab.icon !== undefined) {
        have_icons = true;
        h = Math.max(h, iconsize + 4);
        break;
      }
    }

    const r1 = this.parentWidget ? this.parentWidget.getClientRects()[0] : undefined;
    const r2 = this.canvas.getClientRects()[0];

    let rx = 0;
    let ry = 0;
    if (r2) {
      rx = r2.x; //r2.x - r1.x;
      ry = r2.y; //r2.y - r1.y;
    }

    let ti = -1;

    const makeTabWatcher = (tab: TabItem<CTX>) => {
      if (tab.watcher) {
        clearInterval(tab.watcher.timer);
      }

      const watcher = () => {
        let dead = !this.tabs.includes(tab);
        dead = dead || this.isDead();

        if (dead) {
          if (tab.dom) tab.dom.remove();
          tab.dom = undefined;

          if (tab.watcher?.timer !== undefined) clearInterval(tab.watcher!.timer);
        }
      };

      tab.watcher = { timer: window.setInterval(watcher, 750) };
      return tab.watcher.timer;
    };

    let haveTabDom = false;
    for (const tab of this.tabs) {
      if (tab.extra) {
        haveTabDom = true;
      }
    }

    if (haveTabDom && this.ctx && this.ctx.screen && !this._size_cb) {
      this._size_cb = () => {
        if (this.isDead()) {
          this.ctx.screen.removeEventListener("resize", this._size_cb);
          this._size_cb = undefined;
          return;
        }
        if (!this.ctx) return;

        this._layout();
        this._redraw();
      };

      this.ctx.screen.addEventListener("resize", this._size_cb);
    }

    for (const tab of this.tabs) {
      ti++;

      if (tab.extra && !tab.dom) {
        tab.dom = document.createElement("div");
        tab.dom.style["margin"] = tab.dom.style["padding"] = "0px";

        //XXX breaks mobile
        //let z = this.calcZ();
        //tab.dom.style["z-index"] = z - 1 - ti;

        document.body.appendChild(tab.dom);
        tab.dom.style["position"] = UIBase.PositionKey;
        tab.dom.style["display"] = "flex";
        tab.dom.style["flexDirection"] = this.horiz ? "row" : "column";

        tab.dom.style["pointerEvents"] = "none";

        if (!this.horiz) {
          tab.dom.style["width"] = tab.size[0] / dpi + "px";
          tab.dom.style["height"] = tab.size[1] / dpi + "px";
          tab.dom.style["left"] = rx + tab.pos[0] / dpi + "px";
          tab.dom.style["top"] = ry + tab.pos[1] / dpi + "px";
        } else {
          tab.dom.style["width"] = tab.size[0] / dpi + "px";
          tab.dom.style["height"] = tab.size[1] / dpi + "px";
          tab.dom.style["left"] = rx + tab.pos[0] / dpi + "px";
          tab.dom.style["top"] = ry + tab.pos[1] / dpi + "px";
        }

        const font = this._getFont();
        tab.dom.style["font"] = font.genCSS();
        tab.dom.style["color"] = font.color;

        tab.dom.appendChild(tab.extra);

        //tab.dom.style["background-color"] = "red";

        makeTabWatcher(tab);
      }

      let w = g.measureText(tab.name).width;

      if (tab.extra) {
        w += tab.extraSize || tab.extra.getClientRects()[0].width;
      }

      if (tab.icon !== undefined) {
        w += iconsize;
      }

      //don't interfere with tab dragging
      const bad = this.tool !== undefined && tab === this.tabs.active;

      if (!bad) {
        tab.pos[axis] = x;
        tab.pos[(axis ^ 1) as Number2] = y;
      }

      //tab.size = [0, 0];
      tab.size[axis] = w + pad * 2;
      tab.size[(axis ^ 1) as Number2] = h;

      x += w + pad * 2;
    }

    x = ~~(x + pad) / dpi;
    h = ~~h / dpi;

    if (this.horiz) {
      this.canvas.style["width"] = x + "px";
      this.canvas.style["height"] = h + "px";
    } else {
      this.canvas.style["height"] = x + "px";
      this.canvas.style["width"] = h + "px";
    }

    for (const tab of this.tabs) {
      tab.setCSS();
    }

    //this.canvas.width = x;
  }

  /** tab is a TabItem instance */
  setActive(tab: TabItem<CTX>, event?: Event) {
    if (tab.noSwitch) {
      return;
    }

    const update = tab !== this.tabs.active;
    this.tabs.active = tab;

    if (update) {
      if (!util.isMobile() && this.getDefault("focus-on-tab-click")) {
        tab.focus({ preventScroll: true, focusVisible: false });
      }

      if (this.onchange) this.onchange(tab, event);

      this.update(true);
    }
  }

  _redraw() {
    const g = this.g;

    const activecolor = this.getDefault("TabActive") || "rgba(0,0,0,0)";

    if (debug) console.log("tab draw");

    g.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const dpi = this.getDPI();
    const font = this._getFont();

    let tsize = font.size;
    const iconsize = iconmanager.getTileSize(this.iconsheet);

    tsize = tsize * dpi;
    g.font = font.genCSS(tsize);

    g.lineWidth = 2;
    g.strokeStyle = this.getDefault("TabStrokeStyle1");

    const r = this.r * dpi;
    this._layout();
    let tab: TabItem<CTX> | undefined;

    const draw_text = (name: string, x2: number, y2: number) => {
      const hpad = this.getDefault("TabPadding", undefined, 0.0) as number;
      if (this.horiz) {
        y2 += hpad * 0.5;
      } else {
        y2 -= hpad * 0.5;
      }

      g.fillText(tab!.name, x2, y2);
    };

    let ti = -1;
    for (tab of this.tabs) {
      ti++;

      if (tab === this.tabs.active) continue;

      const x = tab.pos[0];
      const y = tab.pos[1];
      const w = tab.size[0];
      const h = tab.size[1];
      //let tw = g.measureText(tab.name).width;
      // XXX fix me after fixing onchange
      const tw = measureText<CTX>(this as unknown as UIBase<CTX>, tab.name, this.canvas, g, tsize, font).width;

      let x2 = x + (tab.size[(Number(this.horiz) ^ 1) as Number2] - tw) * 0.5;
      const y2 = y + tsize;

      if (tab === this.tabs.highlight) {
        const p = 2;

        g.beginPath();
        g.rect(x + p, y + p, w - p * 2, h - p * 2);
        g.fillStyle = this.getDefault("TabHighlight");
        g.fill();
      }

      g.fillStyle = this.getDefault<CSSFont>("TabText").color;

      if (!this.horiz) {
        const x3 = 0;
        const y3 = y2;

        g.save();
        g.translate(x3, y3);
        g.rotate(Math.PI / 2);
        g.translate(x3 - tsize, -y3 - tsize * 0.5);
      }

      if (tab.icon !== undefined) {
        iconmanager.canvasDraw(this as unknown as UIBase, this.canvas, g, tab.icon, x, y, this.iconsheet);
        x2 += iconsize + 4;
      }

      draw_text(tab.name, x2, y2);

      if (!this.horiz) {
        g.restore();
      }

      const prev = this.tabs[Math.max(ti - 1 + this.tabs.length, 0)];
      const next = this.tabs[Math.min(ti + 1, this.tabs.length - 1)];

      if (tab !== this.tabs[this.tabs.length - 1] && prev !== this.tabs.active && next !== this.tabs.active) {
        g.beginPath();
        if (this.horiz) {
          g.moveTo(x + w, h - 5);
          g.lineTo(x + w, 5);
        } else {
          g.moveTo(w - 5, y + h);
          g.lineTo(5, y + h);
        }
        g.strokeStyle = this.getDefault("TabStrokeStyle1");
        g.stroke();
      }
    }

    const th = tsize;

    //draw active tab
    tab = this.tabs.active;
    if (tab) {
      const x = tab.pos[0];
      const y = tab.pos[1];
      let w = tab.size[0];
      let h = tab.size[1];
      //let tw = g.measureText(tab.name).width;
      const tw = measureText(this as unknown as UIBase, tab.name, this.canvas, g, tsize, font).width;

      if (this.horiz) {
        h += 2;
      } else {
        w += 2;
      }

      const x2 = x + (tab.size[(Number(this.horiz) ^ 1) as Number2] - tw) * 0.5;
      const y2 = y + tsize;

      if (tab === this.tabs.active) {
        /*
        let x = !this.horiz ? tab.y : tab.x;
        let y = !this.horiz ? tab.x : tab.y;
        let w = !this.horiz ? tab.size[1] : tab.size[0];
        let h = !this.horiz ? tab.size[0] : tab.size[1];

        if (!this.horiz) {
          //g.save();
          //g.translate(0, y);
          //g.rotate(Math.PI/16);
          //g.translate(0, -y);
        }//*/

        g.beginPath();
        //g.lineWidth *= 5;
        const ypad = 2;

        g.strokeStyle = this.getDefault("TabStrokeStyle2");
        g.fillStyle = activecolor;
        const r2 = r * 1.5;

        if (this.horiz) {
          g.moveTo(x - r, h);
          g.quadraticCurveTo(x, h, x, h - r);
          g.lineTo(x, r2);
          g.quadraticCurveTo(x, ypad, x + r2, ypad);
          g.lineTo(x + w - r2, ypad);
          g.quadraticCurveTo(x + w, 0, x + w, r2);
          g.lineTo(x + w, h - r2);
          g.quadraticCurveTo(x + w, h, x + w + r, h);

          g.stroke();
          //
          g.closePath();
        } else {
          g.moveTo(w, y - r);
          g.quadraticCurveTo(w, y, w - r, y);
          ///*
          g.lineTo(r2, y);
          g.quadraticCurveTo(ypad, y, ypad, y + r2);
          g.lineTo(ypad, y + h - r2);
          g.quadraticCurveTo(0, y + h, r2, y + h);
          g.lineTo(w - r2, y + h);
          g.quadraticCurveTo(w, y + h, w, y + h + r);
          //*/
          g.stroke();
          //
          g.closePath();
        }

        const cw = this.horiz ? this.canvas.width : this.canvas.height;

        const worig = g.lineWidth;

        g.lineWidth *= 0.5;

        g.fill();
        //g.stroke();

        g.lineWidth = worig;

        if (!this.horiz) {
          const x3 = 0;
          const y3 = y2;

          g.save();
          g.translate(x3, y3);
          g.rotate(Math.PI / 2);
          g.translate(-x3 - tsize, -y3 - tsize * 0.5);
        }

        g.fillStyle = this.getDefault<CSSFont>("TabText").color;

        draw_text(tab.name, x2, y2);

        if (!this.horiz) {
          g.restore();
        }
      }
    }
  }

  removeTab(tab: TabItem<CTX>) {
    this.tabs.remove(tab);
    if (tab === this.tabs.active) {
      this.tabs.active = this.tabs[0];
    }

    this._layout();
    this._redraw();
    this.setCSS();
  }

  setCSS() {
    super.setCSS(false);

    /* create a no stacking context */
    this.style.contain = "layout";

    this.r = this.getDefault("TabBarRadius", undefined, 8) as number;

    const r = this.r !== undefined ? this.r : 3;

    this.style.touchAction = "none";

    this.canvas.style.backgroundColor = this.getDefault("TabInactive");
    this.canvas.style.borderRadius = r + "px";
  }

  updateStyle() {
    let key = "" + this.getDefault("background-color");
    key += this.getDefault("TabActive");
    key += this.getDefault("TabInactive");
    key += this.getDefault("TabBarRadius");
    key += this.getDefault("TabStrokeStyle1");
    key += this.getDefault("TabStrokeStyle2");
    key += this.getDefault("TabHighlight");
    key += JSON.stringify(this.getDefault("TabText"));
    key += this.tabFontScale;

    if (key !== this._last_style_key) {
      this._last_style_key = key;

      this._layout();
      this.setCSS();
      this._redraw();
    }
  }

  update(force_update: boolean = false) {
    const rect = this.getClientRects()[0];
    if (rect) {
      const key = Math.floor(rect.x * 4.0) + ":" + Math.floor(rect.y * 4.0);
      if (key !== this._last_p_key) {
        this._last_p_key = key;

        //console.log("tab bar autobuild");
        this._layout();
      }
    }
    super.update();

    this.updateStyle();
    this.updatePos(force_update);
    this.updateDPI(force_update);
    this.updateCanvas(force_update);
  }
}

UIBase.internalRegister(TabBar as any);

export class TabContainer<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  _style?: HTMLStyleElement;
  tbar: TabBar<CTX>;
  tabs: Record<string, TabItemContainer<CTX>>;
  tabFontScale: number;
  dataPrefix: "";
  inherit_packflag = 0;

  _last_style_key: string;
  _last_horiz?: boolean;
  _last_bar_pos?: string | null;
  _tab?: TabItemContainer<CTX>;

  // @ts-ignore TODO: fix this later
  onchange?: (tab: TabItem<CTX>, event?: Event) => void;
  // @ts-ignore TODO: fix this later
  onselect?: (e: any) => void;
  horiz: boolean = false;
  constructor() {
    super();

    this._last_style_key = "";

    this.dataPrefix = "";

    this.inherit_packflag = 0;
    this.packflag = 0;

    this.tabFontScale = 1.0;

    this.tbar = UIBase.createElement("tabbar-x") as unknown as TabBar<CTX>;
    this.tbar.parentWidget = this as unknown as UIBase<CTX>;
    this.tbar.setAttribute("class", "_tbar_" + this._id);
    this.tbar.constructor.setDefault(this.tbar as unknown as UIBase<CTX>);
    this.tbar.tabFontScale = this.tabFontScale;

    this._remakeStyle();

    this.tabs = {};

    this._last_horiz = undefined;
    this._last_bar_pos = undefined;
    this._tab = undefined;

    const div = document.createElement("div");
    div.setAttribute("class", `_tab_${this._id}`);
    div.appendChild(this.tbar);
    this.shadow.appendChild(div);

    this.tbar.parentWidget = this as unknown as UIBase<CTX>;

    this.tbar.onselect = (e) => {
      if (this.onselect) {
        this.onselect(e);
      }
    };

    this.tbar.onchange = (tab, event) => {
      if (this._tab) {
        HTMLElement.prototype.remove.call(this._tab);
      }

      this._tab = this.tabs[tab.id];
      //this._tab = document.createElement("div");
      //this._tab.innerText = "SDfdsfsdyay";

      this._tab.parentWidget = this as unknown as UIBase<CTX>;

      //ensure we get full update convergence when switching
      //tabs
      for (let i = 0; i < 2; i++) {
        this._tab.flushUpdate();
      }

      const div = document.createElement("div");

      this.tbar.setCSSOnce(() => (div.style["backgroundColor"] = this.getDefault("background-color")), div);

      div.setAttribute("class", `_tab_${this._id}`);
      div.appendChild(this._tab);

      this.shadow.appendChild(div);

      if (this.onchange) {
        this.onchange(tab, event);
      }
    };
  }

  get movableTabs(): boolean {
    let attr;

    if (!this.hasAttribute("movable-tabs")) {
      attr = this.getDefault("movable-tabs");

      if (attr === undefined || attr === null) {
        attr = "true";
      }

      if (typeof attr === "boolean" || typeof attr === "number") {
        attr = attr ? "true" : "false";
      }
    } else {
      attr = "" + this.getAttribute("movable-tabs");
    }

    attr = attr.toLowerCase();

    return attr === "true";
  }

  set movableTabs(val: boolean | string) {
    val = !!val;

    this.setAttribute("movable-tabs", val ? "true" : "false");
    this.tbar.movableTabs = this.movableTabs;
  }

  get hideScrollBars(): boolean {
    const attr = ("" + this.getAttribute("hide-scrollbars")).toLowerCase();
    return attr === "true" || attr === "yes";
  }

  set hideScrollBars(val: boolean | string) {
    val = !!val;

    this.setAttribute("hide-scrollbars", "" + val);
  }

  static setDefault<T extends UIBase<any>>(e: T): T {
    e.setAttribute("bar_pos", "top");

    return e;
  }

  static define() {
    return {
      tagname: "tabcontainer-x",
      style  : "tabs",
    };
  }

  _startMove(tab: TabItem<CTX> | undefined = this.tbar.tabs.active, event?: PointerEvent) {
    return this.tbar._startMove(tab, event);
  }

  _ensureNoModal() {
    return this.tbar._ensureNoModal();
  }

  saveData(): Record<string, any> {
    const json = (super.saveData() ?? {}) as any;
    json.tabs = {};

    for (const k in this.tabs) {
      const tab = this.tabs[k];

      if (k === this.tbar?.tabs?.active?.id) {
        //no need to save active tab here
        continue;
      }

      try {
        json.tabs[tab.id] = JSON.parse(saveUIData(tab, "tab"));
      } catch (error) {
        console.error("Failed to save tab UI layout", tab.id);
      }
    }

    return json;
  }

  loadData(json: any): this {
    if (!json.tabs) {
      return this;
    }

    for (const k in json.tabs) {
      if (!(k in this.tabs)) {
        continue;
      }

      const uidata = JSON.stringify(json.tabs[k]);
      loadUIData(this.tabs[k], uidata);
    }
    return this;
  }

  enableDrag() {
    this.tbar.draggable = this.draggable = true;
    this.tbar.addEventListener("dragstart", (e) => {
      this.dispatchEvent(new DragEvent("dragstart", e));
    });
    this.tbar.addEventListener("dragover", (e) => {
      this.dispatchEvent(new DragEvent("dragover", e));
    });
    this.tbar.addEventListener("dragexit", (e) => {
      this.dispatchEvent(new DragEvent("dragexit", e));
    });
    /*
    let doms = [this, this.tbar, this.tbar.canvas];
    for (let dom of doms) {
      dom.setAttribute("draggable", "true");
      dom.draggable = true;

      dom.addEventListener("dragstart", (e) => {
        console.log("drag start", e);
      });

      dom.addEventListener("drag", (e) => {
        console.log("drag", e);
      });
    }*/
  }

  clear() {
    this.tbar.clear();
    if (this._tab !== undefined) {
      HTMLElement.prototype.remove.call(this._tab);
      this._tab = undefined;
    }

    this.tabs = {};
  }

  init() {
    super.init();

    this.background = this.getDefault("background-color");
  }

  setCSS() {
    super.setCSS();

    this.background = this.getDefault("background-color");
    this._remakeStyle();
  }

  _remakeStyle() {
    const horiz = this.tbar.horiz;
    const display = "flex";
    const flexDir = !horiz ? "row" : "column";
    const bgcolor = this.__background; //this.getDefault("background-color");

    const style = document.createElement("style");
    style.textContent = `
      ._tab_${this._id} {
        display : ${display};
        flex-direction : ${flexDir};
        margin : 0px;
        padding : 0px;
        align-self : flex-start;
        ${!horiz ? "vertical-align : top;" : ""}
      }
      
      ._tbar_${this._id} {
        list-style-type : none;
        align-self : flex-start;
        background-color : ${bgcolor};
        flex-direction : ${flexDir};
        ${!horiz ? "vertical-align : top;" : ""}
      }
    `;

    if (this._style) this._style.remove();
    this._style = style;

    this.shadow.prepend(style);
  }

  icontab(icon: number, id: string, tooltip: string): TabItemContainer<CTX> {
    const t = this.tab("", id, tooltip);
    t._tab.icon = icon;

    return t;
  }

  removeTab(tab: TabItemContainer<CTX>) {
    const tab2 = tab._tab;
    this.tbar.removeTab(tab2);
    tab.remove();
  }

  tab(name: string, id?: string | number, tooltip?: string, movable: boolean = true): TabItemContainer<CTX> {
    if (id === undefined) {
      id = tab_idgen++;
    }

    const col = UIBase.createElement("tab-item-container-x") as TabItemContainer<CTX>;
    col.parentTabs = this;
    this.tabs[id] = col;

    col.dataPrefix = this.dataPrefix;

    col.ctx = this.ctx;
    col._tab = this.tbar.addTab(name, id as string, tooltip, movable);

    col.inherit_packflag |= this.inherit_packflag;
    col.packflag |= this.packflag;

    //let cls = this.tbar.horiz ? ui.ColumnFrame : ui.RowFrame;

    col.parentWidget = this as unknown as UIBase<CTX>;

    if (col.ctx) {
      col._init();
    }

    col.setCSS();

    if (this._tab === undefined) {
      this.setActive(col);
    }

    return col;
  }

  setActive(tab: TabItemContainer<CTX> | string) {
    if (typeof tab === "string") {
      tab = this.getTab(tab);
    }

    if (!tab) {
      return;
    }

    if (tab._tab !== this.tbar.tabs.active) {
      this.tbar.setActive(tab._tab);
    }
  }

  getTabCount() {
    return this.tbar.tabs.length;
  }

  moveTab(tab: TabItemContainer<CTX>, i: number) {
    const tab_ = tab._tab;

    const tab2 = this.tbar.tabs[i];

    if (tab_ !== tab2) {
      this.tbar.swapTabs(tab_, tab2);
    }

    this.tbar.setCSS();
    this.tbar._layout();
    this.tbar._redraw();
  }

  getTab(name_or_id: string | number): TabItemContainer<CTX> {
    if (name_or_id in this.tabs) {
      return this.tabs[name_or_id];
    }

    for (const k in this.tabs) {
      const t = this.tabs[k];

      if (t.name === name_or_id) {
        return t;
      }
    }

    throw new Error("Unknown tab " + name_or_id);
  }

  updateBarPos() {
    const barpos = this.getAttribute("bar_pos");

    if (barpos !== this._last_bar_pos) {
      this.horiz = barpos === "top" || barpos === "bottom";
      this._last_bar_pos = barpos;

      this.tbar.setAttribute("bar_pos", barpos!);
      this.tbar.update(true);
      this.update();
    }
  }

  updateHoriz() {
    const horiz = this.tbar.horiz;

    if (this._last_horiz !== horiz) {
      this._last_horiz = horiz;
      this._remakeStyle();
    }
  }

  updateStyle() {
    const key = "" + this.getDefault("background-color");

    if (key !== this._last_style_key) {
      this._last_style_key = key;
      this.setCSS();
    }
  }

  getActive(): TabItem<CTX> | undefined {
    return this.tbar.tabs.active;
  }

  update() {
    super.update();

    this.tbar.movableTabs = this.movableTabs;

    if (this._tab !== undefined) {
      this._tab.update();
    }

    this.style["display"] = "flex";
    this.style["flexDirection"] = !this.horiz ? "row" : "column";

    this.tbar.tabFontScale = this.tabFontScale;

    this.updateStyle();
    this.updateHoriz();
    this.updateBarPos();
    this.tbar.update();

    const act = this.tbar.tabs.active;

    if (act && !this.hideScrollBars) {
      const container = this.tabs[act.id];

      //propegate overflow-y to tab container as a whole

      if (container.hasAttribute("overflow-y") && this.style["overflowY"] !== container.getAttribute("overflow-y")) {
        this.style["overflowY"] = container.getAttribute("overflowY")!;
        //container.style["overflow-y"] = "unset";
      } else if (!container.hasAttribute("overflow-y")) {
        this.style["overflowY"] = this.getDefault("overflowY") ?? "unset";
      }

      if (container.hasAttribute("overflow") && this.style["overflow"] !== container.getAttribute("overflow")) {
        this.style["overflow"] = container.getAttribute("overflow")!;
        //container.style["overflow-y"] = "unset";
      } else if (!container.hasAttribute("overflow")) {
        this.style["overflow"] = this.getDefault("overflow") ?? "unset";
      }
    } else if (this.hideScrollBars) {
      this.style["overflow"] = this.style["overflowY"] = "unset";
    }
  }
}

UIBase.internalRegister(TabContainer as any);
