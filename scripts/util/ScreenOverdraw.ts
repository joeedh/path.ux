"use strict";
export const SVG_URL = "http://www.w3.org/2000/svg";

import * as util from "./util";
import * as vectormath from "./vectormath";
import * as ui_base from "../core/ui_base";
import * as ui from "../core/ui";
import * as math from "./math";
import { IContextBase } from "../core/context_base";
import type { Screen } from "../screen/FrameManager";

const Vector2 = vectormath.Vector2;

interface TextArgs {
  font?: string;
  "background-color"?: string;
  color?: string | number[];
  padding?: string;
  "border-color"?: string;
  "border-radius"?: string | number;
  "border-width"?: string | number;
}

interface TextBox extends HTMLDivElement {
  minsize: [number, number];
  grads: number[];
  params: number[];
  startpos: InstanceType<typeof Vector2>;
  setCSS: () => void;
}

export interface SVGRectWithColor extends SVGRectElement {
  setColor: (color: string) => void;
}

export class CanvasOverdraw<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D | null;
  screen?: Screen<CTX>;
  shapes: unknown[];
  otherChildren: HTMLElement[];
  font: string | undefined;
  svg!: SVGSVGElement;

  constructor() {
    super();

    this.canvas = document.createElement("canvas");
    this.shadow.appendChild(this.canvas);
    this.g = this.canvas.getContext("2d");

    this.screen = undefined;
    this.shapes = [];
    this.otherChildren = []; //non-svg elements
    this.font = undefined;

    let style = document.createElement("style");
    style.textContent = `
      .overdrawx {
        pointer-events : none;
      }
    `;

    this.shadow.appendChild(style);
  }

  static define(): { tagname: string } {
    return {
      tagname: "screen-overdraw-canvas-x",
    };
  }

  startNode(node: HTMLElement, screen?: Screen<CTX>): void {
    if (screen) {
      this.screen = screen;
      this.ctx = screen.ctx as typeof this.ctx;
    }

    if (!this.parentNode) {
      node.appendChild(this as unknown as Node);
    }

    this.style.display = "float";
    this.style.zIndex = "" + (this as unknown as { zindex_base: number }).zindex_base;

    this.style.position = "absolute";
    this.style.left = "0px";
    this.style.top = "0px";

    this.style.width = "100%"; //screen.size[0] + "px";
    this.style.height = "100%"; //screen.size[1] + "px";

    this.style.pointerEvents = "none";

    this.svg = document.createElementNS(SVG_URL, "svg") as unknown as SVGSVGElement;
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";

    this.svg.style.pointerEvents = "none";

    this.shadow.appendChild(this.svg);
    //this.style["background-color"] = "green";
  }

  start(screen: Screen<CTX>): void {
    this.screen = screen;
    this.ctx = screen.ctx as typeof this.ctx;

    screen.parentNode!.appendChild(this as unknown as Node);

    this.style.display = "float";
    this.style.zIndex = "" + (this as unknown as { zindex_base: number }).zindex_base;

    this.style.position = "absolute";
    this.style.left = "0px";
    this.style.top = "0px";

    this.style.width = screen.size[0] + "px";
    this.style.height = screen.size[1] + "px";

    this.style.pointerEvents = "none";

    this.svg = document.createElementNS(SVG_URL, "svg") as unknown as SVGSVGElement;
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";

    this.shadow.appendChild(this.svg);

    //this.style["background-color"] = "green";
  }
}

export class Overdraw<CTX extends IContextBase = IContextBase> extends ui_base.UIBase<CTX> {
  visibleToPick: boolean;
  screen: unknown;
  shapes: unknown[];
  otherChildren: HTMLElement[];
  font: string | undefined;
  zindex_base: number;
  svg!: SVGSVGElement;

  constructor() {
    super();

    this.visibleToPick = false;

    this.screen = undefined;
    this.shapes = [];
    this.otherChildren = []; //non-svg elements
    this.font = undefined;

    let style = document.createElement("style");
    style.textContent = `
      .overdrawx {
        pointer-events : none;
      }
    `;

    this.shadow.appendChild(style);

    this.zindex_base = 1000;
  }

  startNode(node: HTMLElement, screen?: Screen<CTX>, cssPosition: string = "relative"): void {
    if (screen) {
      this.screen = screen;
      this.ctx = screen.ctx;
    }

    if (!this.parentNode) {
      node.appendChild(this as unknown as Node);
    }

    this.style.zIndex = "" + this.zindex_base;

    this.style.position = cssPosition;

    //this.style["left"] = "0px";
    //this.style["top"] = "0px";
    this.style.margin = this.style.padding = "0px";

    this.style.width = "100%"; //screen.size[0] + "px";
    this.style.height = "100%"; //screen.size[1] + "px";

    this.style.pointerEvents = "none";

    this.svg = document.createElementNS(SVG_URL, "svg") as unknown as SVGSVGElement;
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";

    this.svg.style.pointerEvents = "none";

    this.shadow.appendChild(this.svg);
    //this.style["background-color"] = "green";
  }

