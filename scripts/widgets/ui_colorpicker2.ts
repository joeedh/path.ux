"use strict";

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ui from '../core/ui.js';
import {PropTypes} from '../path-controller/toolsys/toolprop.js';
import {keymap} from '../path-controller/util/simple_events.js';
import cconst from '../config/const.js';
import {color2web, web2color, validateWebColor, color2css, css2color, validateCSSColor} from "../core/ui_base.js";
import {IContextBase} from "../core/context_base.js";

const Vector2 = vectormath.Vector2,
      Vector3 = vectormath.Vector3,
      Vector4 = vectormath.Vector4;

export {rgb_to_hsv, hsv_to_rgb} from "../path-controller/util/colorutils.js";
import {rgb_to_hsv, hsv_to_rgb, cmyk_to_rgb, rgb_to_cmyk} from "../path-controller/util/colorutils.js";
import {contextWrangler} from '../screen/area_wrangler.js';

const UIBase     = ui_base.UIBase,
      PackFlags  = ui_base.PackFlags;

type Vector2 = vectormath.Vector2;
type Vector3 = vectormath.Vector3;
type Vector4 = vectormath.Vector4;
type UIBaseType = InstanceType<typeof UIBase>;

const UPW = 1.25, VPW = 0.75;

//*
const sample_rets = new util.cachering<number[]>(() => [0, 0], 64);

export function inv_sample(u: number, v: number): number[] {
  const ret = sample_rets.next();

  ret[0] = Math.pow(u, UPW);
  ret[1] = Math.pow(v, VPW);

  return ret;
}

export function sample(u: number, v: number): number[] {
  const ret = sample_rets.next();

  ret[0] = Math.pow(u, 1.0/UPW);
  ret[1] = Math.pow(v, 1.0/VPW);

  return ret;
}

//*/

interface ColorWidget {
  getRGBA(): Vector4;
  setRGBA(color: number[] | Vector4): void;
}

/* shared methods for clipboard handling */
function colorClipboardCopy(this: unknown): void {
  const widget = this as {getRGBA(): Vector4};
  const rgba = widget.getRGBA();

  const r = rgba[0]*255;
  const g = rgba[1]*255;
  const b = rgba[2]*255;
  const a = rgba[3];

  const data = `rgba(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)}, ${a.toFixed(4)})`;
  //cconst.setClipboardData("color", "text/css", data);

  cconst.setClipboardData("color", "text/plain", data);
}

function colorClipboardPaste(this: unknown): void {
  const widget = this as {setRGBA(color: number[] | Vector4): void};
  const entry = cconst.getClipboardData("text/plain");

  if (!entry || !validateCSSColor("" + entry.data)) {// || data.mime !== "text/css") {
    return;
  }

  let color: Vector4 | undefined;

  try {
    color = css2color(entry.data);
  } catch (error) {
    //not a color
    const err = error as Error;
    console.log(err.stack);
    console.log(err.message);
  }

  if (color) {
    widget.setRGBA(color);
  }
}

const fieldrand = new util.MersenneRandom(0);

const huefields: Record<string, HTMLCanvasElement> = {};

export function getHueField(width: number, height: number, dpi: number): HTMLCanvasElement {
  const key = width + ":" + height + ":" + dpi.toFixed(4);

  if (key in huefields) {
    return huefields[key];
  }

  const imageData = new ImageData(width, height);
  const idata = imageData.data;

  for (let i = 0; i < width*height; i++) {
    const ix = i%width;
    const idx = i*4;

    const rgb = hsv_to_rgb(ix/width, 1, 1);

    idata[idx] = rgb[0]*255;
    idata[idx + 1] = rgb[1]*255;
    idata[idx + 2] = rgb[2]*255;
    idata[idx + 3] = 255;
  }

  //*
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const g = canvas.getContext("2d")!;
  g.putImageData(imageData, 0, 0);
  //*/

  huefields[key] = canvas;
  return canvas;
}

interface FieldImage {
  width: number;
  height: number;
  image: ImageData;
  canvas: HTMLCanvasElement;
  scale: number;
  params: {
    box: { x: number; y: number; width: number; height: number };
  };
  x2sat(x: number): number;
  y2val(y: number): number;
  sat2x(s: number): number;
  val2y(v: number): number;
}

const fields: Record<string, FieldImage> = {};

export function getFieldImage(fieldsize: number, width: number, height: number, hsva: ArrayLike<number>): FieldImage {
  fieldrand.seed(0);

  /* render field at half res and upscale via canvas2d */
  const fieldsize2 = fieldsize>>1;

  const hue = hsva[0];
  const key = fieldsize + ":" + (width>>1) + ":" + (height>>1) + ":" + hue.toFixed(5);

  if (key in fields)
    return fields[key];

  const size2 = fieldsize2;
  const valpow = 0.75;

  const image: FieldImage = {
    width,
    height,
    image : new ImageData(fieldsize2, fieldsize2),
    canvas: null as unknown as HTMLCanvasElement, // assigned below
    scale : 0,                                    // assigned below
    params: {
      box: { x: 0, y: 0, width, height }
    },

    x2sat(x: number) {
      return Math.min(Math.max(x/width, 0), 1);
    },
    y2val(y: number) {
      const yn = 1.0 - Math.min(Math.max(y/height, 0), 1);
      return yn === 0.0 ? 0.0 : yn**valpow;
    },
    sat2x(s: number) {
      return s*width;
    },
    val2y(v: number) {
      if (v === 0)
        return height;

      const vp = v**(1.0/valpow);
      return (1.0 - vp)*height;
    }
  };

  const idata = image.image.data;
  for (let i = 0; i < idata.length; i += 4) {
    const i2 = i/4;
    const x = i2%size2, y = ~~(i2/size2);

    const v = 1.0 - (y/size2);
    const s = (x/size2);

    const rgb = hsv_to_rgb(hsva[0], s, v**valpow);

    idata[i] = rgb[0]*255;
    idata[i + 1] = rgb[1]*255;
    idata[i + 2] = rgb[2]*255;
    idata[i + 3] = 255;
  }

  //*
  const image2 = document.createElement("canvas");
  image2.width = size2;
  image2.height = size2;
  const g = image2.getContext("2d")!;
  g.putImageData(image.image, 0, 0);
  //*/
  image.canvas = image2;
  image.scale = width/size2;

  fields[key] = image;
  return image;
}


