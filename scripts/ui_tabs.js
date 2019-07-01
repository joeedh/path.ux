"use strict";

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as events from './events.js';
import * as ui from './ui.js';

let UIBase = ui_base.UIBase, 
    PackFlags = ui_base.PackFlags,
    IconSheets = ui_base.IconSheets;

export let tab_idgen = 1;
let debug = false;

function getpx(css) {
  return parseFloat(css.trim().replace("px", ""))
}

export class TabItem {
  constructor(name, id, tooltip="") {
    this.name = name;
    this.id = id;
    this.tooltip = tooltip;
    
    this.size = [0, 0];
    this.pos = [0, 0];
  }
}

export class ModalTabMove extends events.EventHandler {
  constructor(tab, tbar, dom) {
    super();
    
    this.dom = dom;
    this.tab = tab;
    this.tbar = tbar;
    
    this.mpos = undefined;
  }
  
  finish() {
    if (debug) if (debug) console.log("finish");
    
    this.tbar.tool = undefined;
    this.popModal(this.dom);
    this.tbar.update(true);
  }
  
  on_mousedown(e) {
    if (debug) console.log("yay");
    
    this.finish();
  }
  
  on_touchstart(e) {
    this.finish();
  }
  
  on_touchend(e) {
    this.finish();
  }
  
  on_mouseup(e) {
    this.finish();
  }
  
  on_mousemove(e) {
    if (debug) console.log("SFSDFSD");
    return this._on_move(e, e.x, e.y);
  }
  
  on_touchmove(e) {
    if (e.touches.length == 0)
      return;
    
    let x = e.touches[0].pageX;
    let y = e.touches[0].pageY;
    
    return this._on_move(e, x, y);
  }
  
  _on_move(e, x, y) {
    let r = this.tbar.getClientRects()[0];
    let dpi = UIBase.getDPI();

    x -= r.x;
    y -= r.y;
    
    let dx, dy;
    
    x *= dpi;
    y *= dpi;
    
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
    
    if (tbar.horiz) {
      tab.pos[0] += dx;
    } else {
      tab.pos[1] += dy;
    }
    
    let ti = tbar.tabs.indexOf(tab);
    let next = ti < tbar.tabs.length-1 ? tbar.tabs[ti+1] : undefined;
    let prev = ti > 0 ? tbar.tabs[ti-1] : undefined;
    
    if (next !== undefined && tab.pos[axis] > next.pos[axis]) {
      tbar.swapTabs(tab, next);
    } else if (prev !== undefined && tab.pos[axis] < prev.pos[axis]+prev.size[axis]*0.5) {
      tbar.swapTabs(tab, prev);
    }
    
    tbar.update(true);
    
    this.mpos[0] = x;
    this.mpos[1] = y;
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
    
    this.tabs = [];
    this.tabs.active = undefined;
    this.tabs.highlight = undefined;

    this._last_bgcolor = undefined;

    canvas.style["width"] = "145px";
    canvas.style["height"] = "45px";
    
    this.r = 5;
    
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    
    style.textContent = `
    `;
    
    this.shadow.appendChild(style);
    this.shadow.appendChild(canvas);
    
    this._last_dpi = undefined;
    this._last_pos = undefined;
    
    this.horiz = true;
    this.onchange = undefined;
    
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
      
      let dpi = ui_base.UIBase.getDPI();
      
      mx *= dpi;
      my *= dpi;
      
      do_element(e);
    }
    
    let do_touch = (e) => {
      let r = this.canvas.getClientRects()[0];
      
      if (debug) console.log(e.touches);
      
      mx = e.touches[0].pageX - r.x;
      my = e.touches[0].pageY - r.y;
      
      let dpi = ui_base.UIBase.getDPI();
      
      mx *= dpi;
      my *= dpi;
      
      do_element(e);
    }
    
