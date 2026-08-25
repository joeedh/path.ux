import * as util from "../path-controller/util/util";
import { UIBase } from "../core/ui_base";
import { HotKey } from "../path-controller/util/simple_events";
import type { IContextBase } from "../core/context_base";
import type { Screen } from "../screen/FrameManager";
import type { PopupContainer } from "../screen/FrameManager_popup";
import { Menu } from "./menu";
import type { MenuItemCallback, MenuTemplate, MenuTemplateItem } from "./menu_types";
import { menuWrangler } from "./wrangler";

export function createMenu<CTX extends IContextBase = IContextBase>(
  ctx: CTX,
  title: string,
  templ: MenuTemplate
): Menu<CTX> {
  const menu = UIBase.createElement("menu-x") as unknown as Menu<CTX>;
  menu.ctx = ctx;
  menu.setAttribute("name", title);

  const menuSEP = (menu.constructor as typeof Menu).SEP;
  let id = 0;
  const cbs: Record<string | number, () => void> = {};

  const doItem = (item: MenuTemplateItem) => {
    if (item !== undefined && item instanceof Menu) {
      menu.addItem(item);
    } else if (typeof item == "string") {
      let def: { uiname: string; hotkey?: string; icon?: number };
      let hotkey: string | undefined;

      try {
        def = ctx.api.getToolDef(item) as typeof def;
      } catch (error: unknown) {
        menu.addItem("(tool path error)", id++);
        return;
      }

      if (!def.hotkey) {
        try {
          hotkey = ctx.api.getToolPathHotkey(ctx, item) as string | undefined;
        } catch (error: unknown) {
          util.print_stack(error as Error);
          console.warn("error getting hotkey for tool " + item);
          hotkey = undefined;
        }
      } else {
        hotkey = def.hotkey;
      }

      menu.addItemExtra(def.uiname, id, hotkey, def.icon);

      cbs[id] = (function (toolpath: string) {
        return function () {
          ctx.api.execTool(ctx, toolpath);
        };
      })(item);

      id++;
    } else if (item === menuSEP) {
      menu.seperator();
    } else if (typeof item === "function" || item instanceof Function) {
      doItem(
        (item as MenuItemCallback)(document.createElement("div")) as unknown as MenuTemplateItem
      );
    } else if (item instanceof Array) {
      //old array-based api for custom entries
      let hotkey: string | HotKey | undefined =
        item.length > 1 ? (item[2] as string | HotKey | undefined) : undefined;
      const icon = item.length > 2 ? ((item as any)[3] as number | undefined) : undefined;
      const tooltip = item.length > 3 ? ((item as any)[4] as string | undefined) : undefined;
      const id2 = item.length > 4 ? ((item as any)[5] as string | number) : id++;

      if (hotkey !== undefined && hotkey instanceof HotKey) {
        hotkey = hotkey.buildString();
      }

      menu.addItemExtra(item[0], id2, hotkey, icon, undefined, tooltip);

      cbs[id2 as string | number] = (function (cbfunc: Function, arg: string | number) {
        return function () {
          cbfunc(arg);
        };
      })(item[1] as Function, id2 as string | number);
    } else if (typeof item === "object") {
      //new object-based api for custom entries
      const objItem = item as {
        name: string;
        callback: Function;
        hotkey?: string | HotKey;
        icon?: number;
        tooltip?: string;
        id?: string | number;
      };
      const { name, callback, icon, tooltip } = objItem;
      let { hotkey } = objItem;

      const id2 = objItem.id !== undefined ? objItem.id : id++;
      if (hotkey !== undefined && hotkey instanceof HotKey) {
        hotkey = hotkey.buildString();
      }

      menu.addItemExtra(name, id2, hotkey as string | undefined, icon, undefined, tooltip);

      cbs[id2] = (function (cbfunc: Function, arg: string | number) {
        return function () {
          cbfunc(arg);
        };
      })(callback, id2);
    }
  };

  for (const item of templ) {
    doItem(item);
  }

  menu._onselect = (id: string | number) => {
    cbs[id]();
  };

  return menu;
}

export function startMenu(
  menu: Menu,
  x: number,
  y: number,
  searchMenuMode = false,
  safetyDelay = 55
) {
  menuWrangler.endMenus();

  const screen = (menu.ctx as IContextBase).screen as unknown as Screen;
  const con = (menu._popup = screen.popup(
    menu as unknown as UIBase,
    x,
    y,
    false,
    safetyDelay
  ) as unknown as PopupContainer);
  con.noMarginsOrPadding();

  con.add(menu);
  if (searchMenuMode) {
    menu.startFancy();
  } else {
    menu.start();
  }

  menu.flushUpdate();
  menu.flushSetCSS();

  menu._popup.flushUpdate();
  menu._popup.flushSetCSS();
}
