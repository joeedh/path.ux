import { UIBase, saveUIData, loadUIData } from "../core/ui_base";

import * as util from "../path-controller/util/util";
import cconst from "../config/const";

import { Vector2 } from "../path-controller/util/vectormath";
import { Container } from "../core/ui";
import type { Area, ScreenArea } from "./ScreenArea";
import { Icons } from "../core/ui_base";

import { type Menu, startMenu } from "../widgets/ui_menu";
import { ToolProperty } from "../path-controller/toolsys/toolprop";
import type { IContextBase } from "../core/context_base";
import type { TabContainer, TabItem } from "../widgets/ui_tabs";
import { areaclasses, getAreaConstructor, makeAreasEnum } from "./area_base";

function dockerdebug(...args: any[]) {
  if (cconst.DEBUG.areadocker) {
    console.warn(...args);
  }
}

export const testSnapScreenVerts = function (
  fitToSize: boolean,
  ctx: IContextBase & { propsbar: Area<IContextBase> }
) {
  const screen = ctx.screen;

  screen.unlisten();
  screen.on_resize([screen.size[0] - 75, screen.size[1]], screen.size);
  screen.on_resize = screen.updateSize = () => {};

  const p = ctx.propsbar;
  p.pos![0] += 50;
  p.owning_sarea!.loadFromPosSize();
  screen.regenBorders();

  screen.size[0] = window.innerWidth - 5;

  screen.snapScreenVerts(fitToSize);
};

