import type { IContextBase } from "../core/context_base";
import { ClassIdSymbol, IUIBaseConstructor } from "../core/ui_base";
import { EnumProperty } from "../path-controller/toolsys/toolprop";
import type { Area, IAreaDef as IAreaDef } from "./ScreenArea";

export interface IAreaConstructor<
  CTX extends IContextBase = IContextBase,
  T extends Area<CTX> = Area<CTX>,
> extends IUIBaseConstructor<T> {
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

/**
 * Whether an area is *offered* — listed in the pane switcher and in the docker's add menu.
 *
 * `AreaFlags.HIDDEN` is the per-class answer to the same question, and it is the right shape for
 * chrome: a header bar is never somewhere the user navigates to, in any application, so the class
 * itself can say so. Which of the remaining editors an application puts on offer is the
 * *application's* policy — it can differ per build, and path.ux has no business knowing why — so
 * it arrives as a filter rather than as another flag.
 *
 * Returning false narrows a menu and nothing else: the class stays registered, `switchEditor`
 * still accepts it, and a stored layout naming it still restores. An editor reached only from an
 * application's own menu entry is exactly the case this exists for.
 */
export type AreaMenuFilter = (areaname: string, def: IAreaDef) => boolean;

let areaMenuFilter: AreaMenuFilter | undefined;

/**
 * Install the application-wide {@link AreaMenuFilter}. Passing `undefined` restores the default,
 * which is to offer everything the `HIDDEN` flag has not already taken out.
 */
export function setAreaMenuFilter(filter?: AreaMenuFilter): void {
  areaMenuFilter = filter;
}

/** The installed filter, if any. Mostly of interest to tests and to an application's own menus. */
export function getAreaMenuFilter(): AreaMenuFilter | undefined {
  return areaMenuFilter;
}

/**
 * The enum of area names a switcher offers. `AreaFlags.HIDDEN` is applied first, then `filter` —
 * an explicit argument, else the one {@link setAreaMenuFilter} installed. An argument wins over
 * the global so a caller with its own policy is not fighting one it did not set.
 */
export function makeAreasEnum(filter?: AreaMenuFilter) {
  const areas: Record<string, string> = {};
  const icons: Record<string, number> = {};
  const offered = filter ?? areaMenuFilter;

  for (const k in areaclasses) {
    const cls = areaclasses[k];
    const def = cls.define();

    if ((def.flag ?? 0) & AreaFlags.HIDDEN) continue;
    if (offered && !offered(k, def)) continue;

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
