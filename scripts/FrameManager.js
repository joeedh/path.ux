let _FrameManager = undefined;
import './ui_widgets2.js';

import cconst from './const.js';
import {haveModal, pushModalLight, popModalLight} from './simple_events.js';
import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as ui from './ui.js';
import * as ScreenArea from './ScreenArea.js';
import * as events from './events.js';
import * as FrameManager_ops from './FrameManager_ops.js';
import * as math from './math.js';
import * as ui_colorpicker from './ui_colorpicker.js';
import * as ui_tabs from './ui_tabs.js';
import * as ui_menu from './ui_menu.js';
import './struct.js';
import {KeyMap, HotKey} from './simple_events.js';
import {keymap} from "./simple_events.js";

let Area = ScreenArea.Area;

import './ui_widgets.js';
import './ui_tabs.js';
import './ui_colorpicker2.js';
import './ui_noteframe.js';
import './ui_listbox.js';
import './ui_table.js';

ui_menu.startMenuEventWrangling();

let _events_started = false;

export function registerToolStackGetter(func) {
  FrameManager_ops.registerToolStackGetter(func);
}

//XXX why!!!
window._nstructjs = nstructjs;

let Vector2 = vectormath.Vector2,
  UIBase = ui_base.UIBase;

let update_stack = new Array(8192);
update_stack.cur = 0;

export class ScreenVert extends Vector2 {
  constructor(pos, id, side) {
    super(pos);

    this.side = side;
    this.sareas = [];
    this.borders = [];

    this._id = id;
  }

  static hash(pos, side) {
    let x = Math.floor(pos[0]/2.0);
    let y = Math.floor(pos[1]/2.0);

    return ""+x + ":" + y;
  }

  valueOf() {
    return ScreenVert.hash(this, this.side);
  }

  [Symbol.keystr]() {
    return ScreenVert.hash(this, this.side);
  }

  loadSTRUCT(reader) {
    reader(this);

    this.load(this._vec);
    delete this._vec;
  }
}

ScreenVert.STRUCT = `
pathux.ScreenVert {
  _vec : vec2;
}
`;

export class ScreenHalfEdge {
  constructor(border, sarea) {
    this.sarea = sarea;
    this.border = border;
  }

  get v1() {
    return this.border.v1;
  }

  get v2() {
    return this.border.v2;
  }

  get side() {
    return this.sarea._side(this.border);
  }
}