export class AreaDocker<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  _last_update_key: string | undefined;
  mpos: InstanceType<typeof Vector2>;
  needsRebuild: boolean;
  ignoreChange: number;
  tbar!: TabContainer<CTX>;
  addicon!: TabItem<CTX>;
  /** Currently-open add-editor menu attached to the `+` icon, if any. */
  addMenu: Menu<CTX> | undefined;

  constructor() {
    super();

    this._last_update_key = undefined;
    this.mpos = new Vector2();
    this.needsRebuild = true;
    this.ignoreChange = 0;
  }

  static define() {
    return {
      tagname: "area-docker-x",
      style  : "areadocker",
    };
  }

  rebuild() {
    if (!this.parentWidget) {
      return;
    }

    const sarea = this.getScreenArea();
    if (!sarea) {
      this.needsRebuild = true;
      return;
    }

    this.needsRebuild = false;
    this.ignoreChange++;

    dockerdebug("Rebuild", this.getArea());

    const uidata = (sarea.switcherData = saveUIData(this, "switcherTabs"));

    this.clear();

    const tabs = (this.tbar = this.tabs() as unknown as TabContainer<CTX>);
    tabs.on_change = this.tab_onchange.bind(this);

    dockerdebug(sarea._id, sarea.area ? sarea.area._id : "(no active area)", sarea.editors);

    sarea.switcherData = uidata;

    for (const editor of sarea.editors) {
      if (editor.closed) {
        continue;
      }

      const def = getAreaConstructor(editor).define();
      let name = def.uiname;

      if (!name) {
        name = def.areaname || def.tagname.replace(/-x/, "");
        name = ToolProperty.makeUIName(name);
      }

      const tab = tabs.tab(name, editor._id);
      const tabItem = tab._tab;

      tabItem.closable = true;
      tabItem.ontabclose = () => this.closeEditor(editor);
      tabItem.ontabcontextmenu = (e) => this.openTabContextMenu(editor, e);

      tabItem.addEventListener("tabdragstart", (e) => {
        dockerdebug("tab drag start!", e);
      });
      tabItem.addEventListener("tabdragmove", (e) => {
        this.mpos.loadXY(e.x, e.y);

        const rect = this.tbar.tbar.canvas.getBoundingClientRect();

        const m = 8;
        if (
          e.x < rect.x - m ||
          e.x > rect.x + rect.width + m ||
          e.y < rect.y - m ||
          e.y >= rect.y + rect.height + m
        ) {
          dockerdebug("tab detach!");
          e.preventDefault(); //end dragging
          this.detach(e);
        }
      });
      tabItem.addEventListener("tabdragend", (e) => {
        this.mpos.loadXY(e.x, e.y);
        dockerdebug("tab drag end!", e);
      });
    }

    const addTab = this.tbar.icontab(Icons.SMALL_PLUS, "add", "Add Editor").noSwitch();
    addTab._tab.overrideDefault("iconPaddingRight", 8);

    dockerdebug("Add Menu Tab", addTab);

    const icon = (this.addicon = addTab._tab);

    icon.ontabclick = (e: PointerEvent) => this.on_addclick(e);
    icon.setAttribute("menu-button", "true");
    icon.setAttribute("simple", "true");

    this.loadTabData(uidata);

    this.ignoreChange--;
  }

  detach(event: PointerEvent) {
    this.tbar._ensureNoModal();

    const area = this.getArea();
    const sarea = this.ctx.screen.floatArea(area);

    sarea.size.min(new Vector2().loadXY(300, 300));
    sarea.loadFromPosSize();

    const mpos = event ? new Vector2([event.x, event.y]) : this.mpos;

    dockerdebug("EVENT", event);

    if (event && event instanceof PointerEvent) {
      this.ctx.screen.moveAttachTool(sarea, mpos, document.body, event.pointerId);
    } else {
      this.ctx.screen.moveAttachTool(sarea, mpos);
    }
  }

  loadTabData(uidata: any) {
    this.ignoreChange++;
    loadUIData(this, uidata);
    this.ignoreChange--;
  }

  on_addclick(e: PointerEvent) {
    const mpos = new Vector2([e.x, e.y]);

    // prevent tab move modal p
    e.preventDefault();

    if (this.addMenu && !this.addMenu.closed) {
      this.addMenu.close();
    } else {
      this.addTabMenu(e.target! as TabItem<CTX>, mpos);
    }
  }

  tab_onchange(tab: TabItem<CTX>, event?: PointerEvent | KeyboardEvent) {
    if (this.ignoreChange) {
      return;
    }

    dockerdebug("EVENT", event);

    if (event && (!(event instanceof PointerEvent) || event.pointerType === "mouse")) {
      //event.preventDefault(); //prevent tab dragging
    }

    this.select(tab.id, event as PointerEvent | MouseEvent | KeyboardEvent);
  }

  init() {
    super.init();

    this.style["touchAction"] = "none";

    this.addEventListener("pointermove", (e) => {
      this.mpos.loadXY(e.x, e.y);
    });

    this.rebuild();
  }

  setCSS() {
    super.setCSS();
  }

  getArea(): Area<CTX> {
    let p: UIBase<CTX> | undefined = this.parentWidget;
    let lastp = p;

    const name = UIBase.getInternalName("screenarea-x");
    while (p && p.tagName.toLowerCase() !== name) {
      lastp = p;
      p = p.parentWidget;
    }

    return lastp as unknown as Area<CTX>;
  }

  /** Owning ScreenArea, or undefined when this docker is not attached. */
  getScreenArea(): ScreenArea<CTX> {
    return this.getArea().parentWidget as unknown as ScreenArea<CTX>;
  }

  flagUpdate() {
    this.needsRebuild = true;
    return this;
  }

  update() {
    super.update();

    const active = this.tbar.getActive();
    const area = this.getArea();

    let key = this.parentWidget!._id;
    for (const area2 of (area.parentWidget! as ScreenArea<CTX>).editors) {
      key += area2._id + ":";
    }

    if (key !== this._last_update_key) {
      this._last_update_key = key;
      this.needsRebuild = true;
    }

    if (this.needsRebuild) {
      this.rebuild();
      return;
    }

    if (this.addicon) {
      const tabs = this.tbar.tbar.tabs;
      const idx = tabs.indexOf(this.addicon);
      if (idx !== tabs.length - 1) {
        this.tbar.tbar.swapTabs(this.addicon, tabs[tabs.length - 1]);
      }
    }

    if (active?._id !== area._id) {
      this.ignoreChange++;

      try {
        this.tbar.setActive(area._id);
      } catch (error) {
        util.print_stack(error as Error);
        this.needsRebuild = true;
      }

      this.ignoreChange--;
    }

    // Defensive reset — guards against re-entrant rebuilds leaving ignoreChange
    // pinned >0 and silently swallowing future tab change events.
    this.ignoreChange = 0;
  }

  /** Swap the `switcher` instances between two Area<CTX> objects, also moving
   *  the DOM nodes. Workaround for a Chrome bug where `touch-action` is not
   *  respected after we swap host elements at the DOM level. */
  _swapSwitcherDOM(oldArea: Area<CTX>, newArea: Area<CTX>) {
    const parentw = oldArea.switcher!.parentWidget;
    const newparentw = newArea.switcher!.parentWidget;

    const parent = oldArea.switcher!.parentNode;
    const newparent = newArea.switcher!.parentNode;

    oldArea.switcher = newArea.switcher;
    newArea.switcher = this;

    HTMLElement.prototype.remove.call(oldArea.switcher);
    HTMLElement.prototype.remove.call(newArea.switcher);

    if (parent instanceof UIBase) {
      parent.shadow.appendChild(oldArea.switcher!);
    } else {
      parent!.appendChild(oldArea.switcher!);
    }

    if (newparent instanceof UIBase) {
      newparent.shadow.prepend(newArea.switcher!);
    } else {
      newparent!.prepend(newArea.switcher!);
    }

    oldArea.switcher!.parentWidget = parentw;
    newArea.switcher!.parentWidget = newparentw;
  }

  select(areaId: string, event: PointerEvent | KeyboardEvent | MouseEvent) {
    dockerdebug("Tab Select!", areaId);

    this.ignoreChange++;

    const area = this.getArea();
    const sarea = area.owning_sarea!;

    const uidata = saveUIData(this.tbar as unknown as UIBase<CTX>, "switcherTabs");
    let newarea: Area<CTX> | undefined;

    for (const area2 of sarea.editors) {
      if (area2._id === areaId) {
        newarea = area2;
        sarea.switchEditor(area2.constructor);
        break;
      }
    }

    if (newarea === undefined) {
      console.error('Could not find area with id "' + areaId + '"');
      return;
    }

    if (newarea === area || !newarea.switcher) {
      return;
    }

    sarea.flushSetCSS();
    sarea.flushUpdate();

    newarea = sarea.area!;

    this._swapSwitcherDOM(area, newarea);

    if (area.switcher instanceof AreaDocker) {
      area.switcher.tbar._ensureNoModal();
      (newarea.switcher as AreaDocker<CTX>).tbar._ensureNoModal();
      (newarea.switcher as AreaDocker<CTX>).loadTabData(uidata);
      area.switcher.loadTabData(uidata);
    }

    newarea.switcher!.setCSS();
    newarea.switcher!.update();

    if (
      event &&
      (event instanceof PointerEvent || event instanceof MouseEvent || event instanceof TouchEvent)
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (newarea.switcher instanceof AreaDocker) {
        newarea.switcher.tbar._startMove(undefined, event as PointerEvent);
      }
    }

    sarea.switcherData = uidata;
    this.ignoreChange--;
  }

  addTabMenu(tab: TabItem<CTX>, mpos: number[] | Vector2) {
    const rect = tab.getBoundingClientRect();

    dockerdebug(tab, tab.getClientRects());

    if (!mpos) {
      mpos = this.ctx.screen.mpos;
    }

    const menu = UIBase.createElement("menu-x") as Menu<CTX>;

    menu.closeOnMouseUp = false;
    menu.ctx = this.ctx;
    menu.srcWidget = tab;
    menu._init();

    const prop = makeAreasEnum();
    const sarea = this.getScreenArea();

    if (!sarea) {
      return;
    }

    for (const k in Object.assign({}, prop.values)) {
      // An editor is "already shown" only if it exists and is not currently
      // closed — closed editors should appear in the add menu so the user can
      // bring them back via the existing switchEditor flow.
      let ok = true;
      for (const area of sarea.editors) {
        if (getAreaConstructor(area).define().uiname === k && !area.closed) {
          ok = false;
        }
      }

      if (!ok) {
        continue;
      }

      const icon = prop.iconmap[k];
      menu.addItemExtra(k, prop.values[k], undefined, icon);
    }

    if (!rect) {
      console.warn("no rect!");
      return;
    }

    dockerdebug(mpos[0], mpos[1], rect.x, rect.y);

    menu.on_select = (val) => {
      dockerdebug("menu select", val, this.getArea().parentWidget);

      this.addMenu = undefined;

      const sarea = this.getScreenArea();
      if (sarea) {
        const cls = areaclasses[val];

        this.ignoreChange++;
        let area: Area<CTX> | undefined;
        let uidata: string | undefined;

        try {
          uidata = saveUIData(this.tbar as unknown as UIBase<CTX>, "switcherTabs");
          sarea.switchEditor(cls);

          dockerdebug("switching", cls);
          area = sarea.area!;
          area._init();

          if (area.switcher && area.switcher instanceof AreaDocker) {
            area.switcher.rebuild();
            area.switcher.loadTabData(uidata);
            sarea.switcherData = uidata;
          }
        } catch (error) {
          util.print_stack(error as Error);
          throw error;
        } finally {
          this.ignoreChange = Math.max(this.ignoreChange - 1, 0);
        }

        dockerdebug("AREA", area.switcher, area);

        if (area.switcher) {
          this.ignoreChange++;

          try {
            area.parentWidget = sarea;
            area.owning_sarea = sarea;
            area.switcher.parentWidget = area;
            area.switcher.ctx = area.ctx;
            area.switcher._init();
            area.switcher.update();

            dockerdebug("loading data", uidata);
            if (area.switcher instanceof AreaDocker) {
              area.switcher.loadTabData(uidata);
              area.switcher.rebuild(); //make sure plus tab is at end
            }
            area.flushUpdate();
          } finally {
            this.ignoreChange = Math.max(this.ignoreChange - 1, 0);
          }
        }
      }
    };

    this.addMenu = menu;

    startMenu(menu, mpos[0] - 35, rect.y + rect.height, false, 0);
    return menu;
  }

  /** Soft-close an editor: hide it from the tab bar but keep its instance and
   *  UI state alive in `ScreenArea.editors` / `editormap`. If the closed
   *  editor is the active one, switches to the first remaining non-closed
   *  editor; if none remains, the tab bar is rebuilt with only the `+` tab. */
  closeEditor(editor: Area<CTX>) {
    const sarea = this.getScreenArea();
    if (!sarea) return;

    if (editor === sarea.area) {
      const other = sarea.editors.find((e) => e !== editor && !e.closed);
      if (other) {
        sarea.switchEditor(other.constructor);
      }
    }

    editor.closed = true;
    this.flagUpdate();
  }

  /** Build and show the right-click context menu for a single editor tab.
   *  Currently exposes a `Close` action; designed to grow other items later. */
  openTabContextMenu(editor: Area<CTX>, event: PointerEvent) {
    const menu = UIBase.createElement("menu-x") as Menu<CTX>;

    menu.closeOnMouseUp = false;
    menu.ctx = this.ctx;
    menu._init();

    menu.addItemExtra("Close", "close", undefined, Icons.TINY_X);

    menu.on_select = (val) => {
      if (val === "close") {
        this.closeEditor(editor);
      }
    };

    startMenu(menu, event.x, event.y, false, 0);
    return menu;
  }
}

UIBase.internalRegister(AreaDocker);
