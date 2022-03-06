"use strict";

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as events from '../path-controller/util/events.js';
import * as ui from '../core/ui.js';
import {loadUIData, saveUIData} from '../core/ui_base.js';

let UIBase      = ui_base.UIBase,
    PackFlags   = ui_base.PackFlags,
    IconSheets  = ui_base.IconSheets,
    iconmanager = ui_base.iconmanager;

export let tab_idgen = 1;
let debug = false;
let Vector2 = vectormath.Vector2;

function getpx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

let FAKE_TAB_ID = Symbol("fake_tab_id");


class TabDragEvent extends PointerEvent {
}


/* subclass HTMLElement so tabs can be used as the .target
*  member of events*/
export class TabItem extends HTMLElement {
  constructor() {
    super();

    this.name = name;
    this.icon = undefined;
    this.tooltip = "";
    this.movable = true;
    this.tbar = undefined;

    this.ontabclick = null;
    this.ontabdragstart = null;
    this.ontabdragmove = null;
    this.ontabdragend = null;

    let helper = (key) => {
      let key2 = "on" + key;

      this.addEventListener(key, (e) => {
        if (this[key2]) {
          return this[key2](e);
        }
      });
    }

    helper("tabclick");
    helper("tabdragstart");
    helper("tabdragmove");
    helper("tabdragend");

    this.dom = undefined;
    this.extra = undefined;
    this.extraSize = undefined;

    this.size = new Vector2();
    this.pos = new Vector2();

    this.abssize = new Vector2();
    this.abspos = new Vector2();
  }

  static define() {
    return {
      tagname: "tab-item-x"
    }
  }

  sendEvent(type, forwardEvent) {
    let cls;

    if (type === "tabdragstart" || type === "tabdragend") {
      cls = TabDragEvent;
    } else if (forwardEvent && forwardEvent instanceof Event) {
      cls = forwardEvent.constructor;
    } else {
      cls = PointerEvent;
    }

    let e2 = {};

    if (forwardEvent) {
      for (let k in forwardEvent) {
        if (k === "defaultPrevented" || k === "cancelBubble") {
          continue;
        }

        e2[k] = forwardEvent[k];
      }
    }

    e2.target = this;

    e2 = new cls(type, e2);

    this.dispatchEvent(e2);
    return e2;
  }

  getClientRects() {
    let r = this.tbar.getClientRects()[0];

    let s = this.abssize, p = this.abspos;

    s.load(this.size);
    p.load(this.pos);

    if (r) {
      p[0] += r.x;
      p[1] += r.y;
    }

    return [{
      x  : p[0], y: p[1], width: s[0], height: s[1], left: p[0],
      top: p[1], right: p[0] + s[0], bottom: p[1] + s[1]
    }];
  }
}

UIBase.internalRegister(TabItem);

export class ModalTabMove extends events.EventHandler {
  constructor(tab, tbar, dom) {
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

    this.popModal(this.dom);
    this.tbar.update(true);
  }

  popModal() {
    if (this.dragcanvas !== undefined) {
      this.dragcanvas.remove();
    }
    let ret = super.popModal(...arguments);

    this.tab.sendEvent("tabdragend");

    return ret;
  }

  on_pointerleave(e) {
    console.log("pointerleave!");
  }
  on_pointerenter(e) {
    console.log("pointerenter!");
  }
  on_pointerenter(e) {
    console.log("pointerexit!");
  }
  on_pointerstart(e) {
    console.log("pointerstart!");
  }
  on_pointerend(e) {
    console.log("pointerend!");
  }

  on_pointerdown(e) {
    console.log("pointerdown!");
    this.finish();
  }

  on_pointercancel(e) {
    console.warn("pointercancel!", e);
    this.finish();
  }

  on_pointerup(e) {
    this.finish();
  }

  on_pointermove(e) {
    console.log("pointermove!");
    return this._on_move(e, e.x, e.y);
  }

