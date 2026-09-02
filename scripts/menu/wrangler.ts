import * as util from "../path-controller/util/util";
import cconst from "../config/const";
import { keymap } from "../path-controller/util/simple_events";
import { DomEventTypes } from "../path-controller/util/events";
import type { UIBase } from "../core/ui_base";
import type { IContextBase } from "../core/context_base";
import type { Screen } from "../screen/FrameManager";
import { Menu } from "./menu";
import { DropBox } from "./dropbox";

function debugmenu(...args: unknown[]) {
  if (window.DEBUG?.menu) {
    console.warn("%cmenu:", "color:blue", ...args);
  }
}

/* Window augmentations for _menuWrangler, menu, _startMenuEventWrangling
 * are already declared in global.d.ts — use type assertions when setting. */

export class MenuWrangler {
  screen: Screen | undefined;
  menustack: Menu[];
  lastPickElemTime: number;
  _closetimer: number;
  closeOnMouseUp: boolean | undefined;
  closereq: Menu | undefined;
  timer: ReturnType<typeof setInterval> | undefined;
  spawnreq: unknown;

  [k: string]: unknown;

  constructor() {
    this.screen = undefined;
    this.menustack = [];

    this.lastPickElemTime = util.time_ms();

    this._closetimer = 0;
    this.closeOnMouseUp = undefined;
    this.closereq = undefined;

    this.timer = undefined;
  }

  get closetimer() {
    return this._closetimer;
  }

  set closetimer(v) {
    debugmenu("set closertime", v);
    this._closetimer = v;
  }

  get menu() {
    return this.menustack.length > 0 ? this.menustack[this.menustack.length - 1] : undefined;
  }

  /** Restarts the mouse-out close countdown and withdraws a pending close request. */
  _resetCloseTimer() {
    this.closetimer = util.time_ms();
    this.closereq = undefined;
  }

  /**
   * Returns the screen and page coordinates for an event's element pick. Returns undefined
   * when no menu or screen is live, restarting the close countdown (a pending close request
   * is deliberately left standing).
   */
  _pickPreamble(e: PointerEvent): { screen: Screen; x: number; y: number } | undefined {
    if (this.menu === undefined || this.screen === undefined) {
      this.closetimer = util.time_ms();
      return undefined;
    }

    return { screen: this.screen, x: e.pageX, y: e.pageY };
  }

  pushMenu(menu: Menu) {
    debugmenu("pushMenu");

    this.spawnreq = undefined;

    // Assigned rather than latched: the flag belongs to the root menu, so a
    // menu that opts out does not inherit the previous root menu's opt-in.
    if (this.menustack.length === 0) {
      this.closeOnMouseUp = menu.closeOnMouseUp === true;
    }

    this.menustack.push(menu);
  }

  popMenu(_menu?: Menu) {
    debugmenu("popMenu");

    return this.menustack.pop();
  }

  endMenus() {
    debugmenu("endMenus");

    for (const menu of this.menustack) {
      menu.close();
    }

    this.menustack = [];
  }

  searchKeyDown(e: KeyboardEvent) {
    const menu = this.menu;
    if (!menu) return;

    e.stopPropagation();
    menu._ignoreFocusEvents = true;
    menu.textbox.focus();
    menu._ignoreFocusEvents = false;

    switch (e.keyCode) {
      case keymap["Enter"]: //return key
        menu.click();
        break;
      case keymap["Escape"]: //escape key
        menu.close();
        break;
      case keymap["Up"]:
        menu.selectPrev(false);
        break;
      case keymap["Down"]:
        menu.selectNext(false);
        break;
    }
  }

  on_keydown(e: KeyboardEvent) {
    window.menu = this.menu;

    if (this.menu === undefined) {
      return;
    }

    if (this.menu.hasSearchBox) {
      return this.searchKeyDown(e);
    }

    const menu = this.menu;

    switch (e.keyCode) {
      case keymap["Left"]: //left
      case keymap["Right"]: //right
        if (menu._dropbox) {
          let dropbox: Element | null = menu._dropbox as unknown as Element;

          if (e.keyCode === keymap["Left"]) {
            dropbox = dropbox.previousElementSibling;
          } else {
            dropbox = dropbox.nextElementSibling;
          }

          if (dropbox !== null && dropbox instanceof DropBox) {
            this.endMenus();
            (dropbox as unknown as DropBox)._onpress(e);
          }
        }
        break;
      case keymap["Up"]: //up
        menu.selectPrev();
        break;
      case keymap["Down"]: //down
        menu.selectNext();
        break;
      case 13: //return key
      case 32: //space key
        menu.click();
        break;
      case 27: //escape key
        menu.close();
        break;
    }
  }

