"use strict";
let SVG_URL = 'http://www.w3.org/2000/svg';

import * as util from './util.js';
import * as vectormath from './vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ui from '../core/ui.js';
import * as math from './math.js';

let Vector2 = vectormath.Vector2;

export class CanvasOverdraw extends ui_base.UIBase {
  constructor() {
    super();

    this.canvas = document.createElement("canvas");
    this.shadow.appendChild(this.canvas);
    this.g = this.canvas.getContext("2d");

    this.screen = undefined;
    this.shapes = [];
    this.otherChildren = []; //non-svg elements
    this.font = undefined;

    let style = document.createElement("style")
    style.textContent = `
      .overdrawx {
        pointer-events : none;
      }
    `;

    this.shadow.appendChild(style);
  }

  static define() {
    return {
      tagname : 'screen-overdraw-canvas-x'
    }
  }

  startNode(node, screen) {
    if (screen) {
      this.screen = screen;
      this.ctx = screen.ctx;
    }

    if (!this.parentNode) {
      node.appendChild(this);
    }

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

    this.svg.style["pointer-events"] = "none";

    this.shadow.appendChild(this.svg);
    //this.style["background-color"] = "green";
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

    this.style["width"] = screen.size[0] + "px";
    this.style["height"] = screen.size[1] + "px";

    this.style["pointer-events"] = "none";

    this.svg = document.createElementNS(SVG_URL, "svg");
    this.svg.style["width"] = "100%";
    this.svg.style["height"] = "100%";

    this.shadow.appendChild(this.svg);

    //this.style["background-color"] = "green";
  }
}

export class Overdraw extends ui_base.UIBase {
  constructor() {
    super();

    this.visibleToPick = false;

    this.screen = undefined;
    this.shapes = [];
    this.otherChildren = []; //non-svg elements
    this.font = undefined;

    let style = document.createElement("style")
    style.textContent = `
      .overdrawx {
        pointer-events : none;
      }
    `;
    
    this.shadow.appendChild(style);
    
    this.zindex_base = 1000;
  }

