import cconst from "../../config/const";

/** Answers the 2D context of a small widget's canvas, following `cconst.softwareCanvases`. */
export function widgetContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext("2d", { willReadFrequently: cconst.softwareCanvases });
}
