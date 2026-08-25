import * as util from "../path-controller/util/util";
import { UIBase } from "../core/ui_base";
import { HotKey } from "../path-controller/util/simple_events";
import type { IContextBase } from "../core/context_base";
import type { Screen } from "../screen/FrameManager";
import type { PopupContainer } from "../screen/FrameManager_popup";
import { Menu, newMenu } from "./menu";
import type {
  MenuItemCallback,
  MenuTemplate,
  MenuTemplateEntry,
  MenuTemplateItem,
} from "./menu_types";
import { menuWrangler } from "./wrangler";

export function createMenu<CTX extends IContextBase = IContextBase>(
  ctx: CTX,
  title: string,
  templ: MenuTemplate
): Menu<CTX> {
  const menu = newMenu(title, ctx);

  const menuSEP = (menu.constructor as typeof Menu).SEP;
  let id = 0;
  const cbs: Record<string | number, () => void> = {};

  const bindCallback = (cbfunc: Function, arg: string | number) => {
    return function () {
      cbfunc(arg);
    };
  };

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

      cbs[id] = () => {
        ctx.api.execTool(ctx, item);
      };

      id++;
    } else if (item === menuSEP) {
      menu.seperator();
    } else if (typeof item === "function" || item instanceof Function) {
      doItem(
        (item as MenuItemCallback)(document.createElement("div")) as unknown as MenuTemplateItem
      );
    } else if (item instanceof Array) {
      // Old array-based custom entries, normalized into the object form. The off-by-one
      // length guards (`> 1` reads index 2, and so on) are load-bearing for consumers
      // and are kept as-is, as is `item[5]` carrying an explicit id.
      doItem({
        name    : item[0],
        callback: item[1],
        hotkey  : item.length > 1 ? (item[2] as string | HotKey | undefined) : undefined,
        icon    : item.length > 2 ? ((item as any)[3] as number | undefined) : undefined,
        tooltip : item.length > 3 ? ((item as any)[4] as string | undefined) : undefined,
        id      : item.length > 4 ? ((item as any)[5] as string | number) : undefined,
      } as MenuTemplateEntry);
    } else if (typeof item === "object") {
      //object-based api for custom entries
      const objItem = item as MenuTemplateEntry;
      const { name, callback, icon, tooltip } = objItem;
      let { hotkey } = objItem;

      const id2 = objItem.id !== undefined ? objItem.id : id++;
      if (hotkey !== undefined && hotkey instanceof HotKey) {
        hotkey = hotkey.buildString();
      }

      menu.addItemExtra(name, id2, hotkey as string | undefined, icon, undefined, tooltip);

      cbs[id2] = bindCallback(callback, id2);
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

/**
 * Opens `menu` in a screen popup owned by `owner` and starts it, in search mode when
 * `search` is set. Stores the popup on `menu._popup` and returns it.
 */
export function openMenuPopup(
  menu: Menu,
  screen: Screen,
  owner: UIBase,
  x: number,
  y: number,
  opts: { search?: boolean; safetyDelay?: number } = {}
): PopupContainer {
  const { search = false, safetyDelay = 0 } = opts;

  const con = (menu._popup = screen.popup(
    owner,
    x,
    y,
    false,
    safetyDelay
  ) as unknown as PopupContainer);
  con.noMarginsOrPadding();

  con.add(menu);
  if (search) {
    menu.startSearch();
  } else {
    menu.start();
  }

  return con;
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
  openMenuPopup(menu, screen, menu as unknown as UIBase, x, y, {
    search: searchMenuMode,
    safetyDelay,
  });

  menu.flushUpdate();
  menu.flushSetCSS();

  menu._popup!.flushUpdate();
  menu._popup!.flushSetCSS();
}