let _update_temp = new Vector4();

export class SimpleBox {
  pos: vectormath.Vector2;
  size: vectormath.Vector2;
  r: number;

  constructor(pos: number[] = [0, 0], size: number[] = [1, 1]) {
    this.pos = new Vector2(pos);
    this.size = new Vector2(size);
    this.r = 0;
  }
}

export class HueField<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  hsva: Vector4;
  _onchange: ((hsva?: Vector4) => void) | undefined;
  // HueField

  constructor() {
    super();

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d")!;
    this.hsva = new Vector4([0, 0, 0, 1]);
    this._onchange = undefined;
    this.shadow.appendChild(this.canvas);

    const setFromXY = (x: number, _y: number): void => {
      const dpi = this.getDPI();
      const pad = this._getPad();

      const w = this.canvas.width/dpi - pad*2.0;
      const xp = x - pad;

      let h = xp/w;
      h = Math.min(Math.max(h, 0.0), 1.0);

      this.hsva[0] = h;

      if (this._onchange) {
        this._onchange(this.hsva);
      }

      this._redraw();
    };

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Left"]:
        case keymap["Right"]: {
          const sign = e.keyCode === keymap["Left"] ? -1 : 1;

          this.hsva[0] = Math.min(Math.max(this.hsva[0] + 0.05*sign, 0.0), 1.0);
          this._redraw();

          if (this._onchange) {
            this._onchange();
          }
          break;
        }
      }
    });

    this.addEventListener("mousedown", (e) => {
      if (this.modalRunning) {
        return;
      }

      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();

      const rect = this.canvas.getClientRects()[0];
      const x = e.clientX - rect.x, y = e.clientY - rect.y;

      setFromXY(x, y);

      this.pushModal({
        on_mousemove: (e: MouseEvent) => {
          const rect = this.canvas.getClientRects()[0];
          const x = e.clientX - rect.x, y = e.clientY - rect.y;

          setFromXY(x, y);
        },
        on_mousedown: (_e: MouseEvent) => {
          this.popModal();
        },
        on_mouseup  : (_e: MouseEvent) => {
          this.popModal();
        },
        on_keydown  : (e: KeyboardEvent) => {
          if (e.keyCode === keymap["Enter"] || e.keyCode === keymap["Escape"] || e.keyCode === keymap["Space"]) {
            this.popModal();
          }
        }
      });
    });
  }


  static define() {
    return {
      tagname          : "huefield-x",
      style            : "colorfield",
      havePickClipboard: true
    };
  }

  getRGBA(): Vector4 {
    const rgb = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);
    return new Vector4().loadXYZW(rgb[0], rgb[1], rgb[2], this.hsva[3]);
  }

  setRGBA(rgba: Vector4 | number[]): void {
    const hsv = rgb_to_hsv(rgba[0], rgba[1], rgba[2]);
    this.hsva.loadXYZW(hsv[0], hsv[1], hsv[2], rgba[3]);

    this._redraw();

    if (this._onchange) {
      this._onchange(this.hsva);
    }
  }

  clipboardCopy(): void {
    colorClipboardCopy.call(this);
  }

  clipboardPaste(): void {
    colorClipboardPaste.call(this);
  }

  _getPad(): number {
    return Math.max(this.getDefault("circleSize") as number, 15);
  }

  _redraw(): void {
    const g = this.g, canvas = this.canvas;
    const dpi = this.getDPI();

    const w = this.getDefault("width") as number;
    const h = this.getDefault("hueHeight") as number;

    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    (canvas.style as unknown as Record<string, string>)["width"] = w + "px";
    (canvas.style as unknown as Record<string, string>)["height"] = h + "px";

    /* create horizontal padding to make selection of
     *  endpoint hue easier */

    const rselector = ~~(this._getPad()*dpi); //~~(this.getDefault("circleSize")*dpi);
    const r_circle = (this.getDefault("circleSize") as number)*dpi;

    let w2 = canvas.width;

    w2 -= rselector*2.0;

    //g.drawImage(getHueField(w2, h2, dpi), 0, 0, w2, h2, rselector*2, 0, w2, h2);
    g.drawImage(getHueField(w2, canvas.height, dpi), 0, 0, w2, canvas.height, rselector, 0, w2, canvas.height);

    const x = this.hsva[0]*w2 + rselector;
    const y = canvas.height*0.5;

    g.beginPath();
    g.arc(x, y, r_circle, -Math.PI, Math.PI);
    g.closePath();

    g.strokeStyle = "white";
    g.lineWidth = 3*dpi;
    g.stroke();

    g.strokeStyle = "grey";
    g.lineWidth = 1*dpi;
    g.stroke();

    if (this.disabled) {
      g.beginPath();
      g.fillStyle = "rgba(25,25,25,0.75)";
      g.rect(0, 0, this.canvas.width, this.canvas.height);
      g.fill();
    }
  }

  on_disabled(): void {
    this._redraw();
  }

  on_enabled(): void {
    this._redraw();
  }
}

UIBase.internalRegister(HueField as unknown as typeof UIBase);

