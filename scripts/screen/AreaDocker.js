import {UIBase, saveUIData, loadUIData} from '../core/ui_base.js';

import * as util from "../util/util.js"
import cconst from "../config/const.js";
import * as nstructjs from "../util/struct.js";

import {Container} from "../core/ui.js";
import {Area} from "./ScreenArea.js";
import {Icons} from "../core/ui_base.js";

import {getAreaIntName, setAreaTypes, AreaWrangler, areaclasses} from './area_wrangler.js';

let ignore = 0;

window.testSnapScreenVerts = function(arg) {
  let screen = CTX.screen;

  screen.unlisten();
  screen.on_resize([screen.size[0]-75, screen.size[1]], screen.size);
  screen.on_resize = screen.updateSize = () => {};

  let p = CTX.propsbar;
  p.pos[0] += 50;
  p.owning_sarea.loadFromPosSize();
  screen.regenBorders();

  screen.size[0] = window.innerWidth-5;

  screen.snapScreenVerts(arg);
}

export class AreaDocker extends Container {
  constructor() {
    super();

    this.tbar = this.tabs();
    this.tbar.enableDrag();
    this.tbar.addEventListener("dragstart", (e) => {
      console.log("drag start", e);
      let name = this.tbar.tbar.tabs.active.name;

      e.dataTransfer.setData("area", name + "|" + this._id);
      e.preventDefault();
    });

    this.tbar.addEventListener("dragover", (e) => {
      console.log("drag over");
      console.log(e.dataTransfer.getData("area"));


      let data = e.dataTransfer.getData("area");
      let [name, id] = data.split("|");

      if (this.tbar.__fake) {
        this.tbar.removeTab(this.tbar.__fake)
        this.tbar.__fake = undefined;
      }

      this.tbar.__fake = this.tbar.tab(name, id);
    });

    this.tbar.addEventListener("dragexit", (e) => {
      console.log("drag exit");
      console.log(e.dataTransfer.getData("area"));


      if (this.tbar.__fake) {
        this.tbar.removeTab(this.tbar.__fake);
        this.tbar.__fake = undefined;
      }
    });

    this.tbar.onchange = (tab) => {
      if (ignore) {
        return;
      }

      if (!tab || !this.getArea() || ! this.getArea().parentWidget) {
        return;
      }

      if (tab.id === "add") {
        this.addTabMenu(tab);
        return;
      }

      console.warn("CHANGE AREA", tab.id);

      let sarea = this.getArea().parentWidget;
      if (!sarea) {
        return;
      }

      for (let area of sarea.editors) {
        if (area._id === tab.id && area !== sarea.area) {
          let ud = saveUIData(this.tbar, "tabs");

          sarea.switch_editor(area.constructor);

          //load tabs order
          if (area.switcher) {
            ignore++;
            area.switcher.update();
            try {
              loadUIData(sarea.area.switcher.tbar, ud);
            } finally {
              ignore = Math.max(ignore - 1, 0);
            }

            area.switcher.rebuild();
          }
        }
      }
    };
  }

  addTabMenu(tab) {
    console.log("Add Tab!");

    let rect = tab.getClientRects()[0];
    let mpos = this.ctx.screen.mpos;

    let menu = document.createElement("menu-x");

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

    console.log(mpos[0], mpos[1], rect.x, rect.y);

    menu.onselect = (val) => {
      console.log("menu select", val, this.getArea().parentWidget);

      let sarea = this.getArea().parentWidget;
      if (sarea) {
        let cls = areaclasses[val];

        ignore++;
        let area, ud;

        try {
          ud = saveUIData(this.tbar, "tab");
          sarea.switchEditor(cls);

          console.log("switching", cls);
          area = sarea.area;
          area._init();
        } catch (error) {
          util.print_stack(error);
          throw error;
        } finally {
          ignore = Math.max(ignore - 1, 0);
        }

        console.log("AREA", area.switcher, area);

        if (area.switcher) {
          ignore++;

          try {
            area.parentWidget = sarea;
            area.owning_sarea = sarea;
            area.switcher.parentWidget = area;
            area.switcher.ctx = area.ctx;
            area.switcher._init();
            area.switcher.update();

            console.log("loading data", ud);
            loadUIData(area.switcher.tbar, ud);
            area.switcher.rebuild(); //make sure plus tab is at end
          } catch (error) {
            throw error;
          } finally {
            ignore = Math.max(ignore - 1, 0);
          }
        }
      }
    };

    this.ctx.screen.popupMenu(menu, rect.x, rect.y);
  }

  getArea() {
    let p = this;

    while (p && !(p instanceof Area)) {
      p = p.parentWidget;
    }

    return p;
  }

  _hash() {
    let area = this.getArea();
    if (!area) return;

    let sarea = area.parentWidget;

    if (!sarea) {
      return;
    }

    let hash = "";
    for (let area2 of sarea.editors) {
      hash += area2.tagName + ":";
    }

    return hash + (sarea.area ? sarea.area.tagName : "");
  }

  rebuild() {
    console.log("rebuild");

    if (!this.getArea() || !this.getArea().parentWidget) {
      this._last_hash = undefined;
      this.tbar.clear();
      return;
    }

    ignore++;

    //save tab order
    let ud = saveUIData(this.tbar, "tbar");

    this.tbar.clear();
    let sarea = this.getArea().parentWidget;

    for (let area of sarea.editors) {
      let uiname = area.constructor.define().uiname;

      let tab = this.tbar.tab(uiname, area._id);
    }

    let tab = this.tbar.icontab(Icons.SMALL_PLUS, "add", "Add Editor", false);

    //load tab order
    loadUIData(this.tbar, ud);

    //move add tab to end
    let tc = this.tbar.getTabCount();
    this.tbar.moveTab(tab, tc-1);

    ignore = Math.max(ignore-1, 0);
  }

  update() {
    super.update();

    if (!this.ctx) return;
    let area = this.getArea();
    if (!area) return;
    let sarea = area.parentWidget;
    if (!sarea) return;

    let hash = this._hash();

    if (hash !== this._last_hash) {
      this._last_hash = hash;
      this.rebuild();
    }

    if (this._last_hash) {
      this.tbar.setActive(this.getArea()._id);
    }
  }

  init() {
    super.init();
  }

  static define() {return {
    tagname : "area-docker-x"
  }}
}
UIBase.register(AreaDocker);