  on_pointerdown(e: PointerEvent) {
    const pick = this._pickPreamble(e);
    if (!pick) {
      return;
    }

    const { screen, x, y } = pick;

    const element = screen.pickElement(x, y);

    if (element !== undefined && (element instanceof DropBox || util.isMobile())) {
      this.endMenus();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  on_pointerup(e: PointerEvent) {
    const pick = this._pickPreamble(e);
    if (!pick) {
      return;
    }

    const { screen, x, y } = pick;

    let element = screen.pickElement(x, y, undefined, undefined, DropBox);
    if (element !== undefined) {
      this.closeOnMouseUp = false;
    } else {
      element = screen.pickElement(x, y, undefined, undefined, Menu);

      //closeOnMouseUp
      if (element && this.closeOnMouseUp) {
        element.click();
      }
    }
  }

  findMenu(x: number, y: number) {
    const screen = this.screen;
    if (!screen) return undefined;

    const element = screen.pickElement(x, y);

    if (element === undefined) {
      return;
    }

    if (element instanceof Menu) {
      return element;
    }

    let w = element as UIBase | undefined;

    while (w) {
      if (w instanceof Menu) {
        return w;
      }

      w = w.parentWidget;
    }

    return undefined;
  }

  on_pointermove(e: PointerEvent) {
    if (this.menu?.hasSearchBox) {
      this._resetCloseTimer();
      return;
    }

    if (this.menu === undefined || this.screen === undefined) {
      this._resetCloseTimer();
      return;
    }

    const screen = this.screen;
    const x = e.pageX;
    const y = e.pageY;

    let element: UIBase | undefined;
    const menu = this.menu;

    if (menu) {
      const r = menu.getBoundingClientRect();
      const pad = 15;

      if (
        r &&
        x >= r.x - pad &&
        y >= r.y - pad &&
        x <= r.x + r.width + pad * 2 &&
        y <= r.y + r.height + pad * 2
      ) {
        element = menu;
      }
    }

    if (!element) {
      element = screen.pickElement(x, y);
      this.lastPickElemTime = util.time_ms();
    }

    if (element === undefined) {
      return;
    }

    if (element instanceof Menu) {
      this._resetCloseTimer();
      return;
    }

    const getRootMenu = (menu: Menu): Menu => {
      while (menu.parentMenu) {
        menu = menu.parentMenu;
      }
      return menu;
    };

    type DropBoxLike = UIBase & { menu?: Menu; _onpress?(e: PointerEvent): void };
    const elem = element as DropBoxLike;

    let destroy = elem.hasAttribute("menu-button") && element.hasAttribute("simple");
    destroy = destroy && getRootMenu(this.menu).srcWidget !== elem;

    if (destroy) {
      //destroy entire menu stack
      this.endMenus();

      this._resetCloseTimer();

      //start new menu
      elem._onpress?.(e);
      return;
    }

    let ok = false;

    let w: DropBoxLike | undefined = elem;
    while (w) {
      if (w instanceof Menu) {
        ok = true;
        break;
      }

      if (
        w.hasAttribute("menu-button") &&
        (w.menu === getRootMenu(this.menu) ||
          w.getAttribute("menu-id") === getRootMenu(this.menu).id)
      ) {
        ok = true;
        break;
      }

      w = w.parentWidget as DropBoxLike | undefined;
    }

    if (!ok) {
      this.closereq = this.menu;
    } else {
      this._resetCloseTimer();
    }
  }

  update() {
    let closetime: number | undefined = cconst.menu_close_time;
    closetime = closetime === undefined ? 50 : closetime;

    let close = this.closereq && this.closereq === this.menu;
    close = close && util.time_ms() - this.closetimer > closetime;

    if (close) {
      this.closereq = undefined;
      this.endMenus();
    }
  }

  startTimer() {
    if (this.timer) {
      this.stopTimer();
    }

    this.timer = setInterval(() => {
      debugmenu("start menu wrangler interval");

      this.update();
    }, 150);
  }

  stopTimer() {
    if (this.timer) {
      debugmenu("stop menu wrangler interval");

      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

export const menuWrangler = new MenuWrangler();
window._menuWrangler = menuWrangler;
let wranglerStarted = false;

export function startMenuEventWrangling(screen?: Screen) {
  if (typeof document === "undefined") {
    // inside a worker?
    return;
  }
  menuWrangler.screen = screen;

  if (wranglerStarted) {
    return;
  }

  wranglerStarted = true;

  for (const k in DomEventTypes) {
    if (menuWrangler[k] === undefined) {
      continue;
    }

    const eventType = (DomEventTypes as Record<string, string>)[k];
    const handler = (menuWrangler[k] as Function).bind(menuWrangler) as EventListener;
    window.addEventListener(eventType, handler, { passive: false, capture: true });
  }

  menuWrangler.screen = screen;
  menuWrangler.startTimer();
}

window._startMenuEventWrangling = startMenuEventWrangling;

export function setWranglerScreen<CTX extends IContextBase>(screen: Screen<CTX> | undefined) {
  startMenuEventWrangling(screen as unknown as Screen);
}

export function getWranglerScreen() {
  return menuWrangler.screen;
}
