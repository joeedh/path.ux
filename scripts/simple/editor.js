import {Area, contextWrangler} from '../screen/ScreenArea.js';
import {nstructjs} from '../path-controller/controller.js';
import {UIBase} from '../core/ui_base.js';
import {Container} from '../core/ui.js';
import {parsepx} from '../core/ui_base.js';
import {Icons} from '../core/ui_base.js';

export class SideBar extends Container {
  constructor() {
    super();

    this.header = this.row();
    this.header.style["height"] = "45px";

    this._closed = false;

    this.header.iconbutton(Icons.RIGHT_ARROW, "Close/Open sidebar", () => {
      console.log("click!");

    });

    this.needsSetCSS = true;
    this.tabbar = this.tabs("left");
    //this.tabbar.style["flex-grow"] = "8";
  }

  get width() {
    return parsepx("" + this.getAttribute("width"));
  }

  set width(val) {
    this.setAttribute("width", "" + val + "px");
  }

  get height() {
    return parsepx("" + this.getAttribute("height"));
  }

  set height(val) {
    this.setAttribute("height", "" + val + "px");
  }

  static define() {
    return {
      tagname: "sidebar-base-x",
      style  : "sidebar"
    }
  }

  tab(name) {
    return this.tabbar.tab(name);
  }

  init() {
    super.init();

    if (!this.getAttribute("width")) {
      this.width = 300;
    }
    if (!this.getAttribute("height")) {
      this.height = 700;
    }

    this.setCSS();
  }

  setCSS() {
    if (!this.parentWidget) {
      return;
    }

    let editor = this.parentWidget;

    //happens when editors are inactive
    if (!editor.pos || !editor.size) {
      return;
    }

    this.needsSetCSS = false;

    let w = this.width, h = this.height;

    w = isNaN(w) ? 500 : w;
    h = isNaN(h) ? 500 : h;

    this.style["position"] = "fixed";
    this.style["width"] = w + "px";
    this.style["height"] = h + "px";
    this.style["z-index"] = "100";
    this.style["overflow"] = "scroll";

    this.style["background-color"] = this.getDefault("AreaHeaderBG");

    this.tabbar.style["height"] = (h - 45) + "px";
    this.style["left"] = (editor.pos[0] + editor.size[0] - w) + "px";
  }

  update() {
    if (this.needsSetCSS) {
      this.setCSS();
    }
  }
}

UIBase.register(SideBar);

export class Editor extends Area {
  constructor() {
    super();

    this.container = UIBase.createElement("container-x");
    this.container.parentWidget = this;
    this.shadow.appendChild(this.container);
  }

  static define() {
    return {
      areaname: "areaname",
      tagname : "tagname-x"
    }
  }

  static defineAPI(api, strct) {
    return strct;
  }

  static register(cls) {
    if (!cls.hasOwnProperty("define")) {
      throw new Error("missing define() method");
    }

    if (!cls.hasOwnProperty("STRUCT")) {
      cls.STRUCT = nstructjs.inherit(cls, this) + `\n}`;
    }

    super.register(cls);
    nstructjs.register(cls);
  }

  makeSideBar() {
    if (this.sidebar) {
      this.sidebar.remove();
    }

    let sidebar = this.sidebar = UIBase.createElement("sidebar-base-x");
    sidebar.parentWidget = this;
    sidebar.ctx = this.ctx;
    this.shadow.appendChild(sidebar);

    if (this.ctx) {
      sidebar._init();

      this.flushSetCSS();
      this.flushUpdate();
    }


    return this.sidebar;
  }

  on_resize(size, oldsize) {
    super.on_resize(size, oldsize);

    if (this.sidebar) {
      if (this.ctx && this.pos) {
        this.sidebar.setCSS();
      } else {
        this.sidebar.needsSetCSS = true;
      }
    }
  }

  static findEditor(cls) {
    return contextWrangler.getLastArea(cls);
  }
  
  getScreen() {
    return this.ctx.screen;
  }

  init() {
    super.init();

    this.makeHeader(this.container);
  }

  /** creates default header and puts it in this.header */
  makeHeader(container, add_note_area = true, make_draggable = true) {
    return super.makeHeader(container, add_note_area, make_draggable);
  }

  /** called regularly */
  update() {
    super.update();
  }

  /** */
  setCSS() {
    super.setCSS();
  }
}