  startNode(node, screen) {
    if (screen) {
      this.screen = screen;
      this.ctx = screen.ctx;
    }

    if (!this.parentNode) {
      node.appendChild(this);
    }

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

    this.svg.style["pointer-events"] = "none";

    this.shadow.appendChild(this.svg);
    //this.style["background-color"] = "green";
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
    
    this.style["width"] = screen.size[0] + "px";
    this.style["height"] = screen.size[1] + "px";
    
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

  drawTextBubbles(texts, cos, colors) {
    let boxes = [];
    let elems = [];

    let cent = new Vector2();

    for (let i=0; i<texts.length; i++) {
      let co = cos[i];
      let text = texts[i];
      let color;

      if (colors !== undefined) {
        color = colors[i];
      }

      cent.add(co);
      let box = this.text(texts[i], co[0], co[1], {color : color});

      boxes.push(box);
      let font = box.style["font"];
      let pat = /[0-9]+px/;
      let size = font.match(pat)[0];

      //console.log("size", size);

      if (size === undefined) {
        size = this.getDefault("DefaultText").size;
      } else {
        size = ui_base.parsepx(size);
      }

      //console.log(size);
      let tsize = ui_base.measureTextBlock(this, text, undefined, undefined, size, font);

      box.minsize = [
        ~~tsize.width,
        ~~tsize.height
      ];

      let pad = ui_base.parsepx(box.style["padding"]);

      box.minsize[0] += pad*2;
      box.minsize[1] += pad*2;

      let x = ui_base.parsepx(box.style["left"]);
      let y = ui_base.parsepx(box.style["top"]);

      box.grads = new Array(4);
      box.params = [x, y, box.minsize[0], box.minsize[1]];
      box.startpos = new Vector2([x, y]);

      box.setCSS = function() {
        this.style["padding"] = "0px";
        this.style["margin"] = "0px";
        this.style["left"] = ~~this.params[0] + "px";
        this.style["top"] = ~~this.params[1] + "px";
        this.style["width"] = ~~this.params[2] + "px";
        this.style["height"] = ~~this.params[3] + "px";
      };

      box.setCSS();
      //console.log(box.params);
      elems.push(box);
    }

    if (boxes.length === 0) {
      return;
    }

    cent.mulScalar(1.0 / boxes.length);

    function error() {
      let p1 = [0, 0], p2 = [0, 0];
      let s1 = [0, 0], s2 = [0, 0];

      let ret = 0.0;

      for (let box1 of boxes) {
        for (let box2 of boxes) {
          if (box2 === box1) {
            continue;
          }

          s1[0] = box1.params[2];
          s1[1] = box1.params[3];
          s2[0] = box2.params[2];
          s2[1] = box2.params[3];

          let overlap = math.aabb_overlap_area(box1.params, s1, box2.params, s2);
          ret += overlap;
        }

        ret += box1.startpos.vectorDistance(box1.params)*0.25;
      }

      return ret;
    }

    function solve() {
      //console.log("ERROR", error());
      let r1 = error();
      if (r1 === 0.0) {
        return;
      }

      let df = 0.0001;
      let totgs = 0.0;

      for (let box of boxes) {
        for (let i=0; i<box.params.length; i++) {
          let orig = box.params[i];
          box.params[i] += df;
          let r2 = error();
          box.params[i] = orig;

          box.grads[i] = (r2 - r1) / df;
          totgs += box.grads[i]**2;
        }
      }

      if (totgs === 0.0) {
        return;
      }

      r1 /= totgs;
      let k = 0.4;

      for (let box of boxes) {
        for (let i = 0; i < box.params.length; i++) {
          box.params[i] += -r1*box.grads[i]*k;
        }

        box.params[2] = Math.max(box.params[2], box.minsize[0]);
        box.params[3] = Math.max(box.params[3], box.minsize[1]);

        box.setCSS();
      }
    }

    for (let i=0; i<15; i++) {
      solve();
    }

    for (let box of boxes) {
      elems.push(this.line(box.startpos, box.params));
    }

    return elems;
  }

  text(text, x, y, args={}) {
    args = Object.assign({}, args);

    if (args.font === undefined) {
      if (this.font !== undefined)
        args.font = this.font;
      else
        args.font = this.getDefault("DefaultText").genCSS();
    }

    if (!args["background-color"]) {
      args["background-color"] = "rgba(75, 75, 75, 0.75)";
    }

    args.color = args.color ? args.color : "white";
    if (typeof args.color === "object") {
      args.color = ui_base.color2css(args.color);
    }

    args["padding"] = args["padding"] === undefined ? "5px" : args["padding"];
    args["border-color"] = args["border-color"] ? args["border-color"] : "grey";
    args["border-radius"] = args["border-radius"] ? args["border-radius"] : "25px";
    args["border-width"] = args["border-width"] !== undefined ? args["border-width"] : "2px";

    if (typeof args["border-width"] === "number") {
      args["border-width"] = "" + args["border-width"] + "px";
    }
    if (typeof args["border-radius"] === "number") {
      args["border-radius"] = "" + args["border-radius"] + "px";
    }

      //not sure I need SVG for this. . .
    let box = document.createElement("div")

    box.setAttribute("class", "overdrawx");

    box.style["position"] = "absolute";
    box.style["width"] = "min-contents";
    box.style["height"] = "min-contents";
    box.style["border-width"] = args["border-width"]
    box.style["border-radius"] = "25px";
    box.style["pointer-events"] = "none";
    box.style["z-index"] = this.zindex_base + 1;
    box.style["background-color"] = args["background-color"];
    box.style["padding"] = args["padding"];

    box.style["left"] = x + "px";
    box.style["top"] = y + "px";

    box.style["display"] = "flex";
    box.style["justify-content"] = "center";
    box.style["align-items"] = "center";

    box.innerText = text;
    box.style["font"] = args.font;
    box.style["color"] = args.color;

    this.otherChildren.push(box);
    this.shadow.appendChild(box);

    return box;
  }

  circle(p, r, stroke="black", fill="none") {
    let circle = document.createElementNS(SVG_URL, "circle");
    circle.setAttribute("cx", p[0]);
    circle.setAttribute("cy", p[1]);
    circle.setAttribute("r", r);

    if (fill) {
      circle.setAttribute("style", `stroke:${stroke};stroke-width:2;fill:${fill}`);
    } else {
      circle.setAttribute("style", `stroke:${stroke};stroke-width:2`);
    }

    this.svg.appendChild(circle);

    return circle;
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

    line.setColor = (color) => {
      line.setAttribute("style", `fill:${color};stroke-width:2`);
    };

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

ui_base.UIBase.internalRegister(Overdraw);
