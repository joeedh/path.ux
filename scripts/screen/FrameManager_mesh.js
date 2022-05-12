import nstructjs from '../path-controller/util/struct.js';
import * as ui_base from "../core/ui_base.js";
import * as FrameManager_ops from "./FrameManager_ops.js";
import cconst from "../config/const.js";
import {UIBase} from '../core/ui_base.js';

import {Vector2} from '../path-controller/util/vectormath.js';
import {createMenu, Menu} from '../widgets/ui_menu.js';
import {popModalLight, pushModalLight} from '../path-controller/util/simple_events.js';

export const AreaFlags = {
  HIDDEN                : 1,
  FLOATING              : 2,
  INDEPENDENT           : 4, //area is indpendent of the screen mesh
  NO_SWITCHER           : 8,
  NO_HEADER_CONTEXT_MENU: 16,
  NO_COLLAPSE           : 32,
};

export let SnapLimit = 1;

export const BORDER_ZINDEX_BASE = 25

export function snap(c, snap_limit = SnapLimit) {
  if (Array.isArray(c)) {
    for (let i = 0; i < c.length; i++) {
      c[i] = Math.floor(c[i]/snap_limit)*snap_limit;
    }
  } else {
    c = Math.floor(c/snap_limit)*snap_limit;
  }

  return c;
}

export function snapi(c, snap_limit = SnapLimit) {
  //return snap(c, snap_limit);

  if (Array.isArray(c)) {
    for (let i = 0; i < c.length; i++) {
      c[i] = Math.ceil(c[i]/snap_limit)*snap_limit;
    }
  } else {
    c = Math.ceil(c/snap_limit)*snap_limit;
  }

  return c;
}

export class ScreenVert extends Vector2 {
  constructor(pos, id, added_id) {
    super(pos);

    this.added_id = added_id;
    this.sareas = [];
    this.borders = [];

    this._id = id;
  }

  static hash(pos, added_id, limit) {
    let x = snap(pos[0], limit);
    let y = snap(pos[1], limit);

    return "" + x + ":" + y + ": + added_id";
  }

  valueOf() {
    return ScreenVert.hash(this, this.added_id);
  }

  [Symbol.keystr]() {
    return ScreenVert.hash(this, this.added_id);
  }

  loadSTRUCT(reader) {
    reader(this);
  }
}

ScreenVert.STRUCT = `
pathux.ScreenVert {
  0 : float;
  1 : float;
}
`;
nstructjs.register(ScreenVert);

export class ScreenHalfEdge {
  constructor(border, sarea) {
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
    return this.sarea._id + ":" + this.border._id;
  }

}

export class ScreenBorder extends ui_base.UIBase {
  constructor() {
    super();

    this.visibleToPick = false;

    this.screen = undefined;
    this.v1 = undefined;
    this.v2 = undefined;
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

    let call_menu = ScreenBorder.bindBorderMenu(this);

    this.addEventListener("mousedown", (e) => {
      let ok = this.movable;

      if (e.button === 2) {
        call_menu(e);
        return;
      }

      if (!ok) {
        console.log("border is not movable");
        return;
      }

      console.log("area resize start!");
      let tool = new FrameManager_ops.AreaResizeTool(this.screen, this, [e.x, e.y]);

      tool.start();

      e.preventDefault();
      e.stopPropagation();
    }, {capture: true});
  }

  static bindBorderMenu(elem, usePickElement = false) {
    let on_dblclick = (e) => {
      if (usePickElement && elem.pickElement(e.x, e.y) !== elem) {
        return;
      }

      let menu = [
        ["Split Area", () => {
          elem.ctx.screen.splitTool();
        }],
        Menu.SEP,
        ["Collapse Area", () => {
          elem.ctx.screen.removeAreaTool(elem instanceof ScreenBorder ? elem : undefined);
        }],
      ];

      menu = createMenu(elem.ctx, "", menu);
      //if (e.button === 2) {
      menu.ignoreFirstClick = 2;
      //}

      elem.ctx.screen.popupMenu(menu, e.x - 15, e.y - 15);

      e.preventDefault();
      e.stopPropagation();
    }

    elem.addEventListener("contextmenu", (e) => e.preventDefault());
    elem.addEventListener("dblclick", on_dblclick, {capture: true});

    return on_dblclick;
  }

  getOtherSarea(sarea) {
    console.log(this.halfedges, this.halfedges.length);

    for (let he of this.halfedges) {
      console.log(he);

      let ok = he.sarea !== sarea;
      ok = ok && he.sarea._verts.indexOf(this.v1) >= 0;
      ok = ok && he.sarea._verts.indexOf(this.v2) >= 0;

      if (ok) {
        return he.sarea;
      }
    }
  }

  get locked() {
    for (let sarea of this.sareas) {
      let mask = 1<<sarea._borders.indexOf(this);
      let lock = sarea.borderLock & mask;

      if (lock || (sarea.flag & AreaFlags.NO_COLLAPSE)) {
        return true;
      }
    }

    return false;
  }

  get dead() {
    return !this.parentNode;
  }

  get side() {
    throw new Error("side accedd");
  }

