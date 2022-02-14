import {Area, contextWrangler} from '../screen/ScreenArea.js';
import {nstructjs} from '../path-controller/controller.js';
import {UIBase} from '../core/ui_base.js';
import {Container} from '../core/ui.js';
import {parsepx} from '../core/ui_base.js';
import {Icons} from '../core/ui_base.js';
import * as util from '../util/util.js';

let sidebar_hash = new util.HashDigest();

export class SideBar extends Container {
  constructor() {
    super();

    this.header = this.row();
    this.header.style["height"] = "45px";

    this._last_resize_key = undefined;

    this._closed = false;

    this.closeIcon = this.header.iconbutton(Icons.RIGHT_ARROW, "Close/Open sidebar", () => {
      console.log("click!");
      this.closed = !this._closed;
    });

    this._openWidth = undefined;
    this.needsSetCSS = true;
    this.tabbar = this.tabs("left");
    //this.tabbar.style["flex-grow"] = "8";
  }

  saveData() {
    return {
      closed : this.closed
    }
  }

  loadData(obj) {
    this.closed = obj.closed;
  }

  set closed(val) {
    if (!!this._closed === !!val) {
      return;
    }

    if (this._openWidth === undefined && !this._closed && val) {
      this._openWidth = this.width;
    }

    console.log("animate!");
    let w = val ? 50 : this._openWidth;
    this.animate().goto("width", w, 500);


    if (val) {
      this.closeIcon.icon = Icons.LEFT_ARROW;
    } else {
      this.closeIcon.icon = Icons.RIGHT_ARROW;
    }

    this._closed = val;
  }

  get closed() {
    return this._closed;
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

    let closed = this._closed;
    this._closed = false;

    if (!this.getAttribute("width")) {
      this.width = 300;
    }
    if (!this.getAttribute("height")) {
      this.height = 700;
    }

    this.setCSS();

    if (closed) {
      this.closed = true;
    }
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
    sidebar_hash.reset();
    sidebar_hash.add(this.width);
    sidebar_hash.add(this.height);

    let key = sidebar_hash.get();
    if (key !== this._last_resize_key) {
      this._last_resize_key = key;
      this.needsSetCSS = true;
    }

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

  /** \param makeMenuBar function(ctx, container, menuBarEditor)
   *
   * example:
   *
   * function makeMenuBar(ctx, container, menuBarEditor) {
   *
   *  container.menu("File", [
   *    "app.new()",
   *    simple.Menu.SEP,
   *    "app.save()",
   *    "app.save(forceDialog=true)|Save As",
   *    "app.open"
   *  ]);
   * }
   * */
  static registerAppMenu(makeMenuBar) {
    this.makeMenuBar = makeMenuBar;
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

      this.sidebar.flushSetCSS();
      this.sidebar.flushUpdate();
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