export class ScreenBorder extends ui_base.UIBase {
  constructor() {
    super();

    this.screen = undefined;
    this.v1 = undefined;
    this.v2 = undefined;
    this._id = undefined;

    this.side = 0; //which side of area are we on, going counterclockwise

    this.halfedges = []; //all bordering borders, including ones with nonshared verts
    this.sareas = [];

    this._innerstyle = document.createElement("style");
    this._style = undefined;

    this.shadow.appendChild(this._innerstyle);

    this.inner = document.createElement("div");
    //this.inner.innerText = "sdfsdfsdf";
    this.shadow.appendChild(this.inner);

    this.addEventListener("mousedown", (e) => {
      console.log(this.sareas.length, this.sareas, "|||||");

      if (this.valence < 2) {
        let ok = false;

        for (let sarea of this.sareas) {
          if (sarea.floating) {
            ok = true;
          }
        }

        if (!ok) {
          console.log(this, this.sareas);
          console.log("ignoring border ScreenArea");
          return;
        }
      }

      if (!this.movable) {
        return;
      }

      console.log("area resize start!");
      let tool = new FrameManager_ops.AreaResizeTool(this.screen, this, [e.x, e.y]);

      tool.start();

      e.preventDefault();
      e.stopPropagation();
    });
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

  otherVert(v) {
    if (v === this.v1)
      return this.v2;
    else
      return this.v1;
  }

  get horiz() {
    let dx = this.v2[0] - this.v1[0];
    let dy = this.v2[1] - this.v1[1];

    return Math.abs(dx) > Math.abs(dy);
  }

  setCSS() {
    if (this._style === undefined) {
      this._style = document.createElement("style");
      this.appendChild(this._style);
    }

    let wid = 8, iwid = 4;

    let v1 = this.v1, v2 = this.v2;
    let vec = new Vector2(v2).sub(v1);

    let x = Math.min(v1[0], v2[0]), y = Math.min(v1[1], v2[1]);
    let w, h;
    let cursor, bstyle, mstyle;

    if (Math.abs(vec[0]) < Math.abs(vec[1])) {
      x -= wid / 2;

      w = wid;
      h = Math.abs(vec[1]);

      cursor = 'e-resize';

      bstyle = "border-left-style : solid;\n    border-right-style : solid;\n";
      mstyle = "margin-left : 2px;\n    margin-right : 2px;\n    ";
      mstyle += "height : 100%;\n    width:${iwid}px;\n";
    } else {
      y -= wid / 2;

      w = Math.abs(vec[0]);
      h = wid;
      cursor = 'n-resize';
      bstyle = "border-top-style : solid;\n    border-bottom-style : solid;\n";
      mstyle = "margin-top : 2px;\n    margin-bottom : 2px;\n    ";
      mstyle += "width : 100%;\n    height:${iwid}px;\n";
    }

    let color = this.getDefault("ScreenBorderOuter");
    let width = this.getDefault("ScreenBorderWidth");

    if (cconst.DEBUG.screenborders) {
      width = 4;
      let alpha = 1.0;
      let c = this.sareas.length*75;

      let r=0, g=0, b=0;

      if (this.movable) {
        b=255;
      }
      if (this.halfedges.length > 1) {
        g=255;
      }
      color = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }


    let innerbuf = `
        .screenborder_inner_${this._id} {
          ${bstyle}
          ${mstyle}
          background-color : ${this.getDefault("ScreenBorderInner")};
          border-color : ${color};
          border-width : ${width}px;
          pointer-events : none;
        }`;

    let sbuf = `
        .screenborder_${this._id} {
          padding : 0;
          margin : 0;
        }
    `;

    let ok = this.valence >= 2;
    for (let sarea of this.sareas) {
      ok = ok || sarea.floating;
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

    this.style["position"] = "absolute";
    this.style["left"] = x + "px";
    this.style["top"] = y + "px";
    this.style["width"] = w + "px";
    this.style["height"] = h + "px";
    this.style["z-index"] = 5;
  }

  static hash(v1, v2, side) {
    return Math.min(v1._id, v2._id) + ":" + Math.max(v1._id, v2._id);
  }

  valueOf() {
    return ScreenBorder.hash(this.v1, this.v2);
  }

  [Symbol.keystr]() {
    return ScreenBorder.hash(this.v1, this.v2);
  }

  static define() {
    return {
      tagname: "screenborder-x"
    };
  }
}

ui_base.UIBase.register(ScreenBorder);

let screen_idgen = 0;

export class Screen extends ui_base.UIBase {
  constructor() {
    super();

    this._popup_safe = 0;

    //if true, will test all areas for keymaps on keypress,
    //not just the active one
    this.testAllKeyMaps = false;

    this.needsTabRecalc = true;
    this._screen_id = screen_idgen++;

    this._popups = [];

    this._ctx = undefined;

    this.keymap = new KeyMap();

    this.size = [window.innerWidth, window.innerHeight];
    this.idgen = 0;
    this.sareas = [];
    this.sareas.active = undefined;
    this.mpos = [0, 0];

    this.screenborders = [];
    this.screenverts = [];
    this._vertmap = {};
    this._edgemap = {};
    this._idmap = {};

    //effective bounds of screen
    this._aabb = [new Vector2(), new Vector2()];

    this.shadow.addEventListener("mousemove", (e) => {
      let elem = this.pickElement(e.x, e.y, 1, 1, ScreenArea.ScreenArea);

      if (elem !== undefined) {
        if (elem.area) {
          //make sure context area stacks are up to date
          elem.area.push_ctx_active();
          elem.area.pop_ctx_active();
        }

        this.sareas.active = elem;
      }

      this.mpos[0] = e.x;
      this.mpos[1] = e.y;
    });

    this.shadow.addEventListener("touchmove", (e) => {
      this.mpos[0] = e.touches[0].pageX;
      this.mpos[1] = e.touches[0].pageY;
    });

  }

  newScreenArea() {
    let ret = document.createElement("screenarea-x");
    ret.ctx = this.ctx;

    if (ret.ctx) {
      ret.init();
    }

    return ret;
  }

  copy() {
    let ret = document.createElement(this.constructor.define().tagname);
    ret.ctx = this.ctx;
    ret._init();

    for (let sarea of this.sareas) {
      let sarea2 = sarea.copy(ret);

      sarea2._ctx = this.ctx;
      sarea2.screen = ret;
      sarea2.parentWidget = ret;

      ret.appendChild(sarea2);
    }

    for (let sarea of ret.sareas) {
      sarea.ctx = this.ctx;
      sarea.area.ctx = this.ctx;

      sarea.area.push_ctx_active();
      sarea._init();
      sarea.area._init();
      sarea.area.pop_ctx_active();

      for (let area of sarea.editors) {
        area.ctx = this.ctx;

        area.push_ctx_active();
        area._init();
        area.pop_ctx_active();
      }
    }

    ret.update();
    ret.regenBorders();
    ret.setCSS();

    return ret;
  }

  //pickElement(x, y, sx=0, sy=0, nodeclass=undefined) {

  //}

  pickElement(x, y, sx, sy, nodeclass, excluded_classes) {
    let ret;

    for (let popup of this._popups) {
      ret = ret || popup.pickElement(...arguments);
    }

    ret = ret || super.pickElement(...arguments);

    return ret;
  }

  _enterPopupSafe() {
    if (this._popup_safe === undefined) {
      this._popup_safe = 0;
    }

    this._popup_safe++;
  }

  * _allAreas() {
    for (let sarea of this.sareas) {
      for (let area of sarea.editors) {
        yield [area, area._area_id, sarea];
      }
    }
  }

  _exitPopupSafe() {
    this._popup_safe = Math.max(this._popup_safe-1, 0);
  }
  /** makes a popup at x,y and returns a new container-x for it */
  popup(owning_node, elem_or_x, y, closeOnMouseOut=true) {
    let x;

    let sarea = this.sareas.active;

    let w = owning_node;
    while (w) {
      if (w instanceof ScreenArea.ScreenArea) {
        sarea = w;
        break;
      }
      w = w.parentWidget;
    }

    if (typeof elem_or_x === "object") {
      let r = elem_or_x.getClientRects()[0];

      x = r.x;
      y = r.y;
    } else {
      x = elem_or_x;
    }

    let container = document.createElement("container-x");

    container.ctx = this.ctx;
    container._init();

    let remove = container.remove;
    container.remove = () => {
      if (this._popups.indexOf(container) >= 0) {
        this._popups.remove(container);
      }

      return remove.apply(container, arguments);
    };

    container.background = this.getDefault("BoxSubBG");
    container.style["display"] = "float";
    container.style["position"] = "absolute";
    container.style["z-index"] = 205;
    container.style["left"] = x + "px";
    container.style["top"] = y + "px";

    this.shadow.appendChild(container);
    this._popups.push(container);

    let touchpick, mousepick, keydown;

    let done = false;
    let end = () => {
      if (this._popup_safe) {
        return;
      }

      if (done) return;
      console.log("container end");

      this.ctx.screen.removeEventListener("touchstart", touchpick, true);
      this.ctx.screen.removeEventListener("touchmove", touchpick, true);
      this.ctx.screen.removeEventListener("mousedown", mousepick, true);
      this.ctx.screen.removeEventListener("mousemove", mousepick, true);
      this.ctx.screen.removeEventListener("mouseup", mousepick, true);
      window.removeEventListener("keydown", keydown);

      done = true;
      container.remove();
    };

    container.end = end;

    let _remove = container.remove;
    container.remove = function() {
      if (arguments.length == 0) {
        end();
      }
      _remove.apply(this, arguments);
    };

    container._ondestroy = () => {
      end();
    };

    let bad_time = util.time_ms();
    let last_pick_time = util.time_ms();

    mousepick = (e, x, y, do_timeout=true) => {
      if (sarea && sarea.area) {
        sarea.area.push_ctx_active();
        sarea.area.pop_ctx_active();
      }
      //console.log("=======================================================popup touch start");
      //console.log(e);
      
      if (util.time_ms() - last_pick_time < 250) {
        return;
      }
      last_pick_time = util.time_ms();

      x = x === undefined ? e.x : x;
      y = y === undefined ? e.y : y;

      let elem = this.pickElement(x, y, 2, 2, undefined, [ScreenBorder]);
      let startelem = elem;

      if (elem === undefined) {
        if (closeOnMouseOut) {
          end();
        }
        return;
      }

      let ok = false;

      while (elem) {
        if (elem === container) {
          ok = true;
          break;
        }
        elem = elem.parentWidget;
      }

      if (!ok) {
        e.stopPropagation();

        do_timeout = !do_timeout || (util.time_ms() - bad_time > 100);

        if (closeOnMouseOut && do_timeout) {
          end();
        }
      } else {
        bad_time = util.time_ms();
      }
    };

    touchpick = (e) => {
      let x = e.touches[0].pageX, y = e.touches[0].pageY;

      return mousepick(e, x, y, false);
    };

    keydown = (e) => {
      console.log(e.keyCode);

      switch (e.keyCode) {
        case keymap["Escape"]:
          end();
          break;
      }
    };

    this.ctx.screen.addEventListener("touchstart", touchpick, true);
    this.ctx.screen.addEventListener("touchmove", touchpick, true);
    this.ctx.screen.addEventListener("mousemove", mousepick, true);
    this.ctx.screen.addEventListener("mousedown", mousepick, true);
    this.ctx.screen.addEventListener("mouseup", mousepick, true);
    window.addEventListener("keydown", keydown);

    /*
    container.addEventListener("mouseleave", (e) => {
      console.log("popup mouse leave");
      if (closeOnMouseOut)
        end();
    });
    container.addEventListener("mouseout", (e) => {
      console.log("popup mouse out");
      if (closeOnMouseOut)
        end();
    });
    //*/

    this.calcTabOrder();

    return container;
  }

  _recalcAABB() {
    let mm = new math.MinMax(2);

    for (let sarea of this.sareas) {
      this.minmaxArea(sarea, mm);
    }

    this._aabb[0].load(mm.min);
    this._aabb[1].load(mm.max);
  }

  get borders() {
    let this2 = this;

    return (function* () {
      for (let k in this2._edgemap) {
        yield this2._edgemap[k];
      }
    })();
  }

  //XXX look at if this is referenced anywhere
  load() {
  }

  //XXX look at if this is referenced anywhere
  save() {
  }

  remove(trigger_destroy = true) {
    this.unlisten();

    if (trigger_destroy) {
      return super.remove();
    } else {
      HTMLElement.prototype.remove.call(this);
    }
  }

  unlisten() {
    if (this.listen_timer !== undefined) {
      window.clearInterval(this.listen_timer);
      this.listen_timer = undefined;
    }
  }

  updateSize() {
    let width = ~~window.innerWidth;
    let height = ~~window.innerHeight;

    if (width !== this.size[0] || height !== this.size[1]) {
      console.log("resizing");
      this.on_resize([width, height]);
    }
  }

  listen(args={updateSize : true}) {
    ui_menu.setWranglerScreen(this);

    let ctx = this.ctx;
    startEvents(() => ctx.screen);

    if (this.listen_timer !== undefined) {
      return; //already listening
    }

    this._do_updateSize = args.updateSize !== undefined ? args.updateSize : true;

    this.listen_timer = window.setInterval(() => {
      this.update();
    }, 150);
  }

  _ondestroy() {
    if (ui_menu.getWranglerScreen() === this) {
      //ui_menu.setWranglerScreen(undefined);
    }

    this.unlisten();

    //unlike other ondestroy functions, this one physically dismantles the DOM tree
    let recurse = (n, second_pass, parent) => {
      if (n.__pass === second_pass) {
        console.warn("CYCLE IN DOM TREE!", n, parent);
        return;
      }

      n.__pass = second_pass;

      n._forEachChildWidget(n2 => {
        if (n === n2)
          return;
        recurse(n2, second_pass, n);

        try {
          if (!second_pass && !n2.__destroyed) {
            n2.__destroyed = true;
            n2._ondestroy();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to exectue an ondestroy callback");
        }

        n2.__destroyed = true;

        try {
          if (second_pass) {
            n2.remove();
          }
        } catch (error) {
          print_stack(error);
          console.log("failed to remove element after ondestroy callback");
        }
      });
    };

    let id = ~~(Math.random() * 1024 * 1024);

    recurse(this, id);
    recurse(this, id + 1);
  }

  destroy() {
    this._ondestroy();
  }

  clear() {
    this._ondestroy();

    this.sareas = [];
    this.sareas.active = undefined;

    for (let child of list(this.childNodes)) {
      child.remove();
    }
    for (let child of list(this.shadow.childNodes)) {
      child.remove();
    }
  }

  _test_save() {
    let obj = JSON.parse(JSON.stringify(this));
    console.log(JSON.stringify(this));

    this.loadJSON(obj);
  }

  loadJSON(obj, schedule_resize = false) {
    this.clear();
    super.loadJSON();

    for (let sarea of obj.sareas) {
      let sarea2 = document.createElement("screenarea-x");

      sarea2.ctx = this.ctx;
      sarea2.screen = this;

      this.appendChild(sarea2);

      sarea2.loadJSON(sarea);
    }

    this.regenBorders();
    this.setCSS();

    if (schedule_resize) {
      window.setTimeout(() => {
        this.on_resize([window.innerWidth, window.innerHeight]);
      }, 50);
    }
  }

  static fromJSON(obj, schedule_resize = false) {
    let ret = document.createElement(this.define().tagname);
    return ret.loadJSON(obj, schedule_resize);
  }

  toJSON() {
    let ret = {
      sareas: this.sareas
    };

    ret.size = this.size;
    ret.idgen = this.idgen;

    return Object.assign(super.toJSON(), ret);
  }

  getHotKey(toolpath) {
    let test = (keymap) => {
      for (let hk of keymap) {
        if (typeof hk.action != "string")
          continue;

        if (hk.action.trim().startsWith(toolpath.trim())) {
          return hk;
        }
      }
    };

    let ret = test(this.keymap);
    if (ret)
      return ret;

    if (this.sareas.active && this.sareas.active.keymap) {
      let area = this.sareas.active.area;

      for (let keymap of area.getKeyMaps()) {
        ret = test(keymap);

        if (ret)
          return ret;
      }
    }

    if (ret === undefined) {
      //just to be safe, check all areas in case the
      //context is confused as to which area is currently "active"

      for (let sarea of this.sareas) {
        let area = sarea.area;

        for (let keymap of area.getKeyMaps()) {
          ret = test(keymap);

          if (ret) {
            return ret;
          }
        }
      }
    }

    return undefined;
  }

  execKeyMap(e) {
    let handled = false;

    if (this.sareas.active) {
      let area = this.sareas.active.area;
      //console.log(area.getKeyMaps());
      for (let keymap of area.getKeyMaps()) {
        if (keymap.handle(this.ctx, e)) {
          handled = true;
          break;
        }
      }
    }

    handled = handled || this.keymap.handle(this.ctx, e);

    if (!handled && this.testAllKeyMaps) {
      for (let sarea of this.sareas) {
        if (handled) {
          break;
        }

        for (let keymap of sarea.area.getKeyMaps()) {
          if (keymap.handle(this.ctx, e)) {
            handled = true;
            break;
          }
        }
      }
    }

    return handled;
  }

  static define() {
    return {
      tagname: "screen-x"
    };
  }

  calcTabOrder() {
    let nodes = [];
    let visit = {};

    let rec = (n) => {
      let bad = n.tabIndex < 0 || n.tabIndex === undefined || n.tabIndex === null;

      if (n._id in visit || n.hidden) {
        return;
      }

      visit[n._id] = 1;

      if (!bad) {
        n.__pos = n.getClientRects()[0];
        if (n.__pos) {
          nodes.push(n);
        }
      }

      n._forEachChildWidget((n2) => {
        rec(n2);
      });
    };

    for (let sarea of this.sareas) {
      rec(sarea);
    }

    for (let popup of this._popups) {
      rec(popup);
    }

    let nodes2 = nodes;
    /*
    let nodes2 = [];
    let visit2 = {};

    for (let node of nodes) {
      let r = node.__pos;
      let elem = this.pickElement(~~(r.x+r.width*0.5), ~~(r.y+r.height*0.5), 2, 2);

      if (elem === undefined) {
        elem = node;
      }

      if (elem !== node) {
        //console.log("Overlapping leaf UI elements detected:", elem, node);
      }

      if (!(elem._id in visit2)) {
        visit2[elem._id] = 1;
        nodes2.push(elem);
      }
    }
    //*/

    //console.log("nodes2", nodes2);
    for (let i=0; i<nodes2.length; i++) {
      let n = nodes2[i];

      n.tabIndex = i + 1;
      //console.log(n.tabIndex);
    }
  }

  drawUpdate() {
    if (window.redraw_all !== undefined) {
      window.redraw_all();
    }
  }

  update() {
    if (this._do_updateSize) {
      this.updateSize();
    }

    if (this.needsTabRecalc) {
      this.needsTabRecalc = false;
      this.calcTabOrder();
    }

    for (let sarea of this.sareas) {
      for (let b of sarea._borders) {
        let movable = this.isBorderMovable(sarea, b);

        if (movable !== b.movable) {
          console.log("detected change in movable borders");
          this.regenBorders();
        }
      }
    }

    if (this._update_gen) {
      let ret;

      try {
        ret = this._update_gen.next();
      } catch (error) {
        util.print_stack(error);
        console.log("error in update_intern tasklet");
        this._update_gen = undefined;
        return;
      }

      if (ret !== undefined && ret.done) {
        this._update_gen = undefined;
      }
    } else {
      this._update_gen = this.update_intern();
    }
  }

  get ctx() {
    return this._ctx;
  }

  set ctx(val) {
    this._ctx = val;

    //fully recurse tree
    let rec = (n) => {
      if (n instanceof UIBase) {
        n.ctx = val;
      }

      for (let n2 of n.childNodes) {
        rec(n2);
      }

      if (n.shadow) {
        for (let n2 of n.shadow.childNodes) {
          rec(n2);
        }
      }
    }

    for (let n of this.childNodes) {
      rec(n);
    }

    for (let n of this.shadow.childNodes) {
      rec(n);
    }
  }

  //XXX race condition warning
  update_intern() {
    super.update();
    let this2 = this;

    //ensure each area has proper ctx set
    for (let sarea of this.sareas) {
      sarea.ctx = this.ctx;
    }

    return (function* () {
      let stack = update_stack;
      stack.cur = 0;

      let lastn = this2;

      function push(n) {
        stack[stack.cur++] = n;
      }

      function pop(n) {
        if (stack.cur < 0) {
          throw new Error("Screen.update(): stack overflow!");
        }

        return stack[--stack.cur];
      }

      let ctx = this2.ctx;

      let SCOPE_POP = Symbol("pop");
      let AREA_CTX_POP = Symbol("pop2");

      let scopestack = [];
      let areastack = [];

      let t = util.time_ms();
      push(this2);
      while (stack.cur > 0) {
        let n = pop();

        if (n === undefined) {
          //console.log("eek!", stack.length);
          continue;
        } else if (n === SCOPE_POP) {
          scopestack.pop();
          continue;
        } else if (n === AREA_CTX_POP) {
          //console.log("POP", areastack[areastack.length-1].constructor.name);
          areastack.pop().pop_ctx_active(ctx, true);
          continue;
        }

        if (n instanceof Area) {
          //console.log("PUSH", n.constructor.name);
          areastack.push(n);
          n.push_ctx_active(ctx, true);
          push(AREA_CTX_POP);
        }

        if (n !== this2 && n instanceof UIBase) {
          n._ctx = ctx;

          if (scopestack.length > 0 && scopestack[scopestack.length - 1]) {
            n.parentWidget = scopestack[scopestack.length - 1];

            //if (n.parentWidget && n._useDataPathUndo === undefined && n.parentWidget._useDataPathUndo !== undefined) {
            //  n._useDataPathUndo = n.parentWidget._useDataPathUndo;
            //}
          }

          n.update();
        }

        if (util.time_ms() - t > 30) {
          yield;
          t = util.time_ms();
        }

        for (let n2 of n.childNodes) {
          push(n2);
        }

        if (n.shadow === undefined) {
          continue;
        }

        for (let n2 of n.shadow.childNodes) {
          push(n2);
        }

        if (n instanceof UIBase) {
          scopestack.push(n);
          push(SCOPE_POP);
        }
      }
    })();
  }

  loadFromVerts() {
    for (let sarea of this.sareas) {
      sarea.loadFromVerts();
      sarea.on_resize(sarea.size);
      sarea.setCSS();
    }

    this.setCSS();
  }

  splitArea(sarea, t = 0.5, horiz = true) {
    let w = sarea.size[0], h = sarea.size[1];
    let x = sarea.pos[0], y = sarea.size[1];
    let s1, s2;

    if (!horiz) {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[0] *= t;
      s2.size[0] *= (1.0 - t);

      s2.pos[0] += w * t;
    } else {
      s1 = sarea;
      if (s1.ctx === undefined) {
        s1.ctx = this.ctx;
      }
      s2 = s1.copy(this);

      s1.size[1] *= t;
      s2.size[1] *= (1.0 - t);

      s2.pos[1] += h * t;
    }

    s2.ctx = this.ctx;
    this.appendChild(s2);

    s1.on_resize(s1.size);
    s2.on_resize(s2.size);

    this.regenBorders();

    s1.setCSS();
    s2.setCSS();

    this.setCSS();

    //XXX not sure if this is right place to do this or really necassary
    if (s2.area !== undefined)
      s2.area.onadd();

    return s2;
  }

  setCSS() {
    this.style["width"] = this.size[0] + "px";
    this.style["height"] = this.size[1] + "px";

    //call setCSS on borders
    for (let key in this._edgemap) {
      let b = this._edgemap[key];

      b.setCSS();
    }
  }

  regenScreenMesh() {
    this.regenBorders();
  }

  regenBorders_stage2() {
    for (let b of this.screenborders) {
      b.halfedges = []
    }

    function hashHalfEdge(border, sarea) {
      return border._id + ":" + sarea._id;
    }

    function has_he(border, border2, sarea) {
      for (let he of border.halfedges) {
        if (border2 === he.border && sarea === he.sarea) {
          return true;
        }
      }

      return false;
    }

    for (let b1 of this.screenborders) {
      for (let sarea of b1.sareas) {
        let he = new ScreenHalfEdge(b1, sarea);
        b1.halfedges.push(he);
      }
    }

    for (let b1 of this.screenborders) {
      let s1 = b1;

      let min, max;
      let axis = b1.horiz ^ 1;

      min = Math.min(b1.v1[axis], b1.v2[axis]);
      max = Math.max(b1.v1[axis], b1.v2[axis]);

      for (let i = 0; i < 2; i++) {
        let v = i ? b1.v2 : b1.v1;

        for (let b2 of v.borders) {
          if (b2.horiz !== b1.horiz) {
            continue;
          }

          for (let he of b2.halfedges) {
            if (has_he(b1, he.border, he.sarea)) {
              continue;
            }

            let ok = b2.v1[axis] > min && b2.v1[axis] < max;
            ok = ok || (b2.v2[axis] > min && b2.v2[axis] < max);

            if (ok) {
              b1.halfedges.push(he);
              let he2 = b1.halfedges[0];

              if (!has_he(b2, b1, he2.sarea)) {
                b2.halfedges.push(he2);
              }
            }
          }
        }
      }
    }

    for (let b of this.screenborders) {
      let movable = true;

      for (let sarea of b.sareas) {
        movable = movable && this.isBorderMovable(sarea, b);
      }

      b.movable = movable;
    }
  }

  //XXX rename to regenScreenMesh
  regenBorders() {
    for (let k in this._edgemap) {
      let b = this._edgemap[k];

      b.remove();
    }

    this.screenborders = [];
    this._edgemap = {};
    this._vertmap = {};
    this.screenverts.length = 0;

    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
    }

    for (let key in this._edgemap) {
      let b = this._edgemap[key];

      b.setCSS();
    }

    this.regenBorders_stage2();

    this._recalcAABB();
  }

  snapScreenVerts() {
    let min = [1e17, 1e17], max = [-1e17, -1e17];

    this.regenBorders();

    //fit entire screen to, well, the entire screen (size)
    for (let v of this.screenverts) {
      for (let i = 0; i < 2; i++) {
        min[i] = Math.min(min[i], v[i]);
        max[i] = Math.max(max[i], v[i]);
      }
    }

    let vec = new Vector2(max).sub(min);
    let sz = new Vector2(this.size);

    sz.div(vec);

    for (let v of this.screenverts) {
      v.sub(min).mul(sz);
    }

    for (let sarea of this.sareas) {
      sarea.on_resize(sarea.size);
      sarea.loadFromVerts();
    }

    this.regenBorders();

    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
      sarea.setCSS();
    }

    this.setCSS();
  }

  on_resize(size) {
    size[0] = ~~size[0];
    size[1] = ~~size[1];

    let ratio = [size[0] / this.size[0], size[1] / this.size[1]];

    //console.log("resize!", ratio);

    for (let v of this.screenverts) {
      v[0] *= ratio[0];
      v[1] *= ratio[1];
    }

    let min = [1e17, 1e17], max = [-1e17, -1e17];
    let olds = [];

    for (let sarea of this.sareas) {
      olds.push([sarea.size[0], sarea.size[1]]);

      sarea.loadFromVerts();
    }

    this.size[0] = size[0];
    this.size[1] = size[1];

    let i = 0;
    for (let sarea of this.sareas) {
      sarea.on_resize(sarea.size, olds[i]);
      sarea.setCSS();
      i++;
    }

    this.snapScreenVerts();
    this.regenScreenMesh();

    this.setCSS();

    this._recalcAABB();
    this.calcTabOrder();
  }

  getScreenVert(pos, side, is_outer = false) {
    let key = ScreenVert.hash(pos, side);

    if (!(key in this._vertmap)) {
      let v = new ScreenVert(pos, this.idgen++, is_outer, side);

      this._vertmap[key] = v;
      this._idmap[v._id] = v;

      this.screenverts.push(v);
    }

    return this._vertmap[key];
  }

  isBorderOuter(sarea, border) {
    if (border.halfedges.length < 2) {
      if (border.halfedges.length === 1 && border.halfedges[0].sarea.floating) {
        return false;
      }
      return true;
    }
    return false;

    let side = sarea._borders.indexOf(border);

    if (side < 0) {
      console.warn("Missing border", border, sarea._borders);
      return false;
    }

    let b = sarea._borders[side];
    let v1 = b.v1;
    let v2 = b.v2;

    let is_outer = false;
    const outer_snap_limit = 25;

    let table = [];

    let rect = this.getClientRects()[0];
    let pos = rect !== undefined ? [rect.x, rect.y] : [0, 0];

    let box = [
      pos[0],
      this.size[1] + pos[1],
      this.size[0] + pos[0],
      pos[1],
    ];

    let axis = side & 1;

    //console.log("EEEK! ", Math.abs(v1[axis] - box[side]));
    return Math.abs(v1[axis] - box[side]) < 12;
  }

  isBorderMovable(sarea, b, limit = 5) {
    let side = sarea._borders.indexOf(b);

    if (side < 0) {
      console.warn("border corruption");
      return true;
    }

    let bad = sarea.size[0] < limit || sarea.size[1] < limit;
    bad = bad || this.isBorderOuter(sarea, b)
    bad = bad || (sarea.borderLock & (1 << side));

    for (let v of [b.v1, b.v2]) {
      for (let b2 of v.borders) {
        for (let sarea2 of b2.sareas) {
          let box = [
            sarea2.pos[0],
            sarea2.pos[1] + sarea2.size[1],
            sarea2.pos[0] + sarea2.size[0],
            sarea2.pos[1],
          ];

          for (let side2 = 0; side2 < 4; side2++) {
            let axis = side % 2;
            let horiz = side2 % 2;

            if (!!horiz !== !!b.horiz) {
              continue;
            }

            //console.log(box[side2], b.v1[axis], b.v2[axis]);

            if (Math.abs(box[side2] - b.v1[axis]) < 3) {
              bad = bad || (sarea2.borderLock & (1 << side2));
            }
          }
        }
      }
    }

    if (bad) {
      return false;
    }

    //if (limit && b.valence > 1) {
    //  return true;
    //}

    return true;
  }

  getScreenBorder(sarea, v1, v2, side) {
    if (!(v1 instanceof ScreenVert)) {
      v1 = this.getScreenVert(v1, side);
    }

    if (!(v2 instanceof ScreenVert)) {
      v2 = this.getScreenVert(v2, side);
    }

    let hash = ScreenBorder.hash(v1, v2, side);

    if (!(hash in this._edgemap)) {
      let sb = this._edgemap[hash] = document.createElement("screenborder-x");

      sb.side = side;

      sb.screen = this;
      sb.v1 = v1;
      sb.v2 = v2;
      sb._id = this.idgen++;

      v1.borders.push(sb);
      v2.borders.push(sb);

      sb.ctx = this.ctx;

      this.screenborders.push(sb);
      this.appendChild(sb);

      sb.setCSS();

      this._edgemap[hash] = sb;
      this._idmap[sb._id] = sb;
    }

    return this._edgemap[hash];
  }

  minmaxArea(sarea, mm = undefined) {
    if (mm === undefined) {
      mm = new math.MinMax(2);
    }

    for (let b of sarea._borders) {
      mm.minmax(b.v1);
      mm.minmax(b.v2);
    }

    return mm;
  }

  //does sarea1 border sarea2?
  areasBorder(sarea1, sarea2) {
    for (let b of sarea1._borders) {
      for (let sa of b.sareas) {
        if (sa === sarea2)
          return true;
      }
    }

    return false;
  }

  replaceArea(dst, src) {
    if (dst === src)
      return;

    src.pos[0] = dst.pos[0];
    src.pos[1] = dst.pos[1];
    src.size[0] = dst.size[0];
    src.size[1] = dst.size[1];

    if (this.sareas.indexOf(src) < 0) {
      this.appendChild(src);
    }

    src.setCSS();

    //this.sareas.remove(dst);
    //dst.remove();

    this.removeArea(dst);

    this.regenScreenMesh();
    this.snapScreenVerts();
    this._updateAll();
  }

  //regenerates borders, sets css and calls this.update
  _internalRegenAll() {
    this.regenScreenMesh();
    this.snapScreenVerts();
    this._updateAll();
    this.calcTabOrder();
  }


  _updateAll() {
    for (let sarea of this.sareas) {
      sarea.setCSS();
    }
    this.setCSS();
    this.update();
  }

  removeArea(sarea) {
    if (this.sareas.indexOf(sarea) < 0) {
      console.warn(sarea, "<- Warning: tried to remove unknown area");
      return;
    }

    this.sareas.remove(sarea);
    sarea.remove();

    for (let i=0; i<2; i++) {
      this.snapScreenVerts();
      this.regenScreenMesh();
    }

    this._updateAll();
    this.drawUpdate();
  }

  appendChild(child) {
    /*
    if (child instanceof UIBase) {
      if (child._useDataPathUndo === undefined) {
        child.useDataPathUndo = this.useDataPathUndo;
      }
    }*/

    if (child instanceof ScreenArea.ScreenArea) {
      child.screen = this;
      child.ctx = this.ctx;

      if (child.size.dot(child.size) === 0) {
        child.size[0] = this.size[0];
        child.size[1] = this.size[1];
      }

      if (!child._has_evts) {
        child._has_evts = true;

        let onfocus = (e) => {
          this.sareas.active = child;
        }

        let onblur = (e) => {
          if (this.sareas.active === child) {
            this.sareas.active = undefined;
          }
        }

        child.addEventListener("focus", onfocus);
        child.addEventListener("mouseenter", onfocus);
        child.addEventListener("blur", onblur);
        child.addEventListener("mouseleave", onblur);
      }

      this.sareas.push(child);
      child.setCSS();
      this.drawUpdate();
    }

    return this.shadow.appendChild(child);
    //return super.appendChild(child);
  }

  add(child) {
    return this.appendChild(child);
  }

  splitTool() {
    console.log("screen split!");

    //let tool = new FrameManager_ops.SplitTool(this);
    let tool = new FrameManager_ops.AreaDragTool(this, undefined, this.mpos);
    tool.start();
  }

  areaDragTool(sarea = this.sareas.active) {
    if (sarea === undefined) {
      console.warn("no active screen area");
      return;
    }

    console.log("screen area drag!");

    let mpos = this.mpos;
    let tool = new FrameManager_ops.AreaDragTool(this, this.sareas.active, mpos);

    tool.start();
  }

  makeBorders() {
    for (let sarea of this.sareas) {
      sarea.makeBorders(this);
    }
  }

  on_keydown(e) {
    if (!haveModal() && this.execKeyMap(e)) {
      e.preventDefault();
      return;
    }

    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keydown) {
      let area = this.sareas.active;
      return this.sareas.active.on_keydown(e);
    }
  }

