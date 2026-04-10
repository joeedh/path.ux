import type { IContextBase } from "../core/context_base";
import { ClassIdSymbol, IUIBaseConstructor } from "../core/ui_base";
import { EnumProperty } from "../path-controller/toolsys/toolprop";
import type { Area, IAreaDef as IAreaDef } from "./ScreenArea";

export interface IAreaConstructor<CTX extends IContextBase = IContextBase, T extends Area<CTX> = Area<CTX>>
  extends IUIBaseConstructor<T> {
  new (): T;
  /** internal API type, do not use. */
  [ClassIdSymbol]?: string;
  define(): IAreaDef;
}

// TS makes dealing with constructor typing so absurdly stupid, just use any
export type AreaConstructorParam = any;

export const AreaFlags = {
  HIDDEN                : 1,
  FLOATING              : 2,
  INDEPENDENT           : 4, //area is indpendent of the screen mesh
  NO_SWITCHER           : 8,
  NO_HEADER_CONTEXT_MENU: 16,
  NO_COLLAPSE           : 32,
};

export const areaclasses: { [key: string]: IAreaConstructor } = {};

export function getAreaConstructor<CTX extends IContextBase = IContextBase>(area: Area<CTX>) {
  return area.constructor as unknown as IAreaConstructor;
}

export function makeAreasEnum() {
  const areas: Record<string, string> = {};
  const icons: Record<string, number> = {};

  for (const k in areaclasses) {
    const cls = areaclasses[k];
    const def = cls.define();

    if ((def.flag ?? 0) & AreaFlags.HIDDEN) continue;

    let uiname: string | undefined = def.uiname;

    if (uiname === undefined) {
      uiname = k.replace("_", " ").toLowerCase();
      uiname = uiname[0].toUpperCase() + uiname.slice(1, uiname.length);
    }

    areas[uiname] = k;
    icons[uiname] = def.icon !== undefined ? def.icon : -1;
  }

  const prop = new EnumProperty(undefined, areas);
  prop.addIcons(icons);

  return prop;
}