export class SatValField<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  hsva: Vector4;
  _onchange: ((hsva?: Vector4) => void) | undefined;

  constructor() {
    super();

    this.hsva = new Vector4([0, 0, 0, 1]);

    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d")!;
    this.shadow.appendChild(this.canvas);

    this._onchange = undefined;

    const setFromXY = (x: number, y: number): void => {
      const field = this._getField();
      const r = ~~((this.getDefault("circleSize") as number)*this.getDPI());

      let sat = field.x2sat(x - r);
      let val = field.y2val(y - r);

      this.hsva[1] = sat;
      this.hsva[2] = val;

      if (this._onchange) {
        this._onchange(this.hsva);
      }

      this._redraw();
    };

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case keymap["Left"]:
        case keymap["Right"]: {
          let sign = e.keyCode === keymap["Left"] ? -1 : 1;

          this.hsva[1] = Math.min(Math.max(this.hsva[1] + 0.05*sign, 0.0), 1.0);
          this._redraw();

          if (this._onchange) {
            this._onchange(this.hsva);
          }

          break;
        }

        case keymap["Up"]:
        case keymap["Down"]: {
          let sign = e.keyCode === keymap["Down"] ? -1 : 1;

          this.hsva[2] = Math.min(Math.max(this.hsva[2] + 0.05*sign, 0.0), 1.0);
          this._redraw();

          if (this._onchange) {
            this._onchange(this.hsva);
          }
          break;
        }
      }
    });

    this.canvas.addEventListener("mousedown", (e: MouseEvent) => {
      if (this.modalRunning) {
        return;
      }

      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();

      let rect = this.canvas.getClientRects()[0];
      let x = e.clientX - rect.x, y = e.clientY - rect.y;

      setFromXY(x, y);

      const mouseHandlers = {
        on_mousemove: (e: MouseEvent) => {
          const rect = this.canvas.getClientRects()[0];
          if (rect === undefined) {
            return;
          }

          const x = e.clientX - rect.x, y = e.clientY - rect.y;

          setFromXY(x, y);
        },
        on_pointermove(e: PointerEvent) {
          (this as typeof mouseHandlers).on_mousemove(e);
        },
        on_mousedown: (_e: MouseEvent) => {
          this.popModal();
        },
        on_mouseup  : (_e: MouseEvent) => {
          this.popModal();
        },
        on_keydown  : (e: KeyboardEvent) => {
          if (e.keyCode === keymap["Enter"] || e.keyCode === keymap["Escape"] || e.keyCode === keymap["Space"]) {
            this.popModal();
          }
        }
      };
      this.pushModal(mouseHandlers);
    });

    this.canvas.addEventListener("touchstart", (e: TouchEvent) => {
      if (this.modalRunning) {
        return;
      }

      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();

      const rect = this.canvas.getClientRects()[0];
      const x = e.touches[0].clientX - rect.x, y = e.touches[0].clientY - rect.y;

      setFromXY(x, y);

      this.pushModal({
        on_mousemove  : (e: MouseEvent & {touches?: TouchList; x?: number; y?: number}) => {
          const rect = this.canvas.getClientRects()[0];
          let mx: number, my: number;

          if (e.touches && e.touches.length) {
            mx = e.touches[0].clientX - rect.x;
            my = e.touches[0].clientY - rect.y;
          } else {
            mx = e.x ?? 0;
            my = e.y ?? 0;
          }

          setFromXY(mx, my);
        },
        on_touchmove  : (e: TouchEvent) => {
          const rect = this.canvas.getClientRects()[0];
          const x = e.touches[0].clientX - rect.x, y = e.touches[0].clientY - rect.y;

          setFromXY(x, y);
        },
        on_mousedown  : (_e: MouseEvent) => {
          this.popModal();
        },
        on_touchcancel: (_e: TouchEvent) => {
          this.popModal();
        },
        on_touchend   : (_e: TouchEvent) => {
          this.popModal();
        },
        on_mouseup    : (_e: MouseEvent) => {
          this.popModal();
        },
        on_keydown    : (e: KeyboardEvent) => {
          if (e.keyCode === keymap["Enter"] || e.keyCode === keymap["Escape"] || e.keyCode === keymap["Space"]) {
            this.popModal();
          }
        }
      });
    });
  }

  static define() {
    return {
      tagname          : "satvalfield-x",
      style            : "colorfield",
      havePickClipboard: true
    };
  }

  getRGBA(): Vector4 {
    const rgb = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);
    return new Vector4().loadXYZW(rgb[0], rgb[1], rgb[2], this.hsva[3]);
  }

  setRGBA(rgba: Vector4 | number[]): void {
    const hsv = rgb_to_hsv(rgba[0], rgba[1], rgba[2]);
    this.hsva.loadXYZW(hsv[0], hsv[1], hsv[2], rgba[3]);

    this.update(true);
    this._redraw();

    if (this._onchange) {
      this._onchange(this.hsva);
    }
  }

  clipboardCopy(): void {
    colorClipboardCopy.call(this);
  }

  clipboardPaste(): void {
    colorClipboardPaste.call(this);
  }

  _getField(): FieldImage {
    const r = this.getDefault("circleSize") as number;
    const w = this.getDefault("width") as number;
    const h = this.getDefault("height") as number;

    //r = ~~(r*dpi);

    return getFieldImage(this.getDefault("fieldSize") as number, w - r*2, h - r*2, this.hsva as unknown as number[]);
  }

  update(force_update = false): void {
    super.update();

    if (force_update) {
      this._redraw();
    }
  }

  _redraw(): void {
    const g = this.g, canvas = this.canvas;
    const dpi = this.getDPI();

    const w = this.getDefault("width") as number;
    const h = this.getDefault("height") as number;

    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    (canvas.style as unknown as Record<string, string>)["width"] = w + "px";
    (canvas.style as unknown as Record<string, string>)["height"] = h + "px";
    //SatValField

    const rselector = ~~((this.getDefault("circleSize") as number)*dpi);

    const field = this._getField();
    const image = field.canvas;

    g.globalAlpha = 1.0;
    g.beginPath();
    g.rect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "rgb(200, 200, 200)";
    g.fill();

    g.beginPath();

    const steps = 17;
    const dx = canvas.width/steps;
    const dy = canvas.height/steps;

    for (let i = 0; i < steps*steps; i++) {
      const x = (i%steps)*dx, y = (~~(i/steps))*dy;

      if (i%2 === 0) {
        continue;
      }
      g.rect(x, y, dx, dy);
    }

    g.fillStyle = "rgb(110, 110, 110)";
    g.fill();

    g.globalAlpha = this.hsva[3];
    g.drawImage(image, 0, 0, image.width, image.height, rselector, rselector, canvas.width - rselector*2, canvas.height - rselector*2);

    const hsva = this.hsva;

    const x = field.sat2x(hsva[1])*dpi + rselector;
    const y = field.val2y(hsva[2])*dpi + rselector;
    const r = rselector;

    g.beginPath();
    g.arc(x, y, r, -Math.PI, Math.PI);
    g.closePath();

    g.strokeStyle = "white";
    g.lineWidth = 3*dpi;
    g.stroke();

    g.strokeStyle = "grey";
    g.lineWidth = 1*dpi;
    g.stroke();

    if (this.disabled) {
      g.beginPath();
      g.fillStyle = "rgba(25,25,25,0.75)";
      g.rect(0, 0, this.canvas.width, this.canvas.height);
      g.fill();
    }
  }

  on_disabled(): void {
    this._redraw();
  }

  on_enabled() {
    this._redraw();
  }
}

