import { test, expect, beforeAll } from "vitest";

import { UIBase, iconmanager, theme } from "../scripts/core/ui_base";
import "../scripts/core/ui";
//the editor builds panels, sliders and colour buttons from the widget registry
import "../scripts/pathux";
import { CSSFont } from "../scripts/core/cssfont";
import type { ThemeRecord } from "../scripts/core/ui_theme";
import { ThemeEditor } from "../scripts/widgets/theme_editor";
import "../scripts/widgets/theme_editor";

beforeAll(() => {
  // resolvePath / theme lookups touch window in node.
  (globalThis as unknown as { window: unknown }).window ||= globalThis;

  // icon widgets render to 2d canvas; happy-dom has no real context.
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext(kind: string): unknown;
  };
  proto.getContext = () =>
    new Proxy(
      {},
      {
        get: (_t, key) => (key === "measureText" ? () => ({ width: 10 }) : () => undefined),
        set: () => true,
      }
    );

  // no iconsheet <img> elements exist in the test DOM; icon CSS lookups
  // dereference sheet.image.src, so give the sheets a stand-in.
  const sheets = (iconmanager as unknown as { iconsheets: { image: unknown }[] }).iconsheets;
  for (const sheet of sheets) {
    sheet.image ||= { src: "" };
  }
});

/**
 * A theme editor built against a scratch style class of the live theme, so the
 * rows under test are the only ones that write it.
 */
function makeEditor(values: ThemeRecord) {
  const cls = "test_" + Object.keys(theme).length;
  theme[cls] = { ...values };

  const editor = UIBase.createElement("theme-editor-x") as ThemeEditor;
  document.body.appendChild(editor);
  editor._init();

  return { editor, cls, rec: theme[cls] as ThemeRecord };
}

/** The panel the editor built for one style class, so rows elsewhere cannot match. */
function classPanel(editor: ThemeEditor, cls: string): UIBase {
  for (const w of editor.traverse(UIBase)) {
    if (w.getAttribute("label") === cls) {
      return w;
    }
  }

  throw new Error("no panel for " + cls);
}

function widgets(root: UIBase, label: string): UIBase[] {
  const found: UIBase[] = [];

  for (const child of root.traverse(UIBase)) {
    const w = child as UIBase & { label?: string };
    if (w.label === label || w.getAttribute("name") === label) {
      found.push(child);
    }
  }

  return found;
}

test("a slider writes the live theme and reports the change", () => {
  const { editor, cls, rec } = makeEditor({ padding: 4 });

  const changes: string[] = [];
  editor.addEventListener("change", (e) => changes.push(`${e.category}.${e.key}`));

  const slider = widgets(classPanel(editor, cls), "padding")[0] as UIBase & {
    value: number;
    on_change: () => void;
  };
  expect(slider).toBeTruthy();
  expect(slider.value).toBe(4);

  slider.value = 12;
  slider.on_change();

  expect(rec.padding).toBe(12);
  expect(changes).toEqual([`${cls}.padding`]);
});

test("a checkbox writes the live theme", () => {
  const { editor, cls, rec } = makeEditor({ dashed: false });

  const check = widgets(classPanel(editor, cls), "dashed")[0] as UIBase & {
    value: boolean;
    on_change: () => void;
  };
  expect(check).toBeTruthy();
  expect(check.value).toBe(false);

  check.value = true;
  check.on_change();

  expect(rec.dashed).toBe(true);
});

test("a font field writes a whole new font rather than mutating the live one", () => {
  const before = new CSSFont({ size: 14, color: "black" });
  const { editor, cls, rec } = makeEditor({ DefaultText: before });

  const slider = widgets(classPanel(editor, cls), "size")[0] as UIBase & {
    value: number;
    on_change: () => void;
  };
  expect(slider).toBeTruthy();

  slider.value = 20;
  slider.on_change();

  const after = rec.DefaultText as CSSFont;
  expect(after).toBeInstanceOf(CSSFont);
  expect(after.size).toBe(20);
  expect(after).not.toBe(before);
  // the font the editor was handed is left as it was
  expect(before.size).toBe(14);
});
