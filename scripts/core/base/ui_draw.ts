import { CSSFont } from "../cssfont";
import { color2css } from "../ui_theme";
import { getDPI } from "./ui_base_dpi";
import type { IContextBase } from "../context_base";
import type { UIBase } from "../ui_base";

export function drawRoundBox2(
  elem: UIBase,
  options: {
    canvas: HTMLCanvasElement;
    g: CanvasRenderingContext2D;
    width?: number;
    height?: number;
    r?: number;
    op?: string;
    color?: string;
    margin?: number;
    no_clear?: boolean;
  }
): void {
  drawRoundBox(
    elem,
    options.canvas,
    options.g,
    options.width,
    options.height,
    options.r,
    options.op,
    options.color,
    options.margin,
    options.no_clear
  );
}

/**okay, I need to refactor this function,
 it needs to take x, y as well as width, height,
 and be usable for more use cases.*/
export function drawRoundBox(
  elem: UIBase,
  canvas: HTMLCanvasElement,
  g: CanvasRenderingContext2D,
  width?: number,
  height?: number,
  r?: number,
  op = "fill",
  color?: string,
  margin?: number,
  no_clear = false
): void {
  width = width === undefined ? canvas!.width : width;
  height = height === undefined ? canvas!.height : height;
  const ctx2d = g!;
  ctx2d.save();

  const dpi = elem.getDPI();

  let r2val: number = r === undefined ? (elem.getDefault("border-radius") as number) : r;

  if (margin === undefined) {
    margin = 1;
  }

  r2val *= dpi;
  let r1 = r2val;
  let r2 = r2val;

  if (r2val > (height - margin * 2) * 0.5) {
    r1 = (height - margin * 2) * 0.5;
  }

  if (r2val > (width - margin * 2) * 0.5) {
    r2 = (width - margin * 2) * 0.5;
  }

  const canvasWithBG =
    "_background" in canvas ? (canvas as HTMLCanvasElement & { _background?: string }) : undefined;

  let bg: string | undefined = color;
  if (bg === undefined && canvasWithBG?._background !== undefined) {
    bg = canvasWithBG._background;
  } else if (bg === undefined) {
    bg = elem.getDefault("background-color") as string;
  }

  if (op === "fill" && !no_clear) {
    ctx2d.clearRect(0, 0, width, height);
  }

  ctx2d.fillStyle = bg;
  //hackish!
  ctx2d.strokeStyle = color === undefined ? (elem.getDefault("border-color") as string) : color;

  const w = width;
  const h = height;

  ctx2d.beginPath();

  ctx2d.moveTo(margin, margin + r1);
  ctx2d.lineTo(margin, h - r1 - margin);

  ctx2d.quadraticCurveTo(margin, h - margin, margin + r2, h - margin);
  ctx2d.lineTo(w - margin - r2, h - margin);

  ctx2d.quadraticCurveTo(w - margin, h - margin, w - margin, h - margin - r1);
  ctx2d.lineTo(w - margin, margin + r1);

  ctx2d.quadraticCurveTo(w - margin, margin, w - margin - r2, margin);
  ctx2d.lineTo(margin + r2, margin);

  ctx2d.quadraticCurveTo(margin, margin, margin, margin + r1);
  ctx2d.closePath();

  if (op === "clip") {
    ctx2d.clip();
  } else if (op === "fill") {
    ctx2d.fill();
  } else {
    ctx2d.stroke();
  }

  ctx2d.restore();
}

export function _getFont_new(
  elem: UIBase,
  size?: number,
  font: string = "DefaultText",
  do_dpi = true
): string {
  const fontObj = elem.getDefault(font) as CSSFont;
  if (fontObj === undefined) {
    console.error(
      "Could not find font " + font + " for element",
      elem,
      "theme style:",
      elem.constructor.define().style ?? "base"
    );
  }

  return fontObj?.genCSS(size) ?? `${size ?? 12}px sans-serif`;
}

export function getFont<T extends UIBase>(
  elem: T,
  size?: number,
  font = "DefaultText",
  do_dpi = true
): string {
  return _getFont_new(elem, size, font, do_dpi);
}

//size is optional, defaults to font's default size
export function _getFont<T extends UIBase>(
  elem: T,
  size?: number,
  font = "DefaultText",
  do_dpi = true
): string {
  if (elem.getDefault(font) === undefined) {
    throw new Error("unknown font " + font);
  }

  return _getFont_new(elem, size, font, do_dpi);
}

export function _ensureFont(
  elem: UIBase,
  canvas: HTMLCanvasElement & { font?: string },
  g: CanvasRenderingContext2D,
  size?: number
): void {
  if (canvas.font) {
    g.font = canvas.font;
  } else {
    const font = elem.getDefault<CSSFont>("DefaultText");
    g.font = font.genCSS(size);
  }
}

