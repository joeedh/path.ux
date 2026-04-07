import nstructjs from "../path-controller/util/struct.js";
import * as ui_base from "../core/ui_base.js";
import * as FrameManager_ops from "./FrameManager_ops.js";
import cconst from "../config/const.js";
import { UIBase } from "../core/ui_base.js";

import { Vector2 } from "../path-controller/util/vectormath.js";
import { createMenu, Menu } from "../widgets/ui_menu.js";
import { IContextBase } from "../core/context_base.js";
import type { ScreenArea } from "./ScreenArea.js";

export const AreaFlags = {
  HIDDEN                : 1,
  FLOATING              : 2,
  INDEPENDENT           : 4, //area is indpendent of the screen mesh
  NO_SWITCHER           : 8,
  NO_HEADER_CONTEXT_MENU: 16,
  NO_COLLAPSE           : 32,
};

export const SnapLimit = 1;

export const BORDER_ZINDEX_BASE = 25;

export function snap(c: number, snap_limit?: number): number;
export function snap(c: number[], snap_limit?: number): number[];
export function snap(c: number | number[], snap_limit = SnapLimit): number | number[] {
  if (Array.isArray(c)) {
    for (let i = 0; i < c.length; i++) {
      c[i] = Math.floor(c[i] / snap_limit) * snap_limit;
    }
  } else {
    c = Math.floor(c / snap_limit) * snap_limit;
  }

  return c;
}

export function snapi(c: number, snap_limit?: number): number;
export function snapi(c: number[], snap_limit?: number): number[];
export function snapi(c: number | number[], snap_limit = SnapLimit): number | number[] {
  //return snap(c, snap_limit);

  if (Array.isArray(c)) {
    for (let i = 0; i < c.length; i++) {
      c[i] = Math.ceil(c[i] / snap_limit) * snap_limit;
    }
  } else {
    c = Math.ceil(c / snap_limit) * snap_limit;
  }

  return c;
}

export class ScreenVert<CTX extends IContextBase = IContextBase> extends Vector2 {
  added_id: string;
  sareas: ScreenArea<CTX>[];
  borders: ScreenBorder<CTX>[];
  _id: number;

  constructor(pos: Vector2 | number[], id: number, added_id: string) {
    super(pos);

    this.added_id = added_id;
    this.sareas = [];
    this.borders = [];

    this._id = id;
  }

  static hash(pos: Vector2 | number[], added_id: string, limit?: number) {
    const x = snap(pos[0] as number, limit);
    const y = snap(pos[1] as number, limit);

    return "" + x + ":" + y + ": + added_id";
  }

  valueOf() {
    return ScreenVert.hash(this, this.added_id);
  }

  [Symbol.keystr]() {
    return ScreenVert.hash(this, this.added_id);
  }

  override loadSTRUCT(reader: (obj: this) => void) {
    reader(this);
  }

  static STRUCT: string;
}

ScreenVert.STRUCT = `
pathux.ScreenVert {
  0 : float;
  1 : float;
}
`;
nstructjs.register(ScreenVert);

export class ScreenHalfEdge<CTX extends IContextBase = IContextBase> {
  sarea: ScreenArea<CTX>;
  border: ScreenBorder<CTX>;
  side: number;

  constructor(border: ScreenBorder<CTX>, sarea: ScreenArea<CTX>) {
    this.sarea = sarea;
    this.border = border;
    this.side = sarea._side(border);
  }

  get v1() {
    return this.border.v1;
  }

  get v2() {
    return this.border.v2;
  }

  [Symbol.keystr]() {
    return this.sarea._sarea_id + ":" + this.border._id;
  }
}