  _dragstate(e, x, y) {
    this.dragcanvas.style["left"] = x + "px";
    this.dragcanvas.style["top"] = y + "px";

    let ctx = this.tbar.ctx;
    let screen = ctx.screen;
    let elem = screen.pickElement(x, y);

    let e2 = new DragEvent("dragenter", this.dragevent);
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

  _on_move(e, x, y) {
    let r = this.tbar.getClientRects()[0];
    let dpi = UIBase.getDPI();

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

    let dx, dy;

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

    let tab = this.tab, tbar = this.tbar;
    let axis = tbar.horiz ? 0 : 1;
    let distx, disty;

    if (tbar.horiz) {
      tab.pos[0] += dx;
      disty = Math.abs(y - this.start_mpos[1]);
    } else {
      tab.pos[1] += dy;
      disty = Math.abs(x - this.start_mpos[0]);
    }

    let limit = 50;
    let csize = tbar.horiz ? this.tbar.canvas.width : this.tbar.canvas.height;

    let dragok = tab.pos[axis] + tab.size[axis] < -limit || tab.pos[axis] >= csize + limit;
    dragok = dragok || disty > limit*1.5;
    dragok = dragok && (this.tbar.draggable || this.tbar.getAttribute("draggable"));

    //console.log(dragok, disty, this.tbar.draggable);

    if (dragok) {
      this.dragstate = true;
      this.dragevent = new DragEvent("dragstart", {
        dataTransfer: new DataTransfer()
      });

      this.dragtab = tab;
      let g = this.tbar.g;
      this.dragimg = g.getImageData(~~tab.pos[0], ~~tab.pos[1], ~~tab.size[0], ~~tab.size[1]);
      this.dragcanvas = document.createElement("canvas");
      let g2 = this.drag_g = this.dragcanvas.getContext("2d");

      this.dragcanvas.visibleToPick = false;
      this.dragcanvas.width = ~~tab.size[0];
      this.dragcanvas.height = ~~tab.size[1];
      this.dragcanvas.style["width"] = (tab.size[0]/dpi) + "px";
      this.dragcanvas.style["height"] = (tab.size[1]/dpi) + "px";
      this.dragcanvas.style["position"] = UIBase.PositionKey;
      this.dragcanvas.style["left"] = e.x + "px";
      this.dragcanvas.style["top"] = e.y + "px";
      this.dragcanvas.style["z-index"] = "500";
      document.body.appendChild(this.dragcanvas);
      g2.putImageData(this.dragimg, 0, 0);


      this.tbar.dispatchEvent(this.dragevent);

      return;
    }

    let ti = tbar.tabs.indexOf(tab);
    let next = ti < tbar.tabs.length - 1 ? tbar.tabs[ti + 1] : undefined;
    let prev = ti > 0 ? tbar.tabs[ti - 1] : undefined;

    if (next !== undefined && tab.pos[axis] > next.pos[axis]) {
      tbar.swapTabs(tab, next);
    } else if (prev !== undefined && tab.pos[axis] < prev.pos[axis] + prev.size[axis]*0.5) {
      tbar.swapTabs(tab, prev);
    }

    tbar.update(true);

    this.mpos[0] = x;
    this.mpos[1] = y;

    let e2 = tab.sendEvent("tabdragmove", e);

    if (e2.defaultPrevented) {
      this.finish();
    }
  }

  on_keydown(e) {
    if (debug) console.log(e.keyCode);

    switch (e.keyCode) {
      case 27: //escape
      case 32: //space
      case 13: //enter
      case 9: //tab
        this.finish();
        break;
    }
  }
}

export class TabBar extends UIBase {
  constructor() {
    super();

    let style = document.createElement("style");
    let canvas = document.createElement("canvas");

    this.iconsheet = 0;
    this.movableTabs = true;

    this.tabFontScale = 1.0;

    this.tabs = [];
    this.tabs.active = undefined;
    this.tabs.highlight = undefined;

    this._last_style_key = undefined;

    canvas.style["width"] = "145px";
    canvas.style["height"] = "45px";

    this.r = 8;

    this.canvas = canvas;
    this.g = canvas.getContext("2d");

    this.canvas.style["touch-action"] = "none";

    style.textContent = `
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(canvas);

    this._last_dpi = undefined;
    this._last_pos = undefined;

    this.horiz = true;
    this.onchange = null;
    this.onselect = null; //onselect is like onchange, but fires even if tab hasn't changed

    let mx, my;

    let do_element = (e) => {
      for (let tab of this.tabs) {
        let ok;

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

    let do_mouse = (e) => {
      let r = this.canvas.getClientRects()[0];

      mx = e.x - r.x;
      my = e.y - r.y;

      let dpi = this.getDPI();

      mx *= dpi;
      my *= dpi;

      do_element(e);

      const is_mdown = e.type === "mousedown";
      if (is_mdown && this.onselect && this._fireOnSelect().defaultPrevented) {
        e.preventDefault();
      }
    }

    this.canvas.addEventListener("pointermove", (e) => {
      let r = this.canvas.getClientRects()[0];
      do_mouse(e);

      e.preventDefault();
      e.stopPropagation();
    }, false);


    let doclick = (e, handler, is_touch) => {
      do_mouse(e);

      if (e.defaultPrevented) {
        return;
      }

      if (debug) console.log("mdown");

      if (e.button !== 0) {
        return;
      }

      let ht = this.tabs.highlight;

      let acte = {};
      for (let k in e) {
        if (k === "defaultPrevented" || k === "cancelBubble") {
          continue;
        }

        acte[k] = e[k];
      }

      acte.target = ht;
      acte = new PointerEvent("tabactive", acte);

      let e2 = ht.sendEvent("tabclick", e);

      if (e2.defaultPrevented) {
        acte.preventDefault();
      }

      if (ht !== undefined && this.tool === undefined) {
        this.setActive(ht, acte);

        if (this.movableTabs && !acte.defaultPrevented) {
          this._startMove(ht, e);
        }

        e.preventDefault();
        e.stopPropagation();
      }
    }

    this.canvas.addEventListener("pointerdown", (e) => {
      doclick(e, do_mouse);
    });
  }

  static setDefault(e) {
    e.setAttribute("bar_pos", "top");
    e.updatePos(true);

    return e;
  }

  static define() {
    return {
      tagname: "tabbar-x",
      style  : "tabs"
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

  set tool(v) {
    console.warn("SET TOOL", v, this._id);
    this._tool = v;
  }

  _startMove(tab=this.tabs.active, event) {
    if (this.movableTabs) {
      let e2 = tab.sendEvent("tabdragstart", event);

      if (e2.defaultPrevented) {
        return;
      }

      if (this.tool) {
        this.tool.finish();
      }

      let edom = this.getScreen();
      let tool = this.tool = new ModalTabMove(tab, this, edom);

      if (event && event instanceof PointerEvent) {
        tool.pushPointerModal(this.canvas, event.pointerId);
      } else {
        tool.pushModal(edom, false);
      }
    }
  }

  _fireOnSelect() {
    let e = this._makeOnSelectEvt();

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
      }
    }
    /*
      return new MouseEvent("mousedown", {
        target : [this.tabs.highlight],
        tab : "sdfdsf"
      });

   */
  }

  getTab(name_or_id) {
    for (let tab of this.tabs) {
      if (tab.id === name_or_id || tab.name === name_or_id)
        return tab;
    }

    return undefined;
  }

  clear() {
    for (let t of this.tabs) {
      if (t.dom) {
        t.dom.remove();
        t.dom = undefined;
      }
    }

    this.tabs = [];
    this.setCSS();
    this._redraw();
  }

  saveData() {
    let taborder = [];

    for (let tab of this.tabs) {
      taborder.push(tab.name);
    }

    let act = this.tabs.active !== undefined ? this.tabs.active.name : "null";

    return {
      taborder: taborder,
      active  : act
    };
  }

  loadData(obj) {
    if (!obj.taborder) {
      return;
    }

    let tabs = this.tabs;
    let active = undefined;
    let ntabs = [];

    ntabs.active = undefined;
    ntabs.highlight = undefined;

    for (let tname of obj.taborder) {
      let tab = this.getTab(tname);

      if (tab === undefined) {
        continue;
      }

      if (tab.name === obj.active) {
        active = tab;
      }

      ntabs.push(tab);
    }

    for (let tab of tabs) {
      if (ntabs.indexOf(tab) < 0) {
        ntabs.push(tab);
      }
    }

    this.tabs = ntabs;

    try {
      if (active !== undefined) {
        this.setActive(active);
      } else {
        this.setActive(this.tabs[0]);
      }
    } catch (error) {
      util.print_stack(error);
    }

    this.update(true);

    return this;
  }

  swapTabs(a, b) {
    let tabs = this.tabs;

    let ai = tabs.indexOf(a);
    let bi = tabs.indexOf(b);

    tabs[ai] = b;
    tabs[bi] = a;

    this.update(true);
  }

  addIconTab(icon, id, tooltip, movable = true) {
    let tab = this.addTab("", id, tooltip, movable);
    tab.icon = icon;

    return tab;
  }

  addTab(name, id, tooltip = "", movable) {
    let tab = UIBase.createElement("tab-item-x", true);

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

  updatePos(force_update = false) {
    let pos = this.getAttribute("bar_pos");

    if (pos !== this._last_pos || force_update) {
      this._last_pos = pos;

      this.horiz = pos === "top" || pos === "bottom";
      if (debug) console.log("tab bar position update", this.horiz);

      if (this.horiz) {
        this.style["width"] = "100%";
        delete this.style["height"];
      } else {
        this.style["height"] = "100%";
        delete this.style["width"];
      }

      this._redraw();
    }
  }

  updateDPI(force_update = false) {
    let dpi = this.getDPI();

    if (dpi !== this._last_dpi) {
      if (debug) console.log("DPI update!");
      this._last_dpi = dpi;

      this.updateCanvas(true);
    }
  }

  updateCanvas(force_update = false) {
    let canvas = this.canvas;

    let dpi = this.getDPI();

    let rwidth = getpx(this.canvas.style["width"]);
    let rheight = getpx(this.canvas.style["height"]);

    let width = ~~(rwidth*dpi);
    let height = ~~(rheight*dpi);

    let update = force_update;
    update = update || canvas.width !== width || canvas.height !== height;

    if (update) {
      canvas.width = width;
      canvas.height = height;

      this._redraw();
    }
  }

  _getFont(tsize) {
    let font = this.getDefault("TabText");

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

    let g = this.g;

    if (debug) console.log("tab layout");

    let dpi = this.getDPI();

    let font = this._getFont();
    let tsize = (font.size*dpi);

    g.font = font.genCSS(tsize);

    let axis = this.horiz ? 0 : 1;

    let pad = 4*dpi + Math.ceil(tsize*0.25);
    let x = pad;
    let y = 0;

    let h = tsize + Math.ceil(tsize*0.5);
    let iconsize = iconmanager.getTileSize(this.iconsheet);
    let have_icons = false;

    for (let tab of this.tabs) {
      if (tab.icon !== undefined) {
        have_icons = true;
        h = Math.max(h, iconsize + 4);
        break;
      }
    }

    let r1 = this.parentWidget ? this.parentWidget.getClientRects()[0] : undefined;
    let r2 = this.canvas.getClientRects()[0];

    let rx = 0, ry = 0;
    if (r1 && r2) {
      rx = r2.x;//r2.x - r1.x;
      ry = r2.y; //r2.y - r1.y;
    }

    let ti = -1;

    let makeTabWatcher = (tab) => {
      if (tab.watcher) {
        clearInterval(tab.watcher.timer);
      }

      let watcher = () => {
        let dead = this.tabs.indexOf(tab) < 0;
        dead = dead || this.isDead();

        if (dead) {
          if (tab.dom)
            tab.dom.remove();
          tab.dom = undefined;

          if (tab.watcher.timer)
            clearInterval(tab.watcher.timer);
        }
      };

      tab.watcher = watcher;
      tab.watcher.timer = window.setInterval(watcher, 750);

      return tab.watcher.timer;
    };

    let haveTabDom = false;
    for (let tab of this.tabs) {
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

    for (let tab of this.tabs) {
      ti++;

      if (tab.extra && !tab.dom) {

        tab.dom = document.createElement("div");
        tab.dom.style["margin"] = tab.dom.style["padding"] = "0px";

        let z = this.calcZ();
        tab.dom.style["z-index"] = z + 1 + ti;

        document.body.appendChild(tab.dom);
        tab.dom.style["position"] = UIBase.PositionKey;
        tab.dom.style["display"] = "flex";
        tab.dom.style["flex-direction"] = this.horiz ? "row" : "column";

        tab.dom.style["pointer-events"] = "none";

        if (!this.horiz) {
          tab.dom.style["width"] = (tab.size[0]/dpi) + "px";
          tab.dom.style["height"] = (tab.size[1]/dpi) + "px";
          tab.dom.style["left"] = (rx + tab.pos[0]/dpi) + "px";
          tab.dom.style["top"] = (ry + tab.pos[1]/dpi) + "px";
        } else {
          tab.dom.style["width"] = (tab.size[0]/dpi) + "px";
          tab.dom.style["height"] = (tab.size[1]/dpi) + "px";
          tab.dom.style["left"] = (rx + tab.pos[0]/dpi) + "px";
          tab.dom.style["top"] = (ry + tab.pos[1]/dpi) + "px";
        }

        let font = this._getFont();
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
      let bad = this.tool !== undefined && tab === this.tabs.active;

      if (!bad) {
        tab.pos[axis] = x;
        tab.pos[axis ^ 1] = y;
      }

      //tab.size = [0, 0];
      tab.size[axis] = w + pad*2;
      tab.size[axis ^ 1] = h;

      x += w + pad*2;
    }

    x = (~~(x + pad))/dpi;
    h = (~~h)/dpi;


    if (this.horiz) {
      this.canvas.style["width"] = x + "px";
      this.canvas.style["height"] = h + "px";
    } else {
      this.canvas.style["height"] = x + "px";
      this.canvas.style["width"] = h + "px";
    }

    //this.canvas.width = x;
  }

  /** tab is a TabItem instance */
  setActive(tab, event) {
    if (tab.noSwitch) {
      return;
    }

    let update = tab !== this.tabs.active;
    this.tabs.active = tab;

    if (update) {
      if (this.onchange)
        this.onchange(tab, event);

      this.update(true);
    }
  }

  _redraw() {
    let g = this.g;

    let activecolor = this.getDefault("TabActive") || "rgba(0,0,0,0)";

    if (debug) console.log("tab draw");

    g.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let dpi = this.getDPI();
    let font = this._getFont();

    let tsize = font.size;
    let iconsize = iconmanager.getTileSize(this.iconsheet);

    tsize = (tsize*dpi);
    g.font = font.genCSS(tsize);

    g.lineWidth = 2;
    g.strokeStyle = this.getDefault("TabStrokeStyle1");

    let r = this.r*dpi;
    this._layout();
    let tab;

    let ti = -1;
    for (tab of this.tabs) {
      ti++;

      if (tab === this.tabs.active)
        continue;

      let x = tab.pos[0], y = tab.pos[1];
      let w = tab.size[0], h = tab.size[1];
      //let tw = g.measureText(tab.name).width;
      let tw = ui_base.measureText(this, tab.name, this.canvas, g, tsize, font).width;

      let x2 = x + (tab.size[this.horiz ^ 1] - tw)*0.5;
      let y2 = y + tsize;

      if (tab === this.tabs.highlight) {
        let p = 2;

        g.beginPath();
        g.rect(x + p, y + p, w - p*2, h - p*2);
        g.fillStyle = this.getDefault("TabHighlight");
        g.fill();
      }

      g.fillStyle = this.getDefault("TabText").color;

      if (!this.horiz) {
        let x3 = 0, y3 = y2;

        g.save();
        g.translate(x3, y3);
        g.rotate(Math.PI/2);
        g.translate(x3 - tsize, -y3 - tsize*0.5);
      }

      if (tab.icon !== undefined) {
        iconmanager.canvasDraw(this, this.canvas, g, tab.icon, x, y, this.iconsheet);
        x2 += iconsize + 4;
      }

      g.fillText(tab.name, x2, y2);

      if (!this.horiz) {
        g.restore();
      }

      let prev = this.tabs[Math.max(ti - 1 + this.tabs.length, 0)];
      let next = this.tabs[Math.min(ti + 1, this.tabs.length - 1)];

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

    let th = tsize;

    //draw active tab
    tab = this.tabs.active;
    if (tab) {
      let x = tab.pos[0], y = tab.pos[1];
      let w = tab.size[0], h = tab.size[1];
      //let tw = g.measureText(tab.name).width;
      let tw = ui_base.measureText(this, tab.name, this.canvas, g, tsize, font).width;

      if (this.horiz) {
        h += 2;
      } else {
        w += 2;
      }

      let x2 = x + (tab.size[this.horiz ^ 1] - tw)*0.5;
      let y2 = y + tsize;

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
        let ypad = 2;

        g.strokeStyle = this.getDefault("TabStrokeStyle2");
        g.fillStyle = activecolor;
        let r2 = r*1.5;

        if (this.horiz) {
          g.moveTo(x - r, h);
          g.quadraticCurveTo(x, h, x, h - r);
          g.lineTo(x, r2);
          g.quadraticCurveTo(x, ypad, x + r2, ypad)
          g.lineTo(x + w - r2, ypad);
          g.quadraticCurveTo(x + w, 0, x + w, r2);
          g.lineTo(x + w, h - r2);
          g.quadraticCurveTo(x + w, h, x + w + r, h);

          g.stroke()
          //
          g.closePath()
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
          g.stroke()
          //
          g.closePath()
        }

        let cw = this.horiz ? this.canvas.width : this.canvas.height;

        let worig = g.lineWidth;

        g.lineWidth *= 0.5;

        g.fill();
        //g.stroke();

        g.lineWidth = worig;

        if (!this.horiz) {
          let x3 = 0, y3 = y2;

          g.save();
          g.translate(x3, y3);
          g.rotate(Math.PI/2);
          g.translate(-x3 - tsize, -y3 - tsize*0.5);
        }

        g.fillStyle = this.getDefault("TabText").color;

        //y2 += tsize*0.3;
        g.fillText(tab.name, x2, y2);

        if (!this.horiz) {
          g.restore();
        }

        if (!this.horiz) {
          //g.restore();
        }
      }
    }
  }

  removeTab(tab) {
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

    let r = this.getDefault("TabBarRadius");
    r = r !== undefined ? r : 3;

    this.style["touch-action"] = "none";


    this.canvas.style["background-color"] = this.getDefault("TabInactive");
    this.canvas.style["border-radius"] = r + "px";
    //this.style["background-color"] = this.getDefault("TabInactive");
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

  update(force_update = false) {
    let rect = this.getClientRects()[0];
    if (rect) {
      let key = Math.floor(rect.x*4.0) + ":" + Math.floor(rect.y*4.0);
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

UIBase.internalRegister(TabBar);

export class TabContainer extends UIBase {
  constructor() {
    super();

    this._last_style_key = "";

    this.dataPrefix = "";

    this.inherit_packflag = 0;
    this.packflag = 0;

    this.tabFontScale = 1.0;

    this.tbar = UIBase.createElement("tabbar-x");
    this.tbar.parentWidget = this;
    this.tbar.setAttribute("class", "_tbar_" + this._id);
    this.tbar.constructor.setDefault(this.tbar);
    this.tbar.tabFontScale = this.tabFontScale;

    this._remakeStyle();

    this.tabs = {};

    this._last_horiz = undefined;
    this._last_bar_pos = undefined;
    this._tab = undefined;

    let div = document.createElement("div");
    div.setAttribute("class", `_tab_${this._id}`);
    div.appendChild(this.tbar);
    this.shadow.appendChild(div);

    this.tbar.parentWidget = this;

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

      this._tab.parentWidget = this;

      //ensure we get full update convergence when switching
      //tabs
      for (let i = 0; i < 2; i++) {
        this._tab.flushUpdate();
      }

      let div = document.createElement("div");

      this.tbar.setCSS.once(() => div.style["background-color"] = this.getDefault("background-color"), div);

      div.setAttribute("class", `_tab_${this._id}`);
      div.appendChild(this._tab);

      //XXX why is this necassary?
      //this._tab.style["margin-left"] = "40px";
      this.shadow.appendChild(div);

      if (this.onchange) {
        this.onchange(tab, event);
      }
    }
  }

  get movableTabs() {
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

  set movableTabs(val) {
    val = !!val;

    this.setAttribute("movable-tabs", val ? "true" : "false");
    this.tbar.movableTabs = this.movableTabs;
  }

  get hideScrollBars() {
    let attr = ("" + this.getAttribute("hide-scrollbars")).toLowerCase();
    return attr === "true" || attr === "yes";
  }

  set hideScrollBars(val) {
    val = !!val;

    this.setAttribute("hide-scrollbars", "" + val);
  }

  static setDefault(e) {
    e.setAttribute("bar_pos", "top");

    return e;
  }

  static define() {
    return {
      tagname: "tabcontainer-x",
      style  : "tabs"
    };
  }

  _startMove(tab=this.tbar.tabs.active, event) {
    return this.tbar._startMove(tab, event);
  }

  _ensureNoModal() {
    return this.tbar._ensureNoModal();
  }

  saveData() {
    let json = super.saveData() || {};
    json.tabs = {};

    for (let k in this.tabs) {
      let tab = this.tabs[k];

      if (k === this.tbar.tabs.active.id) {
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

  loadData(json) {
    if (!json.tabs) {
      return;
    }

    for (let k in json.tabs) {
      if (!(k in this.tabs)) {
        continue;
      }

      let uidata = JSON.stringify(json.tabs[k]);
      loadUIData(this.tabs[k], uidata);
    }
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
    let horiz = this.tbar.horiz;
    let display = "flex";
    let flexDir = !horiz ? "row" : "column";
    let bgcolor = this.__background; //this.getDefault("background-color");

    //display = "inline" //XXX
    let style = document.createElement("style");
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

    if (this._style)
      this._style.remove();
    this._style = style;

    this.shadow.prepend(style);
  }

  icontab(icon, id, tooltip) {
    let t = this.tab("", id, tooltip);
    t._tab.icon = icon;

    return t;
  }

  removeTab(tab) {
    let tab2 = tab._tab;
    this.tbar.removeTab(tab2);
    tab.remove();
  }

  tab(name, id = undefined, tooltip = undefined, movable = true) {
    if (id === undefined) {
      id = tab_idgen++;
    }

    let col = UIBase.createElement("colframe-x");

    this.tabs[id] = col;

    col.dataPrefix = this.dataPrefix;

    col.ctx = this.ctx;
    col._tab = this.tbar.addTab(name, id, tooltip, movable);

    col.inherit_packflag |= this.inherit_packflag;
    col.packflag |= this.packflag;

    //let cls = this.tbar.horiz ? ui.ColumnFrame : ui.RowFrame;

    col.parentWidget = this;

    if (col.ctx) {
      col._init();
    }

    col.setCSS();

    if (this._tab === undefined) {
      this.setActive(col);
    }

    col.noSwitch = function () {
      this._tab.noSwitch = true;
      return this;
    }

    function defineTabEvent(key) {
      key = "on" + key;

      Object.defineProperty(col, key, {
        get() {
          return this._tab[key];
        },
        set(v) {
          this._tab[key] = v;
        }
      });
    }

    defineTabEvent("tabclick");
    defineTabEvent("tabdragmove");
    defineTabEvent("tabdragstart");
    defineTabEvent("tabdragend");

    return col;
  }

  setActive(tab) {
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

  moveTab(tab, i) {
    tab = tab._tab;

    let tab2 = this.tbar.tabs[i];

    if (tab !== tab2) {
      this.tbar.swapTabs(tab, tab2);
    }

    this.tbar.setCSS();
    this.tbar._layout();
    this.tbar._redraw();
  }

  getTab(name_or_id) {
    if (name_or_id in this.tabs) {
      return this.tabs[name_or_id];
    }

    for (let k in this.tabs) {
      let t = this.tabs[k];

      if (t.name === name_or_id) {
        return t;
      }
    }

    throw new Error("Unknown tab " + name_or_id);
  }

  updateBarPos() {
    let barpos = this.getAttribute("bar_pos");

    if (barpos !== this._last_bar_pos) {
      this.horiz = barpos === "top" || barpos === "bottom";
      this._last_bar_pos = barpos;

      this.tbar.setAttribute("bar_pos", barpos);
      this.tbar.update(true);
      this.update();
    }
  }

  updateHoriz() {
    let horiz = this.tbar.horiz;

    if (this._last_horiz !== horiz) {
      this._last_horiz = horiz;
      this._remakeStyle();
    }
  }

  updateStyle() {
    let key = "" + this.getDefault("background-color");

    if (key !== this._last_style_key) {
      this._last_style_key = key;
      this.setCSS();
    }
  }

  getActive() {
    return this.tbar.tabs.active;
  }

  update() {
    super.update();

    this.tbar.movableTabs = this.movableTabs;

    if (this._tab !== undefined) {
      this._tab.update();
    }

    this.style["display"] = "flex";
    this.style["flex-direction"] = !this.horiz ? "row" : "column";

    this.tbar.tabFontScale = this.tabFontScale;

    this.updateStyle();
    this.updateHoriz();
    this.updateBarPos();
    this.tbar.update();

    let act = this.tbar.tabs.active;

    if (act && !this.hideScrollBars) {
      let container = this.tabs[act.id];

      //propegate overflow-y to tab container as a whole

      if (container.hasAttribute("overflow-y") && this.style["overflow-y"] !== container.getAttribute("overflow-y")) {
        this.style["overflow-y"] = container.getAttribute("overflow-y");
        //container.style["overflow-y"] = "unset";
      } else if (!container.hasAttribute("overflow-y")) {
        this.style["overflow-y"] = this.getDefault("overflow-y") || "unset";
      }

      if (container.hasAttribute("overflow") && this.style["overflow"] !== container.getAttribute("overflow")) {
        this.style["overflow"] = container.getAttribute("overflow");
        //container.style["overflow-y"] = "unset";
      } else if (!container.hasAttribute("overflow")) {
        this.style["overflow"] = this.getDefault("overflow") || "unset";
      }
    } else if (this.hideScrollBars) {
      this.style["overflow"] = this.style["overflow-y"] = "unset";
    }
  }
}

UIBase.internalRegister(TabContainer);
