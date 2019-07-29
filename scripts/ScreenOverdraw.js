"use strict";
let SVG_URL = 'http://www.w3.org/2000/svg';

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from './ui_base.js';
import * as ui from './ui.js';
import * as events from './events.js';

let Vector2 = vectormath.Vector2;

export class Overdraw extends ui_base.UIBase {
  constructor() {
    super();
    
    this.screen = undefined;
    this.shapes = [];
    this.otherChildren = []; //non-svg elements
    
    let style = document.createElement("style")
    style.textContent = `
      .overdrawx {
        pointer-events : none;
      }
    `;
    
    this.shadow.appendChild(style);
    
    this.zindex_base = 100;
  }
  
  start(screen) {
    this.screen = screen;
    this.ctx = screen.ctx;
    
    screen.parentNode.appendChild(this);
    
    this.style["display"] = "float";
    this.style["z-index"] = this.zindex_base;
    
    this.style["position"] = "absolute";
    this.style["left"] = "0px";
    this.style["top"] = "0px";
    
    this.style["width"] = "100%" //screen.size[0] + "px";
    this.style["height"] = "100%" //screen.size[1] + "px";
    
    this.style["pointer-events"] = "none";
    
    this.svg = document.createElementNS(SVG_URL, "svg");
    this.svg.style["width"] = "100%";
    this.svg.style["height"] = "100%";
    
    this.shadow.appendChild(this.svg);
    
    //this.style["background-color"] = "green";
  }
  
  clear() {
    for (let child of list(this.svg.childNodes)) {
      child.remove();
    }
    
    for (let child of this.otherChildren) {
      child.remove();
    }
    
    this.otherChildren.length = 0;
  }
  
  line(v1, v2, color="black") {
    let line = document.createElementNS(SVG_URL, "line");
    line.setAttribute("x1", v1[0]);
    line.setAttribute("y1", v1[1]);
    line.setAttribute("x2", v2[0]);
    line.setAttribute("y2", v2[1]);
    line.setAttribute("style", `stroke:${color};stroke-width:2`);
    
    this.svg.appendChild(line);
    return line;
  }
  
  rect(p, size, color="black") {
    let line = document.createElementNS(SVG_URL, "rect");
    line.setAttribute("x", p[0]);
    line.setAttribute("y", p[1]);
    line.setAttribute("width", size[0]);
    line.setAttribute("height", size[1]);
    line.setAttribute("style", `fill:${color};stroke-width:2`);

    this.svg.appendChild(line);
    return line;
  }
  
  end() {
    this.clear();
    this.remove();
  }
  
  static define() {return {
    tagname : "overdraw-x"
  };}
}

ui_base.UIBase.register(Overdraw);
