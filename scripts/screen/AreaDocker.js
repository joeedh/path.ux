import {UIBase, saveUIData, loadUIData} from '../core/ui_base.js';

import * as util from "../path-controller/util/util.js"
import cconst from "../config/const.js";
import * as nstructjs from "../path-controller/util/struct.js";

import {Vector2} from '../path-controller/util/vectormath.js';
import {Container} from "../core/ui.js";
import {Area} from "./ScreenArea.js";
import {Icons} from "../core/ui_base.js";

import {startMenu} from "../widgets/ui_menu.js";
import {getAreaIntName, setAreaTypes, AreaWrangler, areaclasses} from './area_wrangler.js';

let ignore = 0;

function dockerdebug() {
  if (cconst.DEBUG.areadocker) {
    console.warn(...arguments);
  }
}

window.testSnapScreenVerts = function (arg) {
  let screen = CTX.screen;

  screen.unlisten();
  screen.on_resize([screen.size[0] - 75, screen.size[1]], screen.size);
  screen.on_resize = screen.updateSize = () => {
  };

  let p = CTX.propsbar;
  p.pos[0] += 50;
  p.owning_sarea.loadFromPosSize();
  screen.regenBorders();

  screen.size[0] = window.innerWidth - 5;

  screen.snapScreenVerts(arg);
}