UIBase.internalRegister(SatValField as unknown as typeof UIBase);

export class ColorField<CTX extends IContextBase = IContextBase> extends ui.ColumnFrame<CTX> {
  hsva: Vector4;
  rgba: Vector4;
  satvalfield: SatValField<CTX>;
  huefield: HueField<CTX>;
  _onchange: ((hsvaOrRgba: Vector4, rgba?: Vector4) => void) | undefined;
  _lastThemeStyle: string;
  _last_dpi: number | undefined;

  constructor() {
    super();

    this.hsva = new Vector4([0.05, 0.6, 0.15, 1.0]);
    this.rgba = new Vector4([0, 0, 0, 0]);
    this._onchange = undefined;
    this._last_dpi = undefined;

    this._recalcRGBA();

    this._lastThemeStyle = (this.constructor as unknown as typeof ColorField).define().style;

    const satvalfield = UIBase.createElement<SatValField<CTX>>("satvalfield-x");
    this.satvalfield = satvalfield;
    satvalfield.hsva = this.hsva;

    const huefield = UIBase.createElement<HueField<CTX>>("huefield-x");
    this.huefield = huefield;
    huefield.hsva = this.hsva;

    huefield._onchange = () => {
      this.satvalfield._redraw();
      this._recalcRGBA();

      if (this._onchange) {
        this._onchange(this.rgba);
      }
    };

    satvalfield._onchange = () => {
      this._recalcRGBA();

      if (this._onchange) {
        this._onchange(this.rgba);
      }
    };

    this._add(satvalfield);
    this._add(huefield);
    //this.shadow.appendChild(canvas);
    //this.shadow.appendChild(huecanvas);
  }

  static define() {
    return {
      tagname: "colorfield-x",
      style  : "colorfield"
    };
  }

  setCMYK(c: number, m: number, y: number, k: number): void {
    const rgb = cmyk_to_rgb(c, m, y, k);
    const hsv = rgb_to_hsv(rgb[0], rgb[1], rgb[2]);

    this.setHSVA(hsv[0], hsv[1], hsv[2], this.hsva[3]);
  }

  getCMYK(): number[] {
    const rgb = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);
    return rgb_to_cmyk(rgb[0], rgb[1], rgb[2]) as unknown as number[];
  }

  setHSVA(h: number, s: number, v: number, a = 1.0, fire_onchange = true): void {
    this.hsva[0] = h;
    this.hsva[1] = s;
    this.hsva[2] = v;
    this.hsva[3] = a;

    this._recalcRGBA();
    this.update(true);

    if (this._onchange && fire_onchange) {
      this._onchange(this.hsva, this.rgba);
    }
  }

  _recalcRGBA(): this {
    const ret = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);

    this.rgba[0] = ret[0];
    this.rgba[1] = ret[1];
    this.rgba[2] = ret[2];
    this.rgba[3] = this.hsva[3];

    return this;
  }

  updateDPI(force_update: boolean = false, _in_update: boolean = false): boolean | undefined {
    const dpi = this.getDPI();

    let update = force_update;
    update = update || dpi != this._last_dpi;

    if (update) {
      this._last_dpi = dpi;

      if (!_in_update)
        this._redraw();

      return true;
    }
    return undefined;
  }

  getRGBA(): Vector4 {
    const rgb = hsv_to_rgb(this.hsva[0], this.hsva[1], this.hsva[2]);
    return new Vector4().loadXYZW(rgb[0], rgb[1], rgb[2], this.hsva[3]);
  }

  setRGBA(r: number | Vector4 | number[], g?: number, b?: number, a = 1.0, fire_onchange = true): void {
    let r0: number, g0: number, b0: number, a0: number;

    if (typeof r === "object") {
      r0 = r[0];
      g0 = r[1];
      b0 = r[2];
      a0 = r[3] ?? a;
    } else {
      r0 = r;
      g0 = g!;
      b0 = b!;
      a0 = a;
    }

    const hsv = rgb_to_hsv(r0, g0, b0);

    this.hsva[0] = hsv[0];
    this.hsva[1] = hsv[1];
    this.hsva[2] = hsv[2];
    this.hsva[3] = a0;

    this._recalcRGBA();
    this.update(true);

    if (this._onchange && fire_onchange) {
      this._onchange(this.hsva, this.rgba);
    }
  }

  updateThemeOverride(): boolean {
    const themeClass = this.getStyleClass();
    if (themeClass === this._lastThemeStyle) {
      return false;
    }

    this._lastThemeStyle = themeClass;
    this.huefield.overrideClass(themeClass);
    this.satvalfield.overrideClass(themeClass);

    for (let i = 0; i < 3; i++) {
      this.flushSetCSS();
      this.flushUpdate();
    }

    return true;
  }

  update(force_update = false): void {
    super.update();

    this.updateThemeOverride();

    const redrawDPI = this.updateDPI(force_update, true);
    const redraw = redrawDPI || force_update;

    if (redraw) {
      this.satvalfield.update(true);
      this._redraw();
    }
  }

  setCSS(): void {
    super.setCSS();

    (this.style as unknown as Record<string, string>)["flex-grow"] = this.getDefault("flex-grow") as string;
  }

  _redraw(): void {
    this.satvalfield._redraw();
    this.huefield._redraw();
  }
}