  start(screen: Screen<CTX>): void {
    this.screen = screen;
    this.ctx = screen.ctx as typeof this.ctx;

    screen.parentNode!.appendChild(this as unknown as Node);

    this.style.display = "float";
    this.style.zIndex = "" + this.zindex_base;

    this.style.position = "absolute";
    this.style.left = "0px";
    this.style.top = "0px";

    this.style.width = screen.size[0] + "px";
    this.style.height = screen.size[1] + "px";

    this.style.pointerEvents = "none";

    this.svg = document.createElementNS(SVG_URL, "svg") as unknown as SVGSVGElement;
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";

    this.shadow.appendChild(this.svg);

    //this.style["background-color"] = "green";
  }

  clear(): void {
    for (let child of util.list(this.svg.childNodes)) {
      (child as ChildNode).remove();
    }

    for (let child of this.otherChildren) {
      child.remove();
    }

    this.otherChildren.length = 0;
  }

  drawTextBubbles(texts: string[], cos: number[][], colors?: string[]): TextBox[] | undefined {
    let boxes: TextBox[] = [];
    let elems: (TextBox | SVGLineElement)[] = [];

    let cent = new Vector2();

    for (let i = 0; i < texts.length; i++) {
      let co = cos[i];
      let text = texts[i];
      let color: string | undefined;

      if (colors !== undefined) {
        color = colors[i];
      }

      cent.add(co as unknown as InstanceType<typeof Vector2>);
      let box = this.text(texts[i], co[0], co[1], { color: color }) as TextBox;

      boxes.push(box);
      let font = box.style["font"];
      let pat = /[0-9]+px/;
      let sizeMatch = font.match(pat);

      let size: number;

      //console.log("size", size);

      if (sizeMatch === null) {
        size = (this.getDefault("DefaultText") as { size: number }).size;
      } else {
        size = ui_base.parsepx(sizeMatch[0]);
      }

      //console.log(size);
      let measureFn = ui_base.measureTextBlock as unknown as (
        elem: unknown,
        text: string,
        canvas: undefined,
        g: undefined,
        size: number,
        font: string
      ) => { width: number; height: number };
      let tsize = measureFn(this, text, undefined, undefined, size, font);

      box.minsize = [
        ~~(tsize as { width: number; height: number }).width,
        ~~(tsize as { width: number; height: number }).height,
      ];

      let pad = ui_base.parsepx(box.style["padding"]);

      box.minsize[0] += pad * 2;
      box.minsize[1] += pad * 2;

      let x = ui_base.parsepx(box.style["left"]);
      let y = ui_base.parsepx(box.style["top"]);

      box.grads = new Array(4);
      box.params = [x, y, box.minsize[0], box.minsize[1]];
      box.startpos = new Vector2([x, y]);

      box.setCSS = function (this: TextBox): void {
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

    function error(): number {
      let p1 = [0, 0],
        p2 = [0, 0];
      let s1 = [0, 0],
        s2 = [0, 0];

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

          let overlap = math.aabb_overlap_area(
            new Vector2(box1.params),
            new Vector2(s1),
            new Vector2(box2.params),
            new Vector2(s2)
          );
          ret += overlap;
        }

        ret +=
          box1.startpos.vectorDistance!(box1.params as unknown as InstanceType<typeof Vector2>) *
          0.25;
      }

      return ret;
    }

    function solve(): void {
      //console.log("ERROR", error());
      let r1 = error();
      if (r1 === 0.0) {
        return;
      }

      let df = 0.0001;
      let totgs = 0.0;

      for (let box of boxes) {
        for (let i = 0; i < box.params.length; i++) {
          let orig = box.params[i];
          box.params[i] += df;
          let r2 = error();
          box.params[i] = orig;

          box.grads[i] = (r2 - r1) / df;
          totgs += box.grads[i] ** 2;
        }
      }

      if (totgs === 0.0) {
        return;
      }

      r1 /= totgs;
      let k = 0.4;

      for (let box of boxes) {
        for (let i = 0; i < box.params.length; i++) {
          box.params[i] += -r1 * box.grads[i] * k;
        }

        box.params[2] = Math.max(box.params[2], box.minsize[0]);
        box.params[3] = Math.max(box.params[3], box.minsize[1]);

        box.setCSS();
      }
    }

    for (let i = 0; i < 15; i++) {
      solve();
    }

    for (let box of boxes) {
      elems.push(this.line(box.startpos, box.params));
    }

    return elems as TextBox[];
  }