export class AreaDocker extends Container {
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
      style  : "areadocker"
    }
  }

  rebuild() {
    if (!this.parentWidget) {
      return;
    }

    let sarea = this.getArea().parentWidget;
    if (!sarea) {
      this.needsRebuild = true;
      return;
    }

    this.needsRebuild = false;
    this.ignoreChange++;

    dockerdebug("Rebuild", this.getArea());

    let uidata = sarea.switcherData = saveUIData(this, "switcherTabs");

    this.clear();

    let tabs = this.tbar = this.tabs()
    tabs.onchange = this.tab_onchange.bind(this);

    let tab;

    dockerdebug(sarea._id, sarea.area ? sarea.area._id : "(no active area)", sarea.editors)

    sarea.switcherData = uidata;

    for (let editor of sarea.editors) {
      let def = editor.constructor.define();
      let name = def.uiname;

      if (!name) {
        name = def.areaname || def.tagname.replace(/-x/, '');
        name = ToolProperty.makeUIName(name);
      }

      let tab = tabs.tab(name, editor._id);

      let start_mpos = new Vector2();
      let mpos = new Vector2();

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

        let rect = this.tbar.tbar.canvas.getBoundingClientRect();

        let x = e.x, y = e.y;

        let m = 8;
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

    let icon = this.addicon = tab._tab;

    icon.ontabclick = e => this.on_addclick(e);
    icon.setAttribute("menu-button", "true");
    icon.setAttribute("simple", "true");

    this.loadTabData(uidata);

    this.ignoreChange--;
  }

  detach(event) {
    this.tbar._ensureNoModal();

    let area = this.getArea();
    let sarea = this.ctx.screen.floatArea(area);

    sarea.size.min([300, 300]);
    sarea.loadFromPosSize();

    let mpos = event ? new Vector2([event.x, event.y]) : this.mpos;

    dockerdebug("EVENT", event);

    if (event && event instanceof PointerEvent) {
      this.ctx.screen.moveAttachTool(sarea, mpos, document.body, event.pointerId);
    } else {
      this.ctx.screen.moveAttachTool(sarea, mpos);
    }
  }

  loadTabData(uidata) {
    this.ignoreChange++;
    loadUIData(this, uidata);
    this.ignoreChange--;
  }

  on_addclick(e) {
    let mpos = new Vector2([e.x, e.y]);

    if (this.addicon.menu && !this.addicon.menu.closed) {
      this.addicon.menu.close();
    } else {
      this.addTabMenu(e.target, mpos);
    }
  }

  tab_onchange(tab, event) {
    if (this.ignoreChange) {
      return;
    }

    dockerdebug("EVENT", event);

    if (event && (!(event instanceof PointerEvent) || event.pointerType === "mouse")) {
      //event.preventDefault(); //prevent tab dragging
    }

    this.select(tab.id, event);
  }

  init() {
    super.init();

    this.style["touch-action"] = "none";

    this.addEventListener("pointermove", (e) => {
      this.mpos.loadXY(e.x, e.y);
    });

    this.rebuild();
  }

  setCSS() {
    super.setCSS();
  }

  getArea() {
    let p = this.parentWidget;
    let lastp = p;

    let name = UIBase.getInternalName("screenarea-x");
    while (p && p.tagName.toLowerCase() !== name) {
      lastp = p;
      p = p.parentWidget;
    }

    return lastp
  }

  flagUpdate() {
    this.needsRebuild = true;
    return this;
  }

  update() {
    super.update();

    let active = this.tbar.getActive();
    let area = this.getArea();

    let key = this.parentWidget._id;
    for (let area2 of area.parentWidget.editors) {
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
      let tabs = this.tbar.tbar.tabs;
      let idx = tabs.indexOf(this.addicon);
      if (idx !== tabs.length - 1) {
        this.tbar.tbar.swapTabs(this.addicon, tabs[tabs.length - 1]);

      }
    }

    if (!active || active._id !== area._id) {
      this.ignoreChange++;

      try {
        this.tbar.setActive(area._id);
      } catch (error) {
        util.print_stack(error);
        this.needsRebuild = true;
      }

      this.ignoreChange--;
    }

    window.tabs = this.tbar;

    this.ignoreChange = 0;
  }

  select(areaId, event) {
    dockerdebug("Tab Select!", areaId);

    this.ignoreChange++;

    let area = this.getArea();
    let sarea = area.parentWidget;

    let uidata = saveUIData(this.tbar, "switcherTabs");
    let newarea;

    for (let area2 of sarea.editors) {
      if (area2._id === areaId) {
        newarea = area2;
        sarea.switchEditor(area2.constructor);
        break;
      }
    }

    if (newarea === area || !newarea.switcher) {
      return;
    }

    //this.ctx.screen.completeSetCSS();
    //this.ctx.screen.completeUpdate();
    sarea.flushSetCSS();
    sarea.flushUpdate();

    newarea = sarea.area;

    /* unswap switchers to avoid a bug in Chrome where
    *  touch-action appears to not be respected due to our
    *  swapping elements */

    let parentw = area.switcher.parentWidget;
    let newparentw = newarea.switcher.parentWidget;

    let parent = area.switcher.parentNode;
    let newparent = newarea.switcher.parentNode;

    area.switcher = newarea.switcher;
    newarea.switcher = this;

    HTMLElement.prototype.remove.call(area.switcher);
    HTMLElement.prototype.remove.call(newarea.switcher);

    if (parent instanceof UIBase) {
      parent.shadow.appendChild(area.switcher);
    } else {
      parent.appendChild(area.switcher);
    }

    if (newparent instanceof UIBase) {
      newparent.shadow.prepend(newarea.switcher);
    } else {
      newparent.prepend(newarea.switcher);
    }

    area.switcher.parentWidget = parentw;
    newarea.switcher.parentWidget = newparentw;

    area.switcher.tbar._ensureNoModal();
    newarea.switcher.tbar._ensureNoModal();

    newarea.switcher.loadTabData(uidata);
    area.switcher.loadTabData(uidata);

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

  addTabMenu(tab, mpos) {
    let rect = tab.getClientRects()[0];

    dockerdebug(tab, tab.getClientRects());

    if (!mpos) {
      mpos = this.ctx.screen.mpos;
    }

    let menu = UIBase.createElement("menu-x");

    menu.closeOnMouseUp = false;
    menu.ctx = this.ctx;
    menu._init();

    let prop = Area.makeAreasEnum();
    let sarea = this.getArea().parentWidget;

    if (!sarea) {
      return;
    }

    for (let k in Object.assign({}, prop.values)) {
      let ok = true;
      for (let area of sarea.editors) {
        if (area.constructor.define().uiname === k) {
          ok = false;
        }
      }

      if (!ok) {
        continue;
      }

      let icon = prop.iconmap[k];
      menu.addItemExtra(k, prop.values[k], undefined, icon);
    }

    if (!rect) {
      console.warn("no rect!");
      return;
    }

    dockerdebug(mpos[0], mpos[1], rect.x, rect.y);

    menu.onselect = (val) => {
      dockerdebug("menu select", val, this.getArea().parentWidget);

      this.addicon.menu = undefined;

      let sarea = this.getArea().parentWidget;
      if (sarea) {
        let cls = areaclasses[val];

        this.ignoreChange++;
        let area, ud;

        try {
          let uidata = saveUIData(this.tbar, "switcherTabs");
          sarea.switchEditor(cls);

          dockerdebug("switching", cls);
          area = sarea.area;
          area._init();

          if (area.switcher) {
            area.switcher.rebuild();
            area.switcher.loadTabData(uidata);
            sarea.switcherData = uidata;
          }
        } catch (error) {
          util.print_stack(error);
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
            area.switcher.loadTabData(ud);

            area.switcher.rebuild(); //make sure plus tab is at end
            area.flushUpdate();
          } catch (error) {
            throw error;
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