UIBase.internalRegister(ColorField as unknown as typeof UIBase);

interface SliderWidget extends UIBaseType {
  setValue(val: number, fire_onchange?: boolean): void;
  baseUnit: string | undefined;
  displayUnit: string | undefined;
  text?: string;
}

// @ts-expect-error - TypeScript limitation: generic classes can't properly override static methods
export class ColorPicker<CTX extends IContextBase = IContextBase> extends ui.ColumnFrame<CTX> {
  _lastThemeStyle: string;
  field!: ColorField<CTX>;
  colorbox!: HTMLDivElement;
  _style!: HTMLStyleElement;
  cssText!: SliderWidget;
  h: SliderWidget | undefined;
  s: SliderWidget | undefined;
  v: SliderWidget | undefined;
  a: SliderWidget | undefined;
  r: SliderWidget | undefined;
  g: SliderWidget | undefined;
  b: SliderWidget | undefined;
  a2: SliderWidget | undefined;
  cmyk: SliderWidget[] | undefined;
  _no_update_textbox: boolean;
  _onchange: ((rgba: Vector4) => void) | undefined;

  constructor() {
    super();

    this._no_update_textbox = false;
    this._lastThemeStyle = (this.constructor as unknown as typeof ColorPicker).define().style;
  }

  //*
  get hsva(): Vector4 {
    return this.field.hsva;
  }

  get rgba(): Vector4 {
    return this.field.rgba;
  }//*/

  set description(_val: string) {
    //do not allow setting description of the colorpicker container
  }

  static setDefault(node: ColorPicker): void {
    let tabs: import("../widgets/ui_tabs.js").TabContainer;
    let colorsPanel: typeof node | ReturnType<typeof node.panel> = node;

    if (node.getClassDefault("usePanels")) {
      const panel = node.panel("Color");
      colorsPanel = panel;
      tabs = panel.tabs() as unknown as import("../widgets/ui_tabs.js").TabContainer;
      panel.closed = true;

      (panel as unknown as {style: Record<string, string>}).style["flex-grow"] = "unset";

      /* force compactness */
      ((panel as unknown as {titleframe: {style: Record<string, string>}}).titleframe.style as unknown as Record<string, string>)["flex-grow"] = "unset";
      //panel.titleframe.style["align-items"] = "unset";
    } else {
      tabs = node.tabs() as unknown as import("../widgets/ui_tabs.js").TabContainer;
    }

    node.cssText = node.textbox() as unknown as SliderWidget;
    (node.cssText as unknown as UIBaseType).onchange = (val: unknown) => {
      const strVal = "" + val;
      const ok = validateWebColor(strVal);
      if (!ok) {
        (node.cssText as unknown as {flash(c: string): void}).flash("red");
        return;
      } else {
        (node.cssText as unknown as {flash(c: string): void}).flash("green");
      }

      const trimmed = strVal.trim();
      const color = web2color(trimmed);

      node._no_update_textbox = true;
      node.field.setRGBA(color[0], color[1], color[2], color[3]);
      node._setSliders();

      node._no_update_textbox = false;
    };

    //tabs.overrideDefault("background-color", node.getDefault("background-color"));

    let tab = tabs.tab("HSV");

    const makeSlider = (tabFrame: ReturnType<typeof tabs.tab>, label: string, cb: (e: {value: number}) => void): SliderWidget => {
      return tabFrame.slider(undefined, label, 0.0, 0.0, 1.0, 0.001, false, true, cb) as unknown as SliderWidget;
    };

    node.h = makeSlider(tab, "Hue", (e) => {
      const hsva = node.hsva;
      node.setHSVA(e.value, hsva[1], hsva[2], hsva[3]);
    });

    node.s = makeSlider(tab, "Saturation", (e) => {
      const hsva = node.hsva;
      node.setHSVA(hsva[0], e.value, hsva[2], hsva[3]);
    });
    node.v = makeSlider(tab, "Value", (e) => {
      const hsva = node.hsva;
      node.setHSVA(hsva[0], hsva[1], e.value, hsva[3]);
    });
    node.a = makeSlider(tab, "Alpha", (e) => {
      const hsva = node.hsva;
      node.setHSVA(hsva[0], hsva[1], hsva[2], e.value);
    });

    node.h.baseUnit = node.h.displayUnit = "none";
    node.s.baseUnit = node.s.displayUnit = "none";
    node.v.baseUnit = node.v.displayUnit = "none";
    node.a.baseUnit = node.a.displayUnit = "none";

    tab = tabs.tab("RGB");

    node.r = makeSlider(tab, "R", (e) => {
      const rgba = node.rgba;
      node.setRGBA(e.value, rgba[1], rgba[2], rgba[3]);
    });
    node.g = makeSlider(tab, "G", (e) => {
      const rgba = node.rgba;
      node.setRGBA(rgba[0], e.value, rgba[2], rgba[3]);
    });
    node.b = makeSlider(tab, "B", (e) => {
      const rgba = node.rgba;
      node.setRGBA(rgba[0], rgba[1], e.value, rgba[3]);
    });
    node.a2 = makeSlider(tab, "Alpha", (e) => {
      const rgba = node.rgba;
      node.setRGBA(rgba[0], rgba[1], rgba[2], e.value);
    });

    node.r.baseUnit = node.r.displayUnit = "none";
    node.g.baseUnit = node.g.displayUnit = "none";
    node.b.baseUnit = node.b.displayUnit = "none";
    node.a2.baseUnit = node.a2.displayUnit = "none";

    if (!node.getDefault("noCMYK")) {
      tab = tabs.tab("CMYK");
      const cmyk = node.getCMYK();

      const makeCMYKSlider = (label: string, idx: number): SliderWidget => {
        const slider = tab.slider(undefined, {
          name      : label,
          min       : 0.0,
          max       : 1.0,
          is_int    : false,
          defaultval: cmyk[idx],
          callback  : (e: {value: number}) => {
            const cmyk2 = node.getCMYK();
            cmyk2[idx] = e.value;
            node.setCMYK(cmyk2[0], cmyk2[1], cmyk2[2], cmyk2[3]);
          },
          step      : 0.001
        }) as unknown as SliderWidget;

        slider.baseUnit = slider.displayUnit = "none";

        return slider;
      };

      node.cmyk = [
        makeCMYKSlider("C", 0),
        makeCMYKSlider("M", 1),
        makeCMYKSlider("Y", 2),
        makeCMYKSlider("K", 3),
      ];
    }

    node._setSliders();
  }

