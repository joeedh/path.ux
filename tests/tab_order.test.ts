import { test, expect, vi } from "vitest";
import { regenTabOrder } from "../scripts/core/base/ui_base_dom";
import { Screen } from "../scripts/screen/FrameManager";

test("changes put the tab order off, but not forever", () => {
  // the real one with nothing to visit
  const calcTabOrder = vi.fn(() => {
    Screen.prototype.calcTabOrder.call(screen as unknown as Screen);
  });
  const screen = {
    needsTabRecalc: false,
    tabRecalcTime : 0,
    tabRecalcLimit: 0,
    childNodes    : [],
    _popups       : [],
    sareas        : [],
    _do_updateSize: false,
    update_intern : () => [][Symbol.iterator](),
    calcTabOrder,
  };
  const update = () => Screen.prototype.update.call(screen as unknown as Screen);
  const elem = { getScreen: () => screen } as unknown as Parameters<typeof regenTabOrder>[0];
  const now = vi.spyOn(performance, "now");

  for (let t = 5000; t < 5900; t += 100) {
    now.mockReturnValue(t);
    regenTabOrder(elem);
    expect(screen.tabRecalcTime).toBe(Math.min(t + 200, 6000));
    update();
  }
  expect(calcTabOrder).not.toHaveBeenCalled();
  now.mockReturnValue(6000);
  update();
  update();
  expect(calcTabOrder).toHaveBeenCalledTimes(1);

  now.mockReturnValue(7000);
  regenTabOrder(elem);
  expect(screen.tabRecalcTime).toBe(7200);
  now.mockReturnValue(7200);
  update();
  expect(calcTabOrder).toHaveBeenCalledTimes(2);

  // a caller that recalculates by itself leaves nothing behind
  regenTabOrder(elem);
  screen.calcTabOrder();
  expect(screen).toMatchObject({ needsTabRecalc: false, tabRecalcTime: 0, tabRecalcLimit: 0 });
  calcTabOrder.mockClear();

  // a direct request isn't put off, and leaves no limit behind for later ones
  screen.needsTabRecalc = true;
  update();
  expect(calcTabOrder).toHaveBeenCalledTimes(1);
  now.mockReturnValue(9000);
  regenTabOrder(elem);
  expect(screen.tabRecalcTime).toBe(9200);
  now.mockRestore();
});
