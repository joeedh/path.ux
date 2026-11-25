/**
 * Answers the 2D context of a small widget's canvas. Chromium gives each accelerated canvas a compositor
 * layer of its own, which makes a page with hundreds of sliders slow to pan, so these canvases
 * are drawn in software.
 */
export function widgetContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext("2d", { willReadFrequently: true });
}