  on_keyup(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keyup) {
      return this.sareas.active.on_keyup(e);
    }
  }

  on_keypress(e) {
    if (!haveModal() && this.sareas.active !== undefined && this.sareas.active.on_keypress) {
      return this.sareas.active.on_keypress(e);
    }
  }

  /*
  _do_mouse_event(e) {
    let type = e.type.toLowerCase();
    
    if (this.sareas.active !== undefined) {
      let x = e.x, y = e.y;
      let ret, sa = this.sareas.active;
      
      e.x -= sa.pos[0];
      e.y -= sa.pos[1];
      
      let key = "on_" + type.toLowerCase();
      
      try {
        ret = sa[key](e);
      } catch (error) {
        util.print_stack(error);
        console.error("Exception raised in Screen._do_mouse_event for a ScreenArea");
        
        ret = undefined;
      }
      
      e.x = x;
      e.y = y;
    }
    
    return e;
  }
  
  on_mousedown(e) {
    super.on_mousedown(e);
    return this._do_mouse_event(e);
  }
  on_mousemove(e) {
    super.on_mousemove(e);
    return this._do_mouse_event(e);
  }
  on_mouseup(e) {
    super.on_mouseup(e);
    return this._do_mouse_event(e);
  }
  on_touchstart(e) {
    super.on_touchstart(e);
    return this._do_mouse_event(e);
  }
  on_touchmove(e) {
    super.on_touchmove(e);
    return this._do_mouse_event(e);
  }
  on_touchcancel(e) {
    super.on_touchcancel(e);
    return this._do_mouse_event(e);
  }
  on_touchend(e) {
    super.on_touchend(e);
    return this._do_mouse_event(e);
  }//*/

  draw() {
    for (let sarea of this.sareas) {
      sarea.draw();
    }
  }

  static newSTRUCT() {
    return document.createElement(this.define().tagname);
  }

  afterSTRUCT() {
    for (let sarea of this.sareas) {
      sarea._ctx = this.ctx;
      sarea.afterSTRUCT();
    }
  }

  loadSTRUCT(reader) {
    reader(this);

    let sareas = this.sareas;
    this.sareas = [];

    for (let sarea of sareas) {
      sarea.screen = this;
      this.appendChild(sarea);
    }

    this.regenBorders();
    this.setCSS();

    this.doOnce(() => {
      this.loadUIData(this.uidata);
      this.uidata = undefined;
    });

    return this;
  }

  test_struct() {
    let data = [];
    //let scripts = nstructjs.write_scripts();
    nstructjs.manager.write_object(data, this);
    data = new DataView(new Uint8Array(data).buffer);

    let screen2 = nstructjs.manager.read_object(data, this.constructor);
    screen2.ctx = this.ctx;

    for (let sarea of screen2.sareas) {
      sarea.screen = screen2;
      sarea.ctx = this.ctx;
      sarea.area.ctx = this.ctx;
    }

    let parent = this.parentElement;
    this.remove();

    this.ctx.screen = screen2;

    parent.appendChild(screen2);

    //for (let 
    screen2.regenBorders();
    screen2.update();
    screen2.listen();

    screen2.doOnce(() => {
      screen2.on_resize([window.innerWidth, window.innerHeight]);
    });

    console.log(data)
    return screen2;
  }

  saveUIData() {
    try {
      return ui_base.saveUIData(this, "screen");
    } catch (error) {
      util.print_stack(error);
      console.log("Failed to save UI state data");
    }
  }

  loadUIData(str) {
    try {
      ui_base.loadUIData(this, str);
    } catch (error) {
      util.print_stack(error);
      console.log("Failed to load UI state data");
    }
  }
}

Screen.STRUCT = `
pathux.Screen { 
  size  : array(float);
  sareas : array(pathux.ScreenArea);
  idgen : int;
  uidata : string | obj.saveUIData();
}
`;

nstructjs.manager.add_class(Screen);
ui_base.UIBase.register(Screen);

ScreenArea.setScreenClass(Screen);


let get_screen_cb;
export function startEvents(getScreenFunc) {
  get_screen_cb = getScreenFunc;

  if (_events_started) {
    return;
  }

  _events_started = true;
  window.addEventListener("keydown", (e) => {
    let screen = get_screen_cb();

    return screen.on_keydown(e);
  });
}
