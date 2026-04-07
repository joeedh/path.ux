import { UIBase, saveUIData, loadUIData } from "../core/ui_base";

import * as util from "../path-controller/util/util";
import cconst from "../config/const";

import { Vector2 } from "../path-controller/util/vectormath";
import { Container } from "../core/ui";
import { Area } from "./ScreenArea";
import { Icons } from "../core/ui_base";

import { Menu, startMenu } from "../widgets/ui_menu";
import { areaclasses } from "./area_wrangler";
import { ScreenArea } from "./ScreenArea";
import { ToolProperty } from "../path-controller/toolsys/toolprop";
import { IContextBase } from "../core/context_base";
import { TabItem } from "../widgets/ui_tabs";

function dockerdebug(...args: any[]) {
  if (cconst.DEBUG.areadocker) {
    console.warn(...args);
  }
}

export const testSnapScreenVerts = function (fitToSize: boolean, ctx: IContextBase & { propsbar: Area<IContextBase> }) {
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
  tbar: any;
  addicon: any;

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

    const sarea = this.getArea().parentWidget as unknown as ScreenArea;
    if (!sarea) {
      this.needsRebuild = true;
      return;
    }

    this.needsRebuild = false;
    this.ignoreChange++;

    dockerdebug("Rebuild", this.getArea());

    const uidata = (sarea.switcherData = saveUIData(this, "switcherTabs"));

    this.clear();

    const tabs = (this.tbar = this.tabs());
    tabs.onchange = this.tab_onchange.bind(this);

    let tab;

    dockerdebug(sarea._id, sarea.area ? sarea.area._id : "(no active area)", sarea.editors);

    sarea.switcherData = uidata;

    for (const editor of sarea.editors) {
      const def = Area.getAreaConstructor(editor).define();
      let name = def.uiname;

      if (!name) {
        name = def.areaname || def.tagname.replace(/-x/, "");
        name = ToolProperty.makeUIName(name);
      }

      const tab = tabs.tab(name, editor._id);

      const start_mpos = new Vector2();
      const mpos = new Vector2();

      tab._tab.addEventListener("tabdragstart", (e) => {
        if (e.x !== 0 && e.y !== 0) {
          start_mpos.loadXY(e.x, e.y);
          this.mpos.loadXY(e.x, e.y);
        } else {
          start_mpos.load(this.mpos);
        }

        dockerdebug("tab drag start!", start_mpos, e);
      });
      tab._tab.addEventListener("tabdragmove", (e) => {
        this.mpos.loadXY(e.x, e.y);

        const rect = this.tbar.tbar.canvas.getBoundingClientRect();

        const x = e.x;
        const y = e.y;

        const m = 8;
        if (x < rect.x - m || x > rect.x + rect.width + m || y < rect.y - m || y >= rect.y + rect.height + m) {
          dockerdebug("tab detach!");
          e.preventDefault(); //end dragging
          this.detach(e);
        }
      });
      tab._tab.addEventListener("tabdragend", (e) => {
        this.mpos.loadXY(e.x, e.y);
        dockerdebug("tab drag end!", e);
      });
    }

    tab = this.tbar.icontab(Icons.SMALL_PLUS, "add", "Add Editor", false).noSwitch();

    dockerdebug("Add Menu Tab", tab);

    const icon = (this.addicon = tab._tab);

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

    if (this.addicon.menu && !this.addicon.menu.closed) {
      this.addicon.menu.close();
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

    window.tabs = this.tbar;

    this.ignoreChange = 0;
  }

  select(areaId: string, event: PointerEvent | KeyboardEvent | MouseEvent) {
    dockerdebug("Tab Select!", areaId);

    this.ignoreChange++;

    const area = this.getArea();
    const sarea = area.owning_sarea!;

    const uidata = saveUIData(this.tbar, "switcherTabs");
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

    //this.ctx.screen.completeSetCSS();
    //this.ctx.screen.completeUpdate();
    sarea.flushSetCSS();
    sarea.flushUpdate();

    newarea = sarea.area!;

    /* unswap switchers to avoid a bug in Chrome where
     *  touch-action appears to not be respected due to our
     *  swapping elements */

    const parentw = area.switcher!.parentWidget;
    const newparentw = newarea.switcher!.parentWidget;

    const parent = area.switcher!.parentNode;
    const newparent = newarea.switcher!.parentNode;

    area.switcher = newarea!.switcher;
    newarea.switcher = this;

    HTMLElement.prototype.remove.call(area.switcher);
    HTMLElement.prototype.remove.call(newarea.switcher);

    if (parent instanceof UIBase) {
      parent.shadow.appendChild(area.switcher!);
    } else {
      parent!.appendChild(area.switcher!);
    }

    if (newparent instanceof UIBase) {
      newparent.shadow.prepend(newarea.switcher);
    } else {
      newparent!.prepend(newarea.switcher);
    }

    area.switcher!.parentWidget = parentw;
    newarea.switcher.parentWidget = newparentw;

    if (area.switcher instanceof AreaDocker) {
      area.switcher!.tbar._ensureNoModal();
      newarea.switcher!.tbar._ensureNoModal();
      newarea.switcher.loadTabData(uidata);
      area.switcher.loadTabData(uidata);
    }

    newarea.switcher.setCSS();
    newarea.switcher.update();

    if (event && (event instanceof PointerEvent || event instanceof MouseEvent || event instanceof TouchEvent)) {
      event.preventDefault();
      event.stopPropagation();
      newarea.switcher.tbar._startMove(undefined, event);
    }

    //console.log(this._id);

    sarea.switcherData = uidata;
    this.ignoreChange--;
  }

  addTabMenu(tab: TabItem<CTX>, mpos: number[] | Vector2) {
    const rect = tab.getClientRects()[0];

    dockerdebug(tab, tab.getClientRects());

    if (!mpos) {
      mpos = this.ctx.screen.mpos;
    }

    const menu = UIBase.createElement("menu-x") as Menu<CTX>;

    menu.closeOnMouseUp = false;
    menu.ctx = this.ctx;
    menu._init();

    const prop = Area.makeAreasEnum();
    const sarea = this.getArea().parentWidget as unknown as ScreenArea;

    if (!sarea) {
      return;
    }

    for (const k in Object.assign({}, prop.values)) {
      let ok = true;
      for (const area of sarea.editors) {
        if (Area.getAreaConstructor(area).define().uiname === k) {
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

      this.addicon.menu = undefined;

      const sarea = this.getArea().parentWidget as unknown as ScreenArea<CTX>;
      if (sarea) {
        const cls = areaclasses[val];

        this.ignoreChange++;
        let area;
        let ud;

        try {
          const uidata = saveUIData(this.tbar, "switcherTabs");
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

            dockerdebug("loading data", ud);
            if (area.switcher instanceof AreaDocker) {
              area.switcher.loadTabData(ud);
              area.switcher.rebuild(); //make sure plus tab is at end
            }
            area.flushUpdate();
          } finally {
            this.ignoreChange = Math.max(this.ignoreChange - 1, 0);
          }
        }
      }
    };

    this.addicon.menu = menu;

    startMenu(menu, mpos[0] - 35, rect.y + rect.height, false, 0);
    return menu;
  }
}

UIBase.internalRegister(AreaDocker);
