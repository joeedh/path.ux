import { Area, IAreaDef, contextWrangler } from "../screen/ScreenArea.js";
import { nstructjs } from "../path-controller/controller.js";
import { UIBase, parsepx, Icons, type IUIBaseConstructor } from "../core/ui_base.js";
import { Container } from "../core/ui.js";
import { Animator } from "../core/anim.js";
import * as util from "../util/util.js";
import type { IContextBase } from "../core/context_base.js";
import type { Vector2 } from "../path-controller/util/vectormath.js";

let sidebar_hash = new util.HashDigest();

export class SideBar<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  header: Container<CTX>;
  _last_resize_key: number | undefined;
  _closed: boolean;
  closeIcon: ReturnType<Container<CTX>["iconbutton"]>;
  _openWidth: number | undefined;
  needsSetCSS: boolean;
  tabbar: ReturnType<Container<CTX>["tabs"]>;

  constructor() {
    super();

    this.header = this.row();
    (this.header.style as unknown as Record<string, string>)["height"] = "45px";

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

  override saveData(): Record<string, unknown> {
    return {
      closed: this.closed,
    };
  }

  override loadData(obj: Record<string, unknown>): this {
    this.closed = obj.closed as boolean;
    return this;
  }

  set closed(val: boolean) {
    if (!!this._closed === !!val) {
      return;
    }

    if (this._openWidth === undefined && !this._closed && val) {
      this._openWidth = this.width;
    }

    console.log("animate!");
    const w = val ? 50 : this._openWidth;
    const anim = this.animateOld();
    if (anim instanceof Animator) {
      anim.goto("width", w, 500);
    }

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

  get width(): number {
    return parsepx("" + this.getAttribute("width"));
  }

  set width(val: number) {
    this.setAttribute("width", "" + val + "px");
    this.update();
  }

  get height(): number {
    return parsepx("" + this.getAttribute("height"));
  }

  set height(val: number) {
    this.setAttribute("height", "" + val + "px");
    this.update();
  }

  static define() {
    return {
      tagname: "sidebar-base-x",
      style  : "sidebar",
    };
  }

  tab(name: string) {
    return this.tabbar.tab(name);
  }

  override init() {
    super.init();

    const closed = this._closed;
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

  override setCSS() {
    if (!this.parentWidget) {
      return;
    }

    const editor = this.parentWidget as unknown as Area<CTX>;

    //happens when editors are inactive
    if (!editor.pos || !editor.size) {
      return;
    }

    this.needsSetCSS = false;

    let w = this.width,
      h = this.height;

    w = isNaN(w) ? 500 : w;
    h = isNaN(h) ? 500 : h;

    h = Math.min(h, editor.size[1 as 0] - 25);
    (this.style as unknown as Record<string, string>)["position"] = "absolute";
    (this.style as unknown as Record<string, string>)["width"] = w + "px";
    (this.style as unknown as Record<string, string>)["height"] = h + "px";
    (this.style as unknown as Record<string, string>)["z-index"] = "100";
    (this.style as unknown as Record<string, string>)["overflow"] = "scroll";
    (this.style as unknown as Record<string, string>)["background-color"] = this.getDefault("AreaHeaderBG") as string;
    (this.tabbar.style as unknown as Record<string, string>)["height"] = h - 45 + "px";
    (this.style as unknown as Record<string, string>)["left"] = editor.size[0 as 0] - w + "px";
  }

  override update() {
    sidebar_hash.reset();
    sidebar_hash.add(this.width);
    sidebar_hash.add(this.height);

    const key = sidebar_hash.get();
    if (key !== this._last_resize_key) {
      this._last_resize_key = key;
      this.needsSetCSS = true;
    }

    if (this.needsSetCSS) {
      this.setCSS();
    }
  }
}

UIBase.register(SideBar as unknown as IUIBaseConstructor);

export class Editor<CTX extends IContextBase = IContextBase> extends Area<CTX> {
  container: Container<CTX>;
  sidebar?: SideBar<CTX>;

  static makeMenuBar?: (ctx: unknown, container: unknown, menuBarEditor: unknown) => void;

  constructor() {
    super();

    this.container = UIBase.createElement("container-x") as Container<CTX>;
    this.container.parentWidget = this as unknown as typeof this.container.parentWidget;
    this.shadow.appendChild(this.container);
  }

  static define(): IAreaDef {
    return {
      areaname  : "areaname",
      tagname   : "tagname-x",
      flag      : 0,
      uiname    : undefined,
      icon      : undefined,
      borderLock: undefined,
    };
  }

  static defineAPI(_api: unknown, strct: unknown) {
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
  static registerAppMenu(makeMenuBar: (ctx: unknown, container: unknown, menuBarEditor: unknown) => void) {
    if (this !== Editor) {
      throw new Error("must call registerAppMenu from simple.Editor base class");
    }

    this.makeMenuBar = makeMenuBar;
  }

  /** Registers class with Area system
   *  and nstructjs.  Uses nstructjs.inlineRegister
   *  to handle inheritance.
   **/
  static register(cls: any) {
    if (!cls.hasOwnProperty("define")) {
      throw new Error("missing define() method");
    }

    if (!cls.hasOwnProperty("STRUCT")) {
      cls.STRUCT = nstructjs.inherit(cls, this) + `\n}`;
      nstructjs.register(cls);
    } else {
      /* inlineRegister handles inheritance. */
      cls.STRUCT = nstructjs.inlineRegister(cls, cls.STRUCT!);
    }

    super.register(cls as unknown as IUIBaseConstructor);
  }

  makeSideBar() {
    if (this.sidebar) {
      this.sidebar.remove();
    }

    const sidebar = (this.sidebar = UIBase.createElement("sidebar-base-x") as SideBar<CTX>);
    sidebar.parentWidget = this as unknown as typeof sidebar.parentWidget;
    sidebar.ctx = this.ctx;
    this.shadow.appendChild(sidebar);

    if (this.ctx) {
      sidebar._init();

      this.sidebar.flushSetCSS();
      this.sidebar.flushUpdate();
    }

    return this.sidebar;
  }

  override on_resize(size: number[] | Vector2) {
    super.on_resize(size);

    if (this.sidebar) {
      if (this.ctx && this.pos) {
        this.sidebar.setCSS();
      } else {
        this.sidebar.needsSetCSS = true;
      }
    }
  }

  static findEditor(cls?: typeof Area) {
    return contextWrangler.getLastArea(cls);
  }

  override getScreen() {
    return this.ctx.screen;
  }

  override init() {
    super.init();

    this.makeHeader(this.container);
  }

  /** creates default header and puts it in this.header */
  override makeHeader(container: Container<CTX>, add_note_area = true, make_draggable = true) {
    return super.makeHeader(container, add_note_area, make_draggable);
  }

  /** called regularly */
  override update() {
    super.update();
  }

  /** */
  override setCSS() {
    super.setCSS();
  }
}