  static define() {
    return {
      tagname            : "colorpicker-x",
      style              : "colorfield",
      havePickClipboard  : true,
      copyForAllChildren : true,
      pasteForAllChildren: true,
    };
  }

  clipboardCopy(): void {
    colorClipboardCopy.call(this);
  }

  clipboardPaste(): void {
    colorClipboardPaste.call(this);
  }

  init(): void {
    super.init();

    this.field = UIBase.createElement<ColorField<CTX>>("colorfield-x");
    this.field.setAttribute("class", "colorpicker");

    this.field.packflag |= this.inherit_packflag;
    this.field.packflag |= this.packflag;

    this.field._onchange = () => {
      this._setDataPath();
      this._setSliders();

      if (this._onchange) {
        this._onchange(this.field.rgba);
      }
    };

    const style = document.createElement("style");
    style.textContent = `
      .colorpicker {
        background-color : ${this.getDefault("background-color")};
      }
    `;

    this._style = style;

    this.colorbox = document.createElement("div");
    this.colorbox.style["width"] = "100%";
    (this.colorbox.style as unknown as Record<string, string>)["height"] = this.getDefault("colorBoxHeight") + "px";
    (this.colorbox.style as unknown as Record<string, string>)["background-color"] = "black";

    this.shadow.appendChild(style);
    this.field.ctx = this.ctx;

    this.shadow.appendChild(this.colorbox);
    this.add(this.field);

    (this.style as unknown as Record<string, string>)["width"] = this.getDefault("width") + "px";
  }

  updateColorBox(): void {
    const r = ~~(this.field.rgba[0]*255);
    const g = ~~(this.field.rgba[1]*255);
    const b = ~~(this.field.rgba[2]*255);

    (this.colorbox.style as unknown as Record<string, string>)["background-color"] = `rgb(${r},${g},${b})`;
  }

  _setSliders(): void {
    if (this.h === undefined) {
      //setDefault() wasn't called
      console.warn("colorpicker ERROR");
      return;
    }

    const hsva = this.field.hsva;
    this.h.setValue(hsva[0], false);
    this.s!.setValue(hsva[1], false);
    this.v!.setValue(hsva[2], false);
    this.a!.setValue(hsva[3], false);

    const rgba = this.field.rgba;

    this.r!.setValue(rgba[0], false);
    this.g!.setValue(rgba[1], false);
    this.b!.setValue(rgba[2], false);
    this.a2!.setValue(rgba[3], false);

    if (this.cmyk) {
      const cmyk = this.field.getCMYK();

      for (let i = 0; i < 4; i++) {
        this.cmyk[i].setValue(cmyk[i], false);
      }
    }

    this.updateColorBox();

    if (!this._no_update_textbox) {
      this.cssText.text = color2web(this.field.rgba as unknown as number[]);
    }
  }

  updateDataPath(): void {
    if (!this.hasAttribute("datapath")) {
      return;
    }

    const prop = this.getPathMeta(this.ctx, this.getAttribute("datapath")!);
    const val = this.getPathValue(this.ctx, this.getAttribute("datapath")!);

    if (val === undefined) {
      //console.warn("Bad datapath", this.getAttribute("datapath"));
      this.internalDisabled = true;
      return;
    }

    this.internalDisabled = false;

    _update_temp.load(val as number[]);

    if (prop?.type === PropTypes.VEC3) {
      _update_temp[3] = 1.0;
    }

    if (_update_temp.vectorDistance(this.field.rgba) > 0.01) {
      this.field.setRGBA(_update_temp[0], _update_temp[1], _update_temp[2], _update_temp[3], false);
      this._setSliders();
      this.field.update(true);
    }
  }

  updateThemeOverride(): boolean {
    const themeClass = this.getStyleClass();
    if (themeClass === this._lastThemeStyle) {
      return false;
    }

    this._lastThemeStyle = themeClass;
    this.field.overrideClass(themeClass);

    this.flushSetCSS();
    this.flushUpdate();

    return true;
  }

  update(): void {
    this.updateThemeOverride();

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }

    super.update();
  }

  _setDataPath(): void {
    if (this.hasAttribute("datapath")) {
      const prop = this.getPathMeta(this.ctx, this.getAttribute("datapath")!);

      if (prop === undefined) {
        console.warn("Bad data path for color field:", this.getAttribute("datapath"));
      }

      let val: Vector4 | Vector3 = this.field.rgba;
      if (prop !== undefined && prop.type === PropTypes.VEC3) {
        val = new Vector3();
        (val as Vector3).load(this.field.rgba);
      }

      this.setPathValue(this.ctx, this.getAttribute("datapath")!, val);
    }
  }

  getCMYK(): number[] {
    return this.field.getCMYK();
  }

  setCMYK(c: number, m: number, y: number, k: number): void {
    this.field.setCMYK(c, m, y, k);
    this._setSliders();
    this._setDataPath();
  }

  setHSVA(h: number, s: number, v: number, a: number): void {
    this.field.setHSVA(h, s, v, a);
    this._setSliders();
    this._setDataPath();
  }

  getRGBA(): Vector4 {
    return this.field.getRGBA();
  }

  setRGBA(r: number, g: number, b: number, a: number): void {
    this.field.setRGBA(r, g, b, a);
    this._setSliders();
    this._setDataPath();
  }
}

