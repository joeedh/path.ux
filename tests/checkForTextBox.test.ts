import { beforeAll, describe, expect, test } from "vitest";
import { UIBase } from "../scripts/core/ui_base";
import { checkForTextBox, TextBox } from "../scripts/widgets/ui_textbox";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window ||= globalThis;
});

/** A screen whose pointer is over `under`. */
function screenOver(under: Element) {
  return { pickElement: () => under } as unknown as UIBase;
}

function textbox(): TextBox {
  const box = UIBase.createElement("textbox-x") as TextBox;
  document.body.appendChild(box);
  return box;
}

describe("checkForTextBox", () => {
  test("a text box under the pointer without the focus leaves the keymaps running", () => {
    const box = textbox();
    expect(checkForTextBox(screenOver(box), 0, 0)).toBe(false);
    box.remove();
  });

  test("a focused text box under the pointer blocks the keymaps", () => {
    const box = textbox();
    box.dom.focus();
    expect(checkForTextBox(screenOver(box), 0, 0)).toBe(true);
    box.dom.blur();
    box.remove();
  });

  test("a focused text box blocks the keymaps wherever the pointer is", () => {
    const box = textbox();
    const elsewhere = document.createElement("div");
    document.body.appendChild(elsewhere);
    box.dom.focus();
    expect(checkForTextBox(screenOver(elsewhere), 0, 0)).toBe(true);
    box.dom.blur();
    box.remove();
    elsewhere.remove();
  });
});