export class ScreenBorder<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
  screen: import("./FrameManager.js").Screen | undefined;
  v1!: ScreenVert<CTX>;
  v2!: ScreenVert<CTX>;
  override _id: any; /* number | undefined in practice, overriding string from UIBase */
  _hash: string | undefined;
  outer: boolean | undefined;
  halfedges: ScreenHalfEdge<CTX>[];
  sareas: ScreenArea<CTX>[];
  _innerstyle: HTMLStyleElement;
  _style: HTMLStyleElement | undefined;
  inner: HTMLDivElement;
  movable: boolean;

  constructor() {
    super();

    this.visibleToPick = false;

    this.screen = undefined;
    // v1, v2, _id are set after construction by Screen.getScreenBorder
    this._id = undefined;

    this._hash = undefined;

    this.outer = undefined;

    this.halfedges = []; //all bordering borders, including ones with nonshared verts
    this.sareas = [];

    this._innerstyle = document.createElement("style");
    this._style = undefined;

    this.shadow.appendChild(this._innerstyle);

    this.inner = document.createElement("div");
    //this.inner.innerText = "sdfsdfsdf";
    this.shadow.appendChild(this.inner);

    this.movable = false;

    const call_menu = ScreenBorder.bindBorderMenu(this);

    this.addEventListener(
      "pointerdown",
      (e: PointerEvent) => {
        const ok = this.movable;

        if (e.button === 2) {
          call_menu(e);
          return;
        }

        if (!ok) {
          console.log("border is not movable");
          return;
        }

        const tool = new FrameManager_ops.AreaResizeTool(this.screen, this, [e.x, e.y]);

        (tool as any).start();

        e.preventDefault();
        e.stopPropagation();
      },
      { capture: true }
    );
  }

  static bindBorderMenu(elem: ScreenBorder | UIBase, usePickElement = false) {
    const on_dblclick = (e: MouseEvent) => {
      if (usePickElement && (elem as UIBase).pickElement(e.x, e.y) !== elem) {
        return;
      }

      let menu: any = [
        [
          "Split Area",
          () => {
            (elem as UIBase).ctx.screen.splitTool();
          },
        ],
        (Menu as any).SEP,
        [
          "Collapse Area",
          () => {
            console.log("Collapse Area!");
            (elem as UIBase).ctx.screen.removeAreaTool(elem instanceof ScreenBorder ? elem : undefined);
          },
        ],
      ];

      menu = createMenu((elem as UIBase).ctx, "", menu);
      //if (e.button === 2) {
      menu.ignoreFirstClick = 2;
      //}

      (elem as UIBase).ctx.screen.popupMenu(menu, e.x - 15, e.y - 15);

      e.preventDefault();
      e.stopPropagation();
    };

    elem.addEventListener("contextmenu", (e: Event) => e.preventDefault());
    elem.addEventListener("dblclick", on_dblclick as EventListener, { capture: true });

    return on_dblclick;
  }

  getOtherSarea(sarea: import("./ScreenArea.js").ScreenArea) {
    console.log(this.halfedges, this.halfedges.length);

    for (const he of this.halfedges) {
      console.log(he);

      let ok = he.sarea !== sarea;
      ok = ok && he.sarea._verts.includes(this.v1!);
      ok = ok && he.sarea._verts.includes(this.v2!);

      if (ok) {
        return he.sarea;
      }
    }
  }

  get locked() {
    for (const sarea of this.sareas) {
      const mask = 1 << sarea._borders.indexOf(this as unknown as (typeof sarea._borders)[number]);
      const lock = sarea.borderLock & mask;

      if (lock || sarea.flag & AreaFlags.NO_COLLAPSE) {
        return true;
      }
    }

    return false;
  }

  get dead() {
    return !this.parentNode;
  }

  get side(): never {
    throw new Error("side accedd");
  }

  set side(_val: never) {
    throw new Error("side accedd");
  }

  get valence() {
    let ret = 0; //this.sareas.length;
    const horiz = this.horiz;

    const visit: Record<string, number> = {};

    for (let i = 0; i < 2; i++) {
      const sv = i ? this.v2! : this.v1!;
      //console.log(sv);

      for (const sa of sv.borders) {
        if (sa.horiz != this.horiz) continue;
        if (sa._id! in visit) continue;

        visit[sa._id!] = 1;

        const a0x = Math.min(this.v1![0] as number, this.v2![0] as number);
        const a0y = Math.min(this.v1![1] as number, this.v2![1] as number);
        const a1x = Math.max(this.v1![0] as number, this.v2![0] as number);
        const a1y = Math.max(this.v1![1] as number, this.v2![1] as number);

        const b0x = Math.min(sa.v1![0] as number, sa.v2![0] as number);
        const b0y = Math.min(sa.v1![1] as number, sa.v2![1] as number);
        const b1x = Math.min(sa.v1![0] as number, sa.v2![0] as number);
        const b1y = Math.min(sa.v1![1] as number, sa.v2![1] as number);

        let ok;

        const eps = 0.001;
        if (horiz) {
          ok = a0y <= b1y + eps && a1y >= a0y - eps;
        } else {
          ok = a0x <= b1x + eps && a1x >= a0x - eps;
        }

        if (ok) {
          //console.log("found");
          ret += sa.sareas.length;
        }
      }
    }

    return ret;
  }

  get horiz() {
    const dx = (this.v2![0] as number) - (this.v1![0] as number);
    const dy = (this.v2![1] as number) - (this.v1![1] as number);

    return Math.abs(dx) > Math.abs(dy);
  }

  static hash<CTX extends IContextBase = IContextBase>(v1: ScreenVert<CTX>, v2: ScreenVert<CTX>) {
    return Math.min(v1._id, v2._id) + ":" + Math.max(v1._id, v2._id);
  }

  static define() {
    return {
      tagname: "screenborder-x",
      style  : "screenborder",
    };
  }

  otherVertex(v: ScreenVert<CTX>) {
    if (v === this.v1) return this.v2;
    else return this.v1;
  }

  setCSS() {
    (this.style as unknown as Record<string, string>)["pointer-events"] = this.movable ? "auto" : "none";

    if (this._style === undefined) {
      this._style = document.createElement("style");
      this.appendChild(this._style);
    }

    const dpi = UIBase.getDPI();

    const pad = (this.getDefault("mouse-threshold") as number) / dpi;
    let wid = this.getDefault("border-width") as number;

    const v1 = this.v1!;
    const v2 = this.v2!;
    const vec = new Vector2(v2).sub(v1);

    let x = Math.min(v1[0] as number, v2[0] as number);
    let y = Math.min(v1[1] as number, v2[1] as number);
    let w: number;
    let h: number;
    let cursor: string;
    let bstyle: string;

    (this.style as unknown as Record<string, string>)["display"] = "flex";
    (this.style as unknown as Record<string, string>)["display"] = this.horiz ? "row" : "column";
    (this.style as unknown as Record<string, string>)["justify-content"] = "center";
    (this.style as unknown as Record<string, string>)["align-items"] = "center";

    if (!this.horiz) {
      (this.style as unknown as Record<string, string>)["padding-left"] = (
        this.style as unknown as Record<string, string>
      )["padding-right"] = pad + "px";
      x -= wid * 0.5 + pad;

      w = wid * 2;
      h = Math.abs(vec[1] as number);

      cursor = "e-resize";
      bstyle = "border-left-style : solid;\n    border-right-style : solid;\n";
      bstyle = "border-top-style : none;\n    border-bottom-style : none;\n";
    } else {
      (this.style as unknown as Record<string, string>)["padding-top"] = (
        this.style as unknown as Record<string, string>
      )["padding-bottom"] = pad + "px";
      y -= wid * 0.5 + pad;

      w = Math.abs(vec[0] as number);
      h = wid;

      cursor = "n-resize";
      bstyle = "border-top-style : solid;\n    border-bottom-style : solid;\n";
    }

    let color = this.getDefault("border-outer") as string;
    const debug = cconst.DEBUG.screenborders;

    if (debug) {
      wid = 4;
      const alpha = 1.0;
      const c = this.sareas.length * 75;

      let r = 0;
      let g = 0;
      let b = 0;

      if (this.movable) {
        b = 255;
      }
      if (this.halfedges.length > 1) {
        g = 255;
      }
      if (this.outer) {
        r = 255;
      }
      color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const innerbuf = `
        .screenborder_inner_${this._id} {
          ${bstyle}
          ${this.horiz ? "height" : "width"} : ${wid}px;
          ${!this.horiz ? "height" : "width"} : 100%;
          margin : 0px;
          padding : 0px;

          background-color : ${this.getDefault("border-inner")};
          border-color : ${color};
          border-width : ${wid * 0.5}px;
          border-style : ${debug && this.outer ? "dashed" : "solid"};
          pointer-events : none;
        }`;

    let sbuf = `
        .screenborder_${this._id} {
        }
    `;

    let ok = this.movable;
    if (!this.outer) {
      for (const sarea of this.sareas) {
        ok = ok || !!sarea.floating;
      }
    }

    if (ok) {
      sbuf += `
        .screenborder_${this._id}:hover {
          cursor : ${cursor!};
        }
      `;
    }

    this._style.textContent = sbuf;
    this._innerstyle.textContent = innerbuf;

    this.setAttribute("class", "screenborder_" + this._id);
    this.inner.setAttribute("class", "screenborder_inner_" + this._id);

    (this.style as unknown as Record<string, string>)["position"] = UIBase.PositionKey;
    (this.style as unknown as Record<string, string>)["left"] = x + "px";
    (this.style as unknown as Record<string, string>)["top"] = y + "px";
    (this.style as unknown as Record<string, string>)["width"] = w! + "px";
    (this.style as unknown as Record<string, string>)["height"] = h! + "px";
    (this.style as unknown as Record<string, string>)["z-index"] = "" + BORDER_ZINDEX_BASE;
  }

  valueOf() {
    return ScreenBorder.hash(this.v1!, this.v2!);
  }

  [Symbol.keystr]() {
    return ScreenBorder.hash(this.v1!, this.v2!);
  }
}

ui_base.UIBase.internalRegister(ScreenBorder);