UIBase.internalRegister(ColorPicker as unknown as typeof UIBase);


export class ColorPickerButton<CTX extends IContextBase = IContextBase> extends UIBase<CTX> {
  _highlight: boolean;
  _depress: boolean;
  _label: string;
  customLabel: string | undefined;
  rgba: Vector4;
  labelDom: HTMLSpanElement;
  dom: HTMLCanvasElement;
  g: CanvasRenderingContext2D | null;
  _font: string = "DefaultText";
  _last_key: string = "";

  constructor() {
    super();

    this._highlight = false;
    this._depress = false;
    this._label = "error";

    this.customLabel = undefined;

    this.rgba = new Vector4([1, 1, 1, 1]);

    this.labelDom = document.createElement("span");
    this.labelDom.textContent = this._label;
    this.dom = document.createElement("canvas");
    this.g = this.dom.getContext("2d");

    this.shadow.appendChild(this.labelDom);
    this.shadow.appendChild(this.dom);
  }

  get label() {
    return this._label;
  }

  set label(val) {
    this._label = val;
    this.labelDom.textContent = val;
  }

  get font() {
    return this._font;
  }

  set font(val) {
    this._font = val;

    this.setCSS();
  }

  get noLabel() {
    let ret = "" + this.getAttribute("no-label");
    ret = ret.toLowerCase();

    return ret === "true" || ret === "yes" || ret === "on";
  }

  set noLabel(v) {
    if (this.labelDom) {
      this.labelDom.hidden = true; //will be deleted later
    }

    this.setAttribute("no-label", v ? "true" : "false");
  }

  static define() {
    return {
      tagname          : "color-picker-button-x",
      style            : "colorpickerbutton",
      havePickClipboard: true
    }
  }

  init(): void {
    super.init();
    this._font = "DefaultText"; //this.getDefault("defaultFont");

    const enter = (_e: PointerEvent) => {
      this._highlight = true;
      this._redraw();
    };

    const leave = (_e: PointerEvent | FocusEvent) => {
      this._highlight = false;
      this._redraw();
    };

    this.addEventListener("pointerover", enter as EventListener, {capture: true, passive: true});
    this.addEventListener("pointerout", leave as EventListener, {capture: true, passive: true});
    this.addEventListener("focus", leave as EventListener, {capture: true, passive: true});


    this.addEventListener("mousedown", (e: MouseEvent) => {
      /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
      e.preventDefault();

      this._onClickButton(e);
    });

    this.setCSS();
  }

  clipboardCopy(): void {
    (colorClipboardCopy as (this: ColorWidget) => void).call(this as unknown as ColorWidget);
  }

  clipboardPaste(): void {
    (colorClipboardPaste as (this: ColorWidget) => void).call(this as unknown as ColorWidget);
  }

  getRGBA(): Vector4 {
    return this.rgba;
  }

  _onClickButton(e: MouseEvent): void {
    this.abortToolTips(4000);
    console.warn("CLICK COLORPICKER");
    this.blur();

    if (this.onclick) {
      this.onclick(e as unknown as PointerEvent);
    }

    const colorpicker = (this.ctx.screen as unknown as {popup: (a: unknown, b: unknown) => unknown}).popup(this, this);
    const ctx = contextWrangler.makeSafeContext(this.ctx) as unknown;

    (colorpicker as unknown as Record<string, unknown>)["ctx"] = ctx;
    (colorpicker as unknown as {useDataPathUndo: boolean}).useDataPathUndo = this.useDataPathUndo;

    const path = this.hasAttribute("datapath") ? (this.getAttribute("datapath") ?? undefined) : undefined;

    const massSetPath = (this.getAttribute("mass_set_path") ?? undefined) as string | undefined;
    const widget = (colorpicker as unknown as {colorPicker: (p: string | undefined, u: undefined, m: string | undefined) => unknown}).colorPicker(path, undefined, massSetPath) as unknown;

    (widget as unknown as Record<string, unknown>)["ctx"] = ctx;
    (widget as unknown as {_init(): void})._init();
    (widget as unknown as {setRGBA(r: number, g: number, b: number, a: number): void}).setRGBA(this.rgba[0], this.rgba[1], this.rgba[2], this.rgba[3]);

    (widget as unknown as {style: Record<string, unknown>}).style["padding"] = "20px";

    const onchange = () => {
      (this.rgba as unknown as {load(v: unknown): void}).load((widget as unknown as {rgba: unknown}).rgba);
      this.redraw();

      if (this.onchange) {
        this.onchange(this);
      }
    };

    (widget as unknown as {_onchange: (() => void) | undefined})._onchange = onchange;

    (colorpicker as unknown as {style: Record<string, string>}).style["background-color"] = (widget as unknown as {getDefault(key: string): string}).getDefault("background-color") as string;
    //colorpicker.style["border-radius"] = "25px";
    (colorpicker as unknown as {style: Record<string, string>}).style["border-width"] = (widget as unknown as {getDefault(key: string): string}).getDefault("border-width") as string;
  }

  setRGBA(val: Vector4 | number[]): this {
    let a = this.rgba[3];

    let old = new Vector4(this.rgba);

    this.rgba.load(val);

    if (val.length < 4) {
      this.rgba[3] = a;
    }

    if (this.rgba.vectorDistance(old) < 0.001) {
      return this;
    }

    if (this.hasAttribute("datapath")) {
      this.setPathValue(this.ctx, this.getAttribute("datapath")!, this.rgba);
    }

    if (this.onchange) {
      this.onchange(this);
    }

    this._redraw();
    return this;
  }