    this.canvas.addEventListener("mousemove", (e) => {
      if (debug) console.log("yay");
      
      let r = this.canvas.getClientRects()[0];
      do_mouse(e);
      
      e.preventDefault();
      e.stopPropagation();
    }, false);
    
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length == 0) {
        return;
      }
      
      do_touch(e);
      
      let ht = this.tabs.highlight;
      
      if (ht !== undefined && this.tool === undefined) {
        this.setActive(ht);

        let edom = this.getScreen();
        let tool = new ModalTabMove(ht, this, edom);
        this.tool = tool;
        
        tool.pushModal(edom, false);
      }
      
      e.preventDefault();
      e.stopPropagation();
    }, false);
    
    this.canvas.addEventListener("mousedown", (e) => {
      do_mouse(e);

      if (debug) console.log("mdown");

      if (e.button !== 0) {
        return;
      }
      
      let ht = this.tabs.highlight;
      
      if (ht !== undefined && this.tool === undefined) {
        this.setActive(ht);
        
        let edom = this.getScreen();
        let tool = new ModalTabMove(ht, this, edom);
        this.tool = tool;
        
        tool.pushModal(edom, false);
      }
      
      e.preventDefault();
      e.stopPropagation();
    }, false);
  }
  
  getTab(name) {
    for (let tab of this.tabs) {
      if (tab.name === name)
        return tab;
    }
    
    return undefined;
  }
  
  saveData() {
    let taborder = [];
    
    for (let tab of this.tabs) {
      taborder.push(tab.name);
    }
    
    let act = this.tabs.active !== undefined ? this.tabs.active.name : "null";
    
    return {
      taborder : taborder,
      active : act
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

    if (active !== undefined) {
      this.setActive(active);
    } else {
      this.setActive(this.tabs[0]);
    }

    this.update(true);
    
    return this;
  }
  
  static setDefault(e) {
    e.setAttribute("bar_pos", "top");
    e.updatePos(true);
    
    return e;
  }
  
  swapTabs(a, b) {
    let tabs = this.tabs;
    
    let ai = tabs.indexOf(a);
    let bi = tabs.indexOf(b);
    
    tabs[ai] = b;
    tabs[bi] = a;
    
    this.update(true);
  }
  
  addTab(name, id, tooltip="") {
    this.tabs.push(new TabItem(name, id, tooltip));
    this.update(true);
    
    if (this.tabs.length == 1) {
      this.setActive(this.tabs[0]);
    }
  }
  
  updatePos(force_update=false) {
    let pos = this.getAttribute("bar_pos");
    
    if (pos != this._last_pos || force_update) {
      this._last_pos = pos;
      
      this.horiz = pos == "top" || pos == "bottom";
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
  
  updateDPI(force_update=false) {
    let dpi = UIBase.getDPI();
    
    if (dpi !== this._last_dpi) {
      if (debug) console.log("DPI update!");
      this._last_dpi = dpi;
      
      this.updateCanvas(true);
    }
  }
  
  updateCanvas(force_update=false) {
    let canvas = this.canvas;
     
    let dpi = UIBase.getDPI();
    
    let rwidth = getpx(this.canvas.style["width"]);
    let rheight = getpx(this.canvas.style["height"]);
    
    let width = Math.ceil(rwidth*dpi);
    let height = Math.ceil(rheight*dpi);
    
    let update = force_update;
    if (this.horiz) {
      update = update || canvas.width != width;
    } else {
      update = update || canvas.height != height;
    }
    
    if (update) {
      canvas.width = width;
      canvas.height = height;
      
      this._redraw();
    }
  }
  
  _layout() {
    let g = this.g;
    
    if (debug) console.log("tab layout");
    
    let dpi = UIBase.getDPI();
    let tsize = this.getDefault("TabTextSize")*1;
    
    g.font = ui_base._getFont(tsize, "TabText");
    
    let axis = this.horiz ? 0 : 1;
    
    let pad = 4*dpi + Math.ceil(tsize*dpi*0.25);
    let x = pad;
    let y = 0;
    
    let h = tsize*dpi + Math.ceil(tsize*dpi*0.5);
    
    for (let tab of this.tabs) {
      let w = g.measureText(tab.name).width//*dpi;
      
      //don't interfere with tab dragging
      let bad = this.tool !== undefined && tab === this.tabs.active;
      
      if (!bad) {
        tab.pos[axis] = x;
        tab.pos[axis^1] = y;
      }
      
      //tab.size = [0, 0];
      tab.size[axis] = w+pad*2;
      tab.size[axis^1] = h;
      
      x += w + pad*2;
    }
    
    if (this.horiz) {
      this.canvas.style["width"] = Math.ceil(x/dpi + pad/dpi) + "px";
      this.canvas.style["height"] = Math.ceil(h/dpi) + "px";
    } else {
      this.canvas.style["height"] = Math.ceil(x/dpi + pad/dpi) + "px";
      this.canvas.style["width"] = Math.ceil(h/dpi) + "px";
    }
    
    //this.canvas.width = x;
  }
  
  setActive(tab) {
    let update = tab !== this.tabs.active;
    this.tabs.active = tab;
    
    if (update) {
      if (this.onchange)
        this.onchange(tab);
      
      this.update(true);
    }
  }
  
  _redraw() {
    let g = this.g;
    let bgcolor = this.getDefault("DefaultPanelBG");
    
    if (debug) console.log("tab draw");
    
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    g.beginPath();
    g.rect(0, 0, this.canvas.width, this.canvas.height);
    g.fillStyle = bgcolor;
    g.fill();
    
    let dpi = UIBase.getDPI();
    let tsize = this.getDefault("TabTextSize");
    
    g.font = ui_base._getFont(tsize, "TabText");
    tsize *= dpi;
    
    g.lineWidth = 2;
    g.strokeStyle = this.getDefault("TabStrokeStyle1");
      
    let r = this.r;
    this._layout();
    
    for (let tab of this.tabs) {
      if (tab === this.tabs.active)
        continue;

      let x = tab.pos[0], y = tab.pos[1];
      let w = tab.size[0], h = tab.size[1];
      let tw = g.measureText(tab.name).width;
      
      let x2 = x + (tab.size[this.horiz^1]-tw)*0.5;
      let y2 = y + tsize*1.0;
      
      g.beginPath();
      g.rect(x, y, w, h);
      g.fillStyle = this.getDefault("TabInactive");
      g.fill();
        
      if (tab === this.tabs.highlight) {
        let p = 2;
        
        g.beginPath();
        g.rect(x+p, y+p, w-p*2, h-p*2);
        g.fillStyle = this.getDefault("TabHighlight");
        g.fill();
      }
        
      g.fillStyle = this.getDefault("TabTextColor");
      
      if (!this.horiz) {
        let x3 = 0, y3 = y2;
        
        g.save();
        g.translate(x3, y3);
        g.rotate(Math.PI/2);
        g.translate(x3-tsize, -y3-tsize*0.5);
      }
      
      g.fillText(tab.name, x2, y2);
      
      if (!this.horiz) {
        g.restore();
      }
      
      if (tab !== this.tabs[this.tabs.length-1]) {
        g.beginPath();
        g.moveTo(x+w, h-5);
        g.lineTo(x+w, 5);
        g.strokeStyle = this.getDefault("TabStrokeStyle2");
        g.stroke();
      }
    }
    
    let th = tsize;
    
    //draw active tab
    let tab = this.tabs.active;
    if (tab === undefined) {
      return;
    } else {
      let x = tab.pos[0], y = tab.pos[1];
      let w = tab.size[0], h = tab.size[1];
      let tw = g.measureText(tab.name).width;
      
      let x2 = x + (tab.size[this.horiz^1]-tw)*0.5;
      let y2 = y + tsize*1.0;
      
      g.beginPath();
      g.rect(x, y, w, h);
      g.fillStyle = bgcolor;
      g.fill();
      
      if (!this.horiz) {
        let x3 = 0, y3 = y2;
        
        g.save();
        g.translate(x3, y3);
        g.rotate(Math.PI/2);
        g.translate(-x3-tsize, -y3-tsize*0.5);
      }
      
      g.fillStyle = this.getDefault("TabTextColor");
      g.fillText(tab.name, x2, y2);

      if (!this.horiz) {
        g.restore();
      }
      
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
        if (this.horiz) {
          g.moveTo(0, h);
          g.lineTo(x-r, h);
          g.lineTo(x, h-r);
          g.lineTo(x, r);
          g.lineTo(x+r, 0);
          g.lineTo(x+w-r, 0);
          g.lineTo(x+w, r);
          g.lineTo(x+w, h-r);
          g.lineTo(x+w+r, h);
          g.lineTo(this.canvas.width, h);
        } else {
          g.moveTo(w, 0);
          g.lineTo(w, y-r);
          g.lineTo(w-r, y);
          g.lineTo(r, y);
          g.lineTo(0, y+r);
          g.lineTo(0, y+h-r);
          g.lineTo(r, y+h);
          g.lineTo(w-r, y+h);
          g.lineTo(w, y+h+r);
          
          g.lineTo(w, this.canvas.height);
        }
        
        let cw = this.horiz ? this.canvas.width : this.canvas.height;
        
        g.stroke();
        

        if (!this.horiz) {
          //g.restore();
        }
      }
    }
  }

  updateStyle() {
    if (this._last_bgcolor != this.getDefault("DefaultPanelBG")) {
      this._last_bgcolor = this.getDefault("DefaultPanelBG");

      this._redraw();
    }
  }

  update(force_update=false) {
    super.update();

    this.updateStyle();
    this.updatePos(force_update);
    this.updateDPI(force_update);
    this.updateCanvas(force_update);
  }
  
  static define() {return {
    tagname : "tabbar-x"
  };}
}
UIBase.register(TabBar);

export class TabContainer extends UIBase {
  constructor() {
    super();
    
    this.dom = document.createElement("ul");
    this.dom.setAttribute("class", `_tab_ul_${this._id}`);
    
    this.tbar = document.createElement("tabbar-x");
    this.tbar.setAttribute("class", "_tbar_" + this._id);
    this.tbar.constructor.setDefault(this.tbar);
    
    this._remakeStyle();
    this.shadow.appendChild(this.dom);

    this.tabs = {};
    
    this._last_horiz = undefined;
    this._last_bar_pos = undefined;
    this._tab = undefined;

    let li = document.createElement("li");
    li.setAttribute("class", `_tab_li_${this._id}`);
    li.appendChild(this.tbar);
    this.dom.appendChild(li);

    this.tbar.onchange = (tab) => {
      if (this._tab) {
        this._tab.remove();
      }
      
      this._tab = this.tabs[tab.id];
      //this._tab = document.createElement("div");
      //this._tab.innerText = "SDfdsfsdyay";
      
      let li = document.createElement("li");
      li.style["background-color"] = this.getDefault("DefaultPanelBG");
      li.setAttribute("class", `_tab_li_${this._id}`);
      li.appendChild(this._tab);
      
      //XXX why is this necassary?
      //this._tab.style["margin-left"] = "40px";
      this.dom.appendChild(li);
    }
  }
  
  static setDefault(e) {
    e.setAttribute("bar_pos", "top");
    
    return e;
  }
  
  _remakeStyle() {
    let horiz = this.tbar.horiz;
    let display = !horiz ? "inline-block" : "block";
    
    //display = "inline" //XXX
    let style = document.createElement("style");
    style.textContent = `
      ._tab_ul_${this._id} {
        list-style-type : none;
        display : ${display};
        margin : 0px;
        padding : 0px;
        ${!horiz ? "vertical-align : top;" : ""}
      }
      
      ._tab_li_${this._id} {
        display : ${display};
        margin : 0px;
        padding : 0px;
        align-self : flex-start;
        ${!horiz ? "vertical-align : top;" : ""}
      }
      
      ._tbar_${this._id} {
        list-style-type : none;
        align-self : flex-start;
        ${!horiz ? "vertical-align : top;" : ""}
      }
    `;
    
    if (this._style)
      this._style.remove();
    this._style = style;
    
    this.shadow.prepend(style);
  }
  
  tab(name, id=undefined, tooltip=undefined) {
    if (id === undefined) {
      id = tab_idgen++;
    }
    
    let col = document.createElement("colframe-x");

    this.tabs[id] = col;
    col.ctx = this.ctx;

    this.tbar.addTab(name, id, tooltip);
    //let cls = this.tbar.horiz ? ui.ColumnFrame : ui.RowFrame;

    col.parentWidget = this;
    col.setCSS();

    if (this._tab === undefined) {
      this.setActive(col);
    }

    return col;
  }
  
  updateBarPos() {
    let barpos = this.getAttribute("bar_pos");
    
    if (barpos !== this._last_bar_pos) {
      console.log("position update!", barpos);
      
      this.horiz = barpos == "top" || barpos == "bottom";
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
  
  update() {
    super.update();
    
    if (this._tab !== undefined) {
      this._tab.update();
    }
    
    this.updateHoriz();
    this.updateBarPos();
    this.tbar.update();
  }
  
  static define() {return {
    tagname : "tabcontainer-x"
  };}
}

UIBase.register(TabContainer);
