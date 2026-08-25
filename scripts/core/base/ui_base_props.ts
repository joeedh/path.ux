import cconst from "../../config/const";
import type { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

export function setParentWidget(elem: AnyUIBase, val: AnyUIBase | undefined): void {
  if (val) {
    elem._wasAddedToNodeAtSomeTime = true;
  }

  elem._parentWidget = val;
}

export function getUseDataPathUndo(elem: AnyUIBase): boolean {
  let p: AnyUIBase | undefined = elem;

  while (p) {
    if (p._useDataPathUndo !== undefined) {
      return p._useDataPathUndo;
    }
    p = p.parentWidget;
  }

  /* Default to true. */
  return true;
}

export function setDescription(elem: AnyUIBase, val: string | undefined | null): void {
  if (val === null) {
    elem._description = undefined;
    return;
  }

  elem._description = val;

  if (val === undefined) {
    return;
  }

  if (cconst.showPathsInToolTips && elem.hasAttribute("datapath")) {
    let s = "" + elem._description;

    const path = elem.getAttribute("datapath");
    s += "\n    path: " + path;

    if (elem.hasAttribute("mass_set_path")) {
      const m = elem.getAttribute("mass_set_path");
      s += "\n    massSetPath: " + m;
    }

    elem._description_final = s;
  } else {
    elem._description_final = elem._description;
  }

  if (cconst.useNativeToolTips) {
    elem.title = "" + elem._description_final;
  }
}

export function setBackground(elem: AnyUIBase, bg: string | undefined): void {
  elem.__background = bg;

  if (bg !== undefined) {
    elem.overrideDefault("background-color", bg, true);
    elem.saneStyle["backgroundColor"] = bg;
  } else {
    elem.clearOverride("background-color");
  }
}

export function getDisabled(elem: AnyUIBase): boolean {
  if (elem.parentWidget?.disabled) {
    return true;
  }

  return !!elem._client_disabled_set || !!elem._internalDisabled;
}

export function setCtx(elem: AnyUIBase, c: unknown): void {
  elem._ctx = c;

  elem._forEachChildWidget((n) => {
    n.ctx = c;
  });
}

export function getZoom(elem: AnyUIBase): number {
  if (elem.parentWidget !== undefined) {
    return elem.parentWidget.getZoom();
  }

  return 1.0;
}

export function getDPI(elem: AnyUIBase, staticGetDPI: () => number): number {
  if (elem.parentWidget !== undefined) {
    return elem.parentWidget.getDPI();
  }

  return staticGetDPI();
}

export function toJSON(elem: AnyUIBase): Record<string, unknown> {
  const ret: Record<string, unknown> = {};

  if (elem.hasAttribute("datapath")) {
    ret.datapath = elem.getAttribute("datapath");
  }

  return ret;
}

export function clearOverride(elem: AnyUIBase, key: string, localOnly: boolean): void {
  delete elem.my_default_overrides[key];
  if (!localOnly) delete elem.default_overrides[key];
}

export function overrideDefault(
  elem: AnyUIBase,
  key: string,
  val: unknown,
  localOnly: boolean
): void {
  elem.my_default_overrides[key] = val;

  if (!localOnly) {
    elem.default_overrides[key] = val;
  }
}

export function overrideClassDefault(
  elem: AnyUIBase,
  style: string,
  key: string,
  val: unknown
): void {
  if (!(style in elem.class_default_overrides)) {
    elem.class_default_overrides[style] = {};
  }

  elem.class_default_overrides[style][key] = val;
}