  on_disabled(): void {
    this.setCSS();
    this._redraw();
  }

  _redraw(): void {
    const canvas = this.dom, g = this.g;

    if (!g) {
      return;
    }

    g.clearRect(0, 0, canvas.width, canvas.height);

    if (this.disabled) {
      let color = "rgb(55, 55, 55)";

      g.save();

      ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color);
      ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip");
      let steps = 5;
      let dt = canvas.width/steps, t = 0;

      g.beginPath();
      g.lineWidth = 2;
      g.strokeStyle = "black";

      for (let i = 0; i < steps; i++, t += dt) {
        g.moveTo(t, 0);
        g.lineTo(t + dt, canvas.height);
        g.moveTo(t + dt, 0);
        g.lineTo(t, canvas.height);
      }

      g.stroke();
      g.restore();
      return;
    }

    //do checker pattern for alpha
    g.save();

    let grid1 = "rgb(100, 100, 100)";
    let grid2 = "rgb(175, 175, 175)";

    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip");
    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", grid1);

    let cellsize = 10;
    let totx = Math.ceil(canvas.width/cellsize), toty = Math.ceil(canvas.height/cellsize);

    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "clip", undefined, undefined, true);
    g.clip();

    g.beginPath();
    for (let x = 0; x < totx; x++) {
      for (let y = 0; y < toty; y++) {
        if ((x + y) & 1) {
          continue;
        }

        g.rect(x*cellsize, y*cellsize, cellsize, cellsize);
      }
    }

    g.fillStyle = grid2;
    g.fill();

    //g.fillStyle = "orange";
    //g.beginPath();
    //g.rect(0, 0, canvas.width, canvas.height);
    //g.fill();

    let color = color2css(this.rgba);
    ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color, undefined, true);
    //drawRoundBox(elem, canvas, g, width, height, r=undefined, op="fill", color=undefined, pad=undefined) {

    if (this._highlight) {
      //let color = "rgba(200, 200, 255, 0.5)";
      let color = this.getDefault("BoxHighlight");
      ui_base.drawRoundBox(this, canvas, g, canvas.width, canvas.height, undefined, "fill", color);
    }

    g.restore();
  }

  setCSS(): void {
    super.setCSS();

    const w = this.getDefault("width") as number;
    const h = this.getDefault("height") as number;
    const dpi = this.getDPI();

    (this.style as unknown as Record<string, string>)["width"] = "min-contents" + "px";
    (this.style as unknown as Record<string, string>)["height"] = h + "px";

    (this.style as unknown as Record<string, string>)["flex-direction"] = "row";
    (this.style as unknown as Record<string, string>)["display"] = "flex";

    (this.labelDom.style as unknown as Record<string, string>)["color"] = (this.getDefault(this._font) as unknown as Record<string, string>).color;
    (this.labelDom.style as unknown as Record<string, string>)["font"] = ui_base.getFont(this, undefined, this._font, false);

    const canvas = this.dom;

    (canvas.style as unknown as Record<string, string>)["width"] = w + "px";
    (canvas.style as unknown as Record<string, string>)["height"] = h + "px";
    canvas.width = ~~(w*dpi);
    canvas.height = ~~(h*dpi);

    (this.style as unknown as Record<string, string>)["background-color"] = "rgba(0,0,0,0)";
    this._redraw();
  }

  updateDataPath(): void {
    if (!(this.hasAttribute("datapath"))) {
      return;
    }

    const path = this.getAttribute("datapath");
    if (!path) {
      return;
    }
    const prop = this.getPathMeta(this.ctx, path);

    if ((prop === undefined || prop.data === undefined) && cconst.DEBUG.verboseDataPath) {
      console.log("bad path", path);
      return;
    } else if (prop === undefined) {
      let redraw = !this.disabled;

      this.internalDisabled = true;

      if (redraw) {
        this._redraw();
      }
      return;
    }

    let redraw = this.disabled;

    this.internalDisabled = false;

    if (this.customLabel === undefined && prop.uiname && prop.uiname !== this._label) {
      this.label = prop.uiname;
    }

    const val = this.getPathValue(this.ctx, path) as unknown;

    if (val === undefined || val === null) {
      redraw = redraw || this.disabled !== true;

      this.internalDisabled = true;

      if (redraw) {
        this._redraw();
      }

    } else {
      this.internalDisabled = false;

      let dis;

      if ((val as ArrayLike<number>).length === 3) {
        dis = Vector3.prototype.vectorDistance.call(val, this.rgba);
      } else {
        dis = this.rgba.vectorDistance(val as Vector4);
      }

      if (dis > 0.0001) {
        if (prop.type === PropTypes.VEC3) {
          this.rgba.load(val as Vector4);
          this.rgba[3] = 1.0;
        } else {
          this.rgba.load(val as Vector4);
        }

        redraw = true;
      }

      if (redraw) {
        this._redraw();
      }
    }
  }

  update() {
    super.update();

    if (this.noLabel && this.labelDom.isConnected) {
      this.labelDom.remove();
    }

    if (this.customLabel !== undefined && this.customLabel !== this._label) {
      this.label = this.customLabel;
    }

    for (let i = 0; i < 4; i++) {
      const idx = i as 0 | 1 | 2 | 3;
      if (this.rgba[idx] === undefined) {
        console.warn("corrupted color or alpha detected", this.rgba);
        this.rgba[idx] = 1.0;
      }
    }

    let key = "" + this.rgba[0].toFixed(4) + " " + this.rgba[1].toFixed(4) + " " + this.rgba[2].toFixed(4) + " " + this.rgba[3].toFixed(4);
    key += this.disabled;

    if (key !== this._last_key) {
      this._last_key = key;
      this.redraw();
    }

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  redraw() {
    this._redraw();
  }
};
UIBase.internalRegister(ColorPickerButton as unknown as typeof UIBase);
