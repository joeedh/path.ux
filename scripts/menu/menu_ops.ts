import * as util from "../path-controller/util/util";
import { UIBase } from "../core/ui_base";
import { HotKey } from "../path-controller/util/simple_events";
import { toolopRefusal } from "../path-controller/toolsys/toolop";
import type { IToolOpConstructor, Refusal, ToolOp } from "../path-controller/toolsys/toolop";
import type { IContextBase } from "../core/context_base";
import type { Screen } from "../screen/FrameManager";
import type { PopupContainer } from "../screen/FrameManager_popup";
import { ensureMeta, PathToolMeta, StdUXMeta } from "../core/base/ui_meta_tags";
import { Menu, newMenu } from "./menu";
import type {
  MenuItemCallback,
  MenuTemplate,
  MenuTemplateEntry,
  MenuTemplateItem,
} from "./menu_types";
import { menuWrangler } from "./wrangler";

/**
 * The refusal for a toolpath row, or undefined when it may run. The instance is built because
 * `canRun` is handed one — several ops answer permissively without it — and an `invoke` override
 * that throws leaves the row enabled rather than killing the menu.
 */
function toolpathRefusal<CTX extends IContextBase>(
  ctx: CTX,
  toolpath: string
): Refusal | undefined | Promise<Refusal | undefined> {
  let cls: IToolOpConstructor;
  let toolop: ToolOp | undefined;

  try {
    cls = ctx.api.parseToolPath(toolpath) as unknown as IToolOpConstructor;
    if (!cls) {
      return undefined;
    }
    toolop = ctx.api.createTool(ctx, toolpath) as unknown as ToolOp;
  } catch (error: unknown) {
    util.print_stack(error as Error);
    console.warn("could not build " + toolpath + " to ask whether it can run");
    return undefined;
  }

  return toolopRefusal(ctx as never, cls, toolop as never);
}

export function createMenu<CTX extends IContextBase = IContextBase>(
  ctx: CTX,
  title: string,
  templ: MenuTemplate
): Menu<CTX> {
  const menu = newMenu(title, ctx);

  const menuSEP = (menu.constructor as typeof Menu).SEP;
  let id = 0;
  const cbs: Record<string | number, () => unknown> = {};
  const pending: Promise<void>[] = [];

  const bindCallback = (cbfunc: Function, arg: string | number) => {
    return function () {
      return cbfunc(arg);
    };
  };

  /**
   * Applies a refusal to a row already added. An answer that has not arrived disables the row
   * until it does: enabling late would leave a window in which the click runs anyway.
   */
  const applyRefusal = (
    itemId: string | number,
    refusal: Refusal | undefined | Promise<Refusal | undefined>
  ) => {
    if (!(refusal instanceof Promise)) {
      if (refusal !== undefined) {
        menu.setItemDisabled(itemId, refusal);
      }
      return;
    }

    menu.setItemDisabled(itemId);
    pending.push(
      refusal.then((settled) => {
        if (settled === undefined) {
          menu.setItemEnabled(itemId);
        } else {
          menu.setItemDisabled(itemId, settled);
        }
      })
    );
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
      applyRefusal(id, toolpathRefusal(ctx, item));

      // addItemExtra keeps only the id, so the row has to be fetched back to be tagged
      const row = menu.itemById(id);
      if (row) {
        ensureMeta(row, StdUXMeta).tools.push(new PathToolMeta(item));
      }

      cbs[id] = () => {
        return ctx.api.execTool(ctx, item);
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

      if (objItem.disabled) {
        menu.setItemDisabled(id2);
      } else if (objItem.validate) {
        const verdict = objItem.validate(ctx);
        if (verdict !== true) {
          menu.setItemDisabled(id2, verdict);
        }
      }

      cbs[id2] = bindCallback(callback, id2);
    }
  };

  for (const item of templ) {
    doItem(item);
  }

  if (pending.length) {
    menu.pendingValidation = Promise.all(pending).then(() => {});
  }

  // A returned promise is caught by the dispatcher, which is the one authority for it
  menu._onselect = (id: string | number) => cbs[id]();

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
  // let the menu wrangler deal with close-on-mouse behaviours
  con.stopEvents();
  con.overrideClass("menu");
  con.setCSS();

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