  text(text: string, x: number, y: number, args: TextArgs = {}): HTMLDivElement {
    let mergedArgs: Record<string, string | number | number[] | undefined> = Object.assign(
      {} as Record<string, string | number | number[] | undefined>,
      args
    );

    if (mergedArgs.font === undefined) {
      if (this.font !== undefined) mergedArgs.font = this.font;
      else mergedArgs.font = (this.getDefault("DefaultText") as { genCSS(): string }).genCSS();
    }

    if (!mergedArgs["background-color"]) {
      mergedArgs["background-color"] = "rgba(75, 75, 75, 0.75)";
    }

    mergedArgs.color = mergedArgs.color ? mergedArgs.color : "white";
    if (typeof mergedArgs.color === "object") {
      mergedArgs.color = ui_base.color2css(mergedArgs.color as number[]);
    }

    mergedArgs["padding"] = mergedArgs["padding"] === undefined ? "5px" : mergedArgs["padding"];
    mergedArgs["border-color"] = mergedArgs["border-color"] ? mergedArgs["border-color"] : "grey";
    mergedArgs["border-radius"] = mergedArgs["border-radius"]
      ? mergedArgs["border-radius"]
      : "25px";
    mergedArgs["border-width"] =
      mergedArgs["border-width"] !== undefined ? mergedArgs["border-width"] : "2px";

    if (typeof mergedArgs["border-width"] === "number") {
      mergedArgs["border-width"] = "" + mergedArgs["border-width"] + "px";
    }
    if (typeof mergedArgs["border-radius"] === "number") {
      mergedArgs["border-radius"] = "" + mergedArgs["border-radius"] + "px";
    }

    //not sure I need SVG for this. . .
    let box = document.createElement("div");

    box.setAttribute("class", "overdrawx");

    box.style["position"] = "fixed";
    box.style["width"] = "min-content";
    box.style["height"] = "min-content";
    box.style["borderWidth"] = mergedArgs["border-width"] as string;
    box.style["borderRadius"] = "25px";
    box.style["pointerEvents"] = "none";
    box.style["zIndex"] = "" + (this.zindex_base + 1);
    box.style["backgroundColor"] = mergedArgs["background-color"] as string;
    box.style["padding"] = mergedArgs["padding"] as string;

    box.style["left"] = x + "px";
    box.style["top"] = y + "px";

    box.style["display"] = "flex";
    box.style["justifyContent"] = "center";
    box.style["alignItems"] = "center";

    box.innerText = text;
    box.style["font"] = mergedArgs.font as string;
    box.style["color"] = mergedArgs.color as string;

    this.otherChildren.push(box);
    this.shadow.appendChild(box);

    return box;
  }

  circle(
    p: number[],
    r: number,
    stroke: string = "black",
    fill: string = "none"
  ): SVGCircleElement {
    let circle = document.createElementNS(SVG_URL, "circle");
    circle.setAttribute("cx", "" + p[0]);
    circle.setAttribute("cy", "" + p[1]);
    circle.setAttribute("r", "" + r);

    if (fill) {
      circle.setAttribute("style", `stroke:${stroke};stroke-width:2;fill:${fill}`);
    } else {
      circle.setAttribute("style", `stroke:${stroke};stroke-width:2`);
    }

    this.svg.appendChild(circle);

    return circle;
  }

  line(
    v1: vectormath.Vector2Like | number[],
    v2: vectormath.Vector2Like | number[],
    color: string = "black"
  ): SVGLineElement {
    let line = document.createElementNS(SVG_URL, "line");
    line.setAttribute("x1", "" + v1[0]);
    line.setAttribute("y1", "" + v1[1]);
    line.setAttribute("x2", "" + v2[0]);
    line.setAttribute("y2", "" + v2[1]);
    line.setAttribute("style", `stroke:${color};stroke-width:2`);

    this.svg.appendChild(line);
    return line;
  }

  rect(
    p: vectormath.Vector2Like | number[],
    size: vectormath.Vector2Like | number[],
    color: string = "black"
  ): SVGRectWithColor {
    let line = document.createElementNS(SVG_URL, "rect") as SVGRectWithColor;
    line.setAttribute("x", "" + p[0]);
    line.setAttribute("y", "" + p[1]);
    line.setAttribute("width", "" + size[0]);
    line.setAttribute("height", "" + size[1]);
    line.setAttribute("style", `fill:${color};stroke-width:2`);

    line.setColor = (color: string): void => {
      line.setAttribute("style", `fill:${color};stroke-width:2`);
    };

    this.svg.appendChild(line);
    return line;
  }

  end(): void {
    this.clear();
    this.remove();
  }

  static define(): { tagname: string; style: string } {
    return {
      tagname: "overdraw-x",
      style  : "overdraw",
    };
  }
}

ui_base.UIBase.internalRegister(Overdraw);
