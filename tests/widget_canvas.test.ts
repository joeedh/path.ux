import { test, expect, vi } from "vitest";
import cconst from "../scripts/config/const";
import { widgetContext2D } from "../scripts/core/base/ui_canvas";

test("small widgets draw on software canvases unless the app turns that off", () => {
  const getContext = vi.fn();
  const canvas = { getContext } as unknown as HTMLCanvasElement;
  for (const on of [true, false]) {
    cconst.softwareCanvases = on;
    widgetContext2D(canvas);
    expect(getContext).toHaveBeenLastCalledWith("2d", { willReadFrequently: on });
  }
  cconst.softwareCanvases = true;
});
