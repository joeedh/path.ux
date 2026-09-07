import { beforeAll, describe, expect, test } from "vitest";
import cconst from "../scripts/config/const";
import type { UIBase } from "../scripts/core/ui_base";
import { newMenu } from "../scripts/menu/menu";
import { tooltipText } from "../scripts/core/base/ui_base_props";
import type { Refusal } from "../scripts/path-controller/toolsys/toolop";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

/**
 * A real, fully constructed widget. `menu-x` is registered and is a UIBase like any other, so
 * the disable path runs its actual theme lookups rather than a stub's.
 */
function widget(): UIBase {
  return newMenu("refusal test") as unknown as UIBase;
}

describe("tooltipText", () => {
  test("is the description alone while the control is enabled", () => {
    const elem = widget();
    elem._description_final = "Delete the selected nodes";
    elem._refusalReason = { reason: "nothing is selected" };

    // The reason stays hidden until the control actually refuses
    expect(tooltipText(elem)).toBe("Delete the selected nodes");
  });

  test("puts the refusal above the description once disabled", () => {
    const elem = widget();
    elem._description_final = "Delete the selected nodes";
    elem._refusalReason = { reason: "nothing is selected" };
    elem.disabled = true;

    expect(tooltipText(elem)).toBe("nothing is selected\n\nDelete the selected nodes");
  });

  test("includes the long description", () => {
    const elem = widget();
    elem._description_final = "Add a node";
    elem.disabled = true;
    elem._refusalReason = {
      reason     : "this graph is a group instance",
      description: "Group instances take value edits only.",
    };

    expect(tooltipText(elem)).toBe(
      "this graph is a group instance\n\nGroup instances take value edits only.\n\nAdd a node"
    );
  });

  test("a control with only a refusal still gets a tooltip", () => {
    const elem = widget();
    elem.disabled = true;
    elem._refusalReason = { reason: "no document is open" };

    // An icon button with no description would otherwise hover silently
    expect(tooltipText(elem)).toBe("no document is open");
  });

  test("resolves a thunk on read, not on assignment", () => {
    const elem = widget();
    let calls = 0;
    let answer: Refusal | undefined = { reason: "first" };

    elem.disabled = true;
    elem.refusalReason = () => {
      calls++;
      return answer;
    };

    const afterAssignment = calls;
    expect(tooltipText(elem)).toBe("first");

    // State moved after the widget was set up, and the tooltip follows it
    answer = { reason: "second" };
    expect(tooltipText(elem)).toBe("second");
    expect(calls).toBeGreaterThan(afterAssignment);
  });

  test("follows disabled flipping with no reassignment", () => {
    const elem = widget();
    elem._description_final = "Undo";
    elem._refusalReason = { reason: "there is nothing to undo" };

    expect(tooltipText(elem)).toBe("Undo");

    // The bug this replaced: composing at set time left the enabled text in place here
    elem.disabled = true;
    expect(tooltipText(elem)).toBe("there is nothing to undo\n\nUndo");

    elem.disabled = false;
    expect(tooltipText(elem)).toBe("Undo");
  });

  test("a thunk answering undefined refuses without a sentence", () => {
    const elem = widget();
    elem._description_final = "Run";
    elem.disabled = true;
    elem.refusalReason = () => undefined;

    expect(tooltipText(elem)).toBe("Run");
  });
});

describe("native tooltips", () => {
  test("the title is re-composed when disabled flips", () => {
    const native = cconst.useNativeToolTips;
    cconst.useNativeToolTips = true;

    try {
      const elem = widget();
      const titles: string[] = [];
      Object.defineProperty(elem, "title", {
        get: () => titles[titles.length - 1] ?? "",
        set: (v: string) => titles.push(v),
      });

      elem._description_final = "Undo";
      elem._refusalReason = { reason: "there is nothing to undo" };

      // Nothing reassigns the description here; the disable itself has to refresh the title
      elem.disabled = true;
      expect(elem.title).toBe("there is nothing to undo\n\nUndo");

      elem.disabled = false;
      expect(elem.title).toBe("Undo");
    } finally {
      cconst.useNativeToolTips = native;
    }
  });
});