let _mc: (HTMLCanvasElement & { g: CanvasRenderingContext2D }) | undefined;

function get_measure_canvas(): HTMLCanvasElement & { g: CanvasRenderingContext2D } {
  if (_mc !== undefined) {
    return _mc;
  }

  const canvas = document.createElement("canvas") as HTMLCanvasElement & {
    g: CanvasRenderingContext2D;
  };
  canvas.width = 256;
  canvas.height = 256;
  canvas.g = canvas.getContext("2d")!;
  _mc = canvas;

  return _mc;
}

export function measureTextBlock(
  elem: UIBase,
  text: string,
  canvas?: HTMLCanvasElement & { font?: string; g?: CanvasRenderingContext2D },
  g?: CanvasRenderingContext2D,
  size?: number,
  font?: CSSFont | string
): { width: number; height: number } {
  const lines = text.split("\n");

  const ret = {
    width : 0,
    height: 0,
  };

  if (size === undefined) {
    if (font !== undefined && typeof font === "object" && font instanceof CSSFont) {
      size = font.size;
    }

    if (size === undefined) {
      size = (elem.getDefault("DefaultText") as CSSFont).size;
    }
  }

  for (const line of lines) {
    const m = measureText(elem, line, canvas, g, size, font);

    ret.width = Math.max(ret.width, m.width);
    const h = m.height !== undefined ? m.height : size * 1.25;

    ret.height += h;
  }

  return ret;
}

export function measureText<CTX extends IContextBase = IContextBase>(
  elem: UIBase<CTX>,
  text: string,
  canvas?:
    | (HTMLCanvasElement & { font?: string; g?: CanvasRenderingContext2D })
    | {
        canvas?: HTMLCanvasElement;
        g?: CanvasRenderingContext2D;
        size?: number;
        font?: CSSFont | string;
      },
  g?: CanvasRenderingContext2D,
  size?: number,
  font?: CSSFont | string
): TextMetrics & { width: number; height?: number } {
  if (
    typeof canvas === "object" &&
    canvas !== null &&
    !(canvas instanceof HTMLCanvasElement) &&
    (canvas as HTMLElement).tagName !== "CANVAS"
  ) {
    const args = canvas as {
      canvas?: HTMLCanvasElement;
      g?: CanvasRenderingContext2D;
      size?: number;
      font?: CSSFont | string;
    };

    canvas = args.canvas as HTMLCanvasElement & { font?: string; g?: CanvasRenderingContext2D };
    g = args.g;
    size = args.size;
    font = args.font;
  }

  if (g === undefined) {
    const mc = get_measure_canvas();
    canvas = mc;
    g = mc.g;
  }

  if (font !== undefined) {
    if (typeof font === "object" && font instanceof CSSFont) {
      font = font.genCSS(size);
    }

    g.font = font;
  } else {
    _ensureFont(elem, canvas as HTMLCanvasElement & { font?: string }, g, size);
  }

  const ret = g.measureText(text);

  if (size !== undefined) {
    //clear custom font for next time
    g.font = "";
  }

  return ret;
}

export function drawText(
  elem: UIBase,
  x: number,
  y: number,
  text: string,
  args: {
    canvas?: HTMLCanvasElement & { font?: string };
    g?: CanvasRenderingContext2D;
    color?: string | number[];
    font?: CSSFont | string;
    size?: number;
  } = {}
): void {
  const canvas = args.canvas;
  const g = args.g;
  let color: string | number[] | undefined = args.color;
  const fontIn: CSSFont | string | undefined = args.font;
  let size = args.size;

  const font = fontIn instanceof CSSFont ? fontIn.genCSS(size) : fontIn;

  if (size === undefined) {
    if (fontIn !== undefined && fontIn instanceof CSSFont) {
      size = fontIn.size;
    } else {
      size = (elem.getDefault("DefaultText") as CSSFont).size;
    }
  }

  size *= getDPI();

  if (color === undefined) {
    if (fontIn instanceof CSSFont && fontIn.color) {
      color = fontIn.color;
    } else {
      color = (elem.getDefault("DefaultText") as CSSFont).color;
    }
  }

  if (font === undefined) {
    _ensureFont(elem, canvas!, g!, size);
  } else if (fontIn instanceof CSSFont) {
    g!.font = fontIn.genCSS(size);
  } else if (font) {
    g!.font = font as string;
  }

  if (typeof color === "object") {
    color = color2css(color);
  }

  g!.fillStyle = color as string;
  g!.fillText(text, x + 0.5, y + 0.5);

  if (size !== undefined) {
    //clear custom font for next time
    g!.font = "";
  }
}