  set side(val) {
    throw new Error("side accedd");
  }

  get valence() {
    let ret = 0; //this.sareas.length;
    let horiz = this.horiz;

    let visit = {};

    for (let i = 0; i < 2; i++) {
      let sv = i ? this.v2 : this.v1;
      //console.log(sv);

      for (let sa of sv.borders) {
        if (sa.horiz != this.horiz)
          continue;
        if (sa._id in visit)
          continue;

        visit[sa._id] = 1;

        let a0x = Math.min(this.v1[0], this.v2[0]);
        let a0y = Math.min(this.v1[1], this.v2[1]);
        let a1x = Math.max(this.v1[0], this.v2[0]);
        let a1y = Math.max(this.v1[1], this.v2[1]);

        let b0x = Math.min(sa.v1[0], sa.v2[0]);
        let b0y = Math.min(sa.v1[1], sa.v2[1]);
        let b1x = Math.min(sa.v1[0], sa.v2[0]);
        let b1y = Math.min(sa.v1[1], sa.v2[1]);

        let ok;

        let eps = 0.001;
        if (horiz) {
          ok = (a0y <= b1y + eps && a1y >= a0y - eps);
        } else {
          ok = (a0x <= b1x + eps && a1x >= a0x - eps);
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
    let dx = this.v2[0] - this.v1[0];
    let dy = this.v2[1] - this.v1[1];

    return Math.abs(dx) > Math.abs(dy);
  }

  static hash(v1, v2) {
    return Math.min(v1._id, v2._id) + ":" + Math.max(v1._id, v2._id);
  }

  static define() {
    return {
      tagname: "screenborder-x",
      style  : "screenborder"
    };
  }

  otherVertex(v) {
    if (v === this.v1)
      return this.v2;
    else
      return this.v1;
  }

  setCSS() {
    this.style["pointer-events"] = this.movable ? "auto" : "none";

    if (this._style === undefined) {
      this._style = document.createElement("style");
      this.appendChild(this._style);
    }

    let dpi = UIBase.getDPI();

    let pad = this.getDefault("mouse-threshold")/dpi;
    let wid = this.getDefault("border-width");

    let v1 = this.v1, v2 = this.v2;
    let vec = new Vector2(v2).sub(v1);

    let x = Math.min(v1[0], v2[0]), y = Math.min(v1[1], v2[1]);
    let w, h;
    let cursor, bstyle;


    this.style["display"] = "flex";
    this.style["display"] = this.horiz ? "row" : "column";
    this.style["justify-content"] = "center";
    this.style["align-items"] = "center";

    if (!this.horiz) {
      this.style["padding-left"] = this.style["padding-right"] = pad + "px";
      x -= wid*0.5 + pad;

      w = wid*2;
      h = Math.abs(vec[1]);

      cursor = 'e-resize';
      bstyle = "border-left-style : solid;\n    border-right-style : solid;\n";
      bstyle = "border-top-style : none;\n    border-bottom-style : none;\n";
    } else {
      this.style["padding-top"] = this.style["padding-bottom"] = pad + "px";
      y -= wid*0.5 + pad;

      w = Math.abs(vec[0]);
      h = wid;

      cursor = 'n-resize';
      bstyle = "border-top-style : solid;\n    border-bottom-style : solid;\n";
    }


    let color = this.getDefault("border-outer");
    let debug = cconst.DEBUG.screenborders;

    if (debug) {
      wid = 4;
      let alpha = 1.0;
      let c = this.sareas.length*75;

      let r = 0, g = 0, b = 0;

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


    let innerbuf = `
        .screenborder_inner_${this._id} {
          ${bstyle}
          ${this.horiz ? 'height' : 'width'} : ${wid}px;
          ${!this.horiz ? 'height' : 'width'} : 100%;
          margin : 0px;
          padding : 0px;
          
          background-color : ${this.getDefault("border-inner")};
          border-color : ${color};
          border-width : ${wid*0.5}px;
          border-style : ${debug && this.outer ? "dashed" : "solid"};
          pointer-events : none;
        }`;

    let sbuf = `
        .screenborder_${this._id} {
        }
    `;

    let ok = this.movable;
    if (!this.outer) {
      for (let sarea of this.sareas) {
        ok = ok || sarea.floating;
      }
    }

    if (ok) {
      sbuf += `
        .screenborder_${this._id}:hover {
          cursor : ${cursor};
        }
      `;
    }

    this._style.textContent = sbuf;
    this._innerstyle.textContent = innerbuf;

    this.setAttribute("class", "screenborder_" + this._id);
    this.inner.setAttribute("class", "screenborder_inner_" + this._id);

    this.style["position"] = UIBase.PositionKey;
    this.style["left"] = x + "px";
    this.style["top"] = y + "px";
    this.style["width"] = w + "px";
    this.style["height"] = h + "px";
    this.style["z-index"] = "" + BORDER_ZINDEX_BASE;
  }

  valueOf() {
    return ScreenBorder.hash(this.v1, this.v2);
  }

  [Symbol.keystr]() {
    return ScreenBorder.hash(this.v1, this.v2);
  }
}

ui_base.UIBase.internalRegister(ScreenBorder);
