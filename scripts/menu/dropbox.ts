import * as util from "../path-controller/util/util";
import cconst from "../config/const";
import { UIBase, drawRoundBox2, drawRoundBox, IUIBaseConstructor } from "../core/ui_base";
import { ZIndexes } from "../screen/constants";
import * as toolprop from "../path-controller/toolsys/toolprop";
import { OldButton } from "../widgets/ui_button";
import type { IContextBase } from "../core/context_base";
import type { PathWatchInfo } from "../path-controller/controller/pathwatch";
import type { Screen } from "../screen/FrameManager";
import type { PopupContainer } from "../screen/FrameManager_popup";
import { newMenu, type Menu } from "./menu";
import type { MenuTemplate } from "./menu_types";
import { createMenu, openMenuPopup } from "./menu_ops";
import { EnumDef } from "../path-controller/toolsys/toolprop";

const PropTypes = toolprop.PropTypes;

export class DropBox<CTX extends IContextBase = IContextBase> extends OldButton<CTX, "DropBox"> {
  /**
   * Use this to create custom dropdown menus outside the normal datapath system.
   * You can provide a custom EnumProperty or a function/async function
   * that returns one.
   * This allows for dynamic generation of the dropdown menu options.
   * It also allows to drive simple StringProperties with dropbox menus.
   *
   * Supports both EnumProperty and an object literal of label/value pairs.
   * Note: the object literal form will auto-prettify the labels.
   * (e.g. camelCase to Camel Case).
   *
   * Note: EnumProperty supports per-item icons.
   */
  uiProp?:
    | toolprop.EnumProperty
    | (() => toolprop.EnumProperty | EnumDef | Promise<toolprop.EnumProperty | EnumDef>);

  // cached datapath property
  prop?: toolprop.EnumProperty;

  _menu: Menu<CTX> | undefined;
  lockTimer: number;
  _template: MenuTemplate | (() => MenuTemplate) | undefined;
  _searchMenuMode: boolean;
  altKey: number | undefined;
  _value: number | string;
  _last_datapath: string | undefined;
  _last_dbox_key: unknown;
  _popup: PopupContainer | undefined;
  _background: string | undefined;
  width = 0;
  on_select?: ((id: string | number) => void) | undefined;
  _onselect?: ((id: string | number) => void) | undefined;
  _onchangeCallback: ((val: string | number) => void) | null = null;

  constructor() {
    super();

    this.lockTimer = 0;

    this._template = undefined;

    this._searchMenuMode = false;
    this.altKey = undefined;

    this._value = 0;

    this._last_datapath = undefined;

    this.r = 5;
    this._menu = undefined;
    this._auto_depress = false;

    this._onpress = this._onpress.bind(this);
  }

  get searchMenuMode() {
    return this._searchMenuMode;
  }

  set searchMenuMode(v) {
    this._searchMenuMode = v;
  }

  get template() {
    return this._template;
  }

  set template(v) {
    this._template = v;
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this.setValue(v);
  }

  get menu() {
    return this._menu;
  }

  set menu(val) {
    this._menu = val;

    if (val !== undefined) {
      this._name = val.title;
      this.updateName();
    }
  }

  static define() {
    return {
      tagname: "dropbox-x",
      style  : "dropbox",
    };
  }

  init() {
    super.init();

    this.setAttribute("menu-button", "true");
    this.updateWidth();
  }

  setCSS() {
    //do not call parent classes's setCSS here

    this.style["userSelect"] = "none";
    this.dom.style["userSelect"] = "none";

    if (this.fitToWidth) {
      this.style.width = "100%";
    }

    let keys;
    if (this.getAttribute("simple")) {
      keys = ["margin-left", "margin-right", "padding-left", "padding-right"];
    } else {
      keys = [
        "margin",
        "margin-left",
        "margin-right",
        "margin-top",
        "margin-bottom",
        "padding",
        "padding-left",
        "padding-right",
        "padding-top",
        "padding-bottom",
      ];
    }

    const setDefault = (key: string) => {
      if (this.hasDefault(key)) {
        this.style[key as any] = this.getDefault(key, undefined, 0) + "px";
      }
    };

    for (const k of keys) {
      setDefault(k);
    }
  }

  _genLabel() {
    let s = super._genLabel();
    let ret = "";

    if (s.length === 0) {
      s = "(error)";
    }

    this.altKey = s[0].toUpperCase().charCodeAt(0);

    for (let i = 0; i < s.length; i++) {
      if (s[i] === "&" && i < s.length - 1 && s[i + 1] !== "&") {
        this.altKey = s[i + 1].toUpperCase().charCodeAt(0);
      } else if (s[i] === "&" && i < s.length - 1 && s[i + 1] === "&") {
        continue;
      } else {
        ret += s[i];
      }
    }

    return ret;
  }

  get fitToWidth() {
    if (!this.hasAttribute("fit-to-width")) return false;
    const attr = this.getAttribute("fit-to-width");
    return attr !== "false" && attr !== "0";
  }
  set fitToWidth(v) {
    if (v) {
      this.setAttribute("fit-to-width", "true");
    } else {
      this.removeAttribute("fit-to-width");
    }
  }

  updateWidth() {
    const dpi = this.getDPI();

    if (this.fitToWidth) {
      //this.style.width = "100%";
      const width = ~~(this.getBoundingClientRect().width * dpi);
      if (width === this.dom.width) {
        return;
      }

      this.dom.style.margin = this.dom.style.padding = "0px";
      this.dom.width = width;
      this.dom.style.width = width / dpi + "px";
      this._repos_canvas();
      this._redraw();
      return;
    }
    let tw = this.g.measureText(this._genLabel()).width / dpi;
    tw = ~~tw;

    tw += 15;

    if (!this.getAttribute("simple")) {
      tw += 35;
    }

    if (tw !== this._last_w) {
      this._last_w = tw;
      this.dom.style["width"] = tw + "px";
      this.style["width"] = tw + "px";
      this.width = tw;

      this.overrideDefault("width", tw);
      this._repos_canvas();
      this._redraw();
    }

    return 0;
  }

  updateBorders() {
    //Do not apply border stlying to the child canvas
    super.updateBorders(this as unknown as HTMLElement);
  }

  private async resolveUIProp(): Promise<toolprop.EnumProperty | undefined> {
    let enumValue: toolprop.EnumProperty | EnumDef | undefined;

    if (typeof this.uiProp === "object") {
      enumValue = this.uiProp;
    } else if (typeof this.uiProp === "function") {
      const result = this.uiProp();

      enumValue = result instanceof Promise ? await result : result;
    }

    if (enumValue && !(enumValue instanceof toolprop.EnumProperty)) {
      enumValue = new toolprop.EnumProperty(undefined, enumValue);
    }
    return enumValue;
  }

  updateFromPath(val: unknown, info: PathWatchInfo) {
    // XXX potential data races?
    this._updateFromPath(val, info);
  }

  // async implementation of this.updateFromPath
  private async _updateFromPath(val: unknown, info: PathWatchInfo) {
    if (!this.ctx) {
      return;
    }

    if (!info.resolved) {
      this.disabled = true;
      this.setCSS();
      this._redraw();

      return;
    } else {
      this.disabled = false;
      this.setCSS();
      this._redraw();
    }

    let prop = ((await this.resolveUIProp()) ?? info.prop) as toolprop.EnumProperty | undefined;

    prop = (prop as unknown as { prop?: toolprop.EnumProperty })?.prop
      ? (prop as unknown as { prop: toolprop.EnumProperty }).prop
      : prop;

    if (!prop) {
      return;
    }

    if (this.prop === undefined) {
      this.prop = prop;
    }

    prop = this.prop;

    let name: string | null;

    if (prop!.type & (PropTypes.ENUM | PropTypes.FLAG)) {
      name = prop!.ui_value_names[prop!.keys[val as string | number]];
    } else {
      name = "" + val;
    }

    if (name !== this.getAttribute("name")) {
      this.setAttribute("name", name!);
      this.updateName();
    }
  }

  update() {
    const path = this.getAttribute("datapath");

    if (path && path !== this._last_datapath) {
      this._last_datapath = path;
      /* drop the cached prop; the base watcher rebuild re-delivers through
       * updateFromPath */
      this.prop = undefined;
    }

    super.update();

    const key = this.getDefault("dropTextBG");
    if (key !== this._last_dbox_key) {
      this._last_dbox_key = key;
      this.setCSS();
      this._redraw();
    }
  }

  _build_menu_template() {
    if (this._menu?.parentNode !== undefined) {
      this._menu.remove();
    }

    let template = this._template;

    if (typeof template === "function") {
      template = template();
    }

    this._menu = createMenu(this.ctx!, "", template as MenuTemplate);
    return this._menu;
  }

  async _build_menu() {
    if (this._template) {
      this._build_menu_template();
      return;
    }

    const prop = ((await this.resolveUIProp()) ?? this.prop) as toolprop.EnumProperty;

    if (prop === undefined) {
      return;
    }

    if (this._menu?.parentNode !== undefined) {
      this._menu.remove();
    }

    const menu = (this._menu = newMenu<CTX>(""));

    menu._dropbox = this;

    const valmap: Record<string | number, string> = {};
    const enummap = prop.values;
    const iconmap = prop.iconmap;
    const uimap = prop.ui_value_names;
    const desr = prop.descriptions || {};

    for (const k in enummap) {
      let uk = k;

      valmap[enummap[k]] = k;

      if (uimap !== undefined && k in uimap) {
        uk = uimap[k];
      }

      const tooltip = desr[k];

      if (iconmap?.[k]) {
        menu.addItemExtra(uk, enummap[k], undefined, iconmap[k], undefined, tooltip);
      } else {
        menu.addItem(uk, enummap[k], undefined, tooltip);
      }
    }

    menu._onselect = async (id: string | number) => {
      this._closeOut(false);

      //check if datapath system will be calling .prop.setValue instead of us
      let callProp = true;
      if (this.hasAttribute("datapath")) {
        const datapath = this.getAttribute("datapath")!;
        const rdef = this.ctx!.api.resolvePath(this.ctx!, datapath);
        const rdata = (rdef as unknown as { dpath: { data: unknown } }).dpath?.data;

        callProp = !rdata || !(rdata instanceof toolprop.ToolProperty);
      }

      const prop = (await this.resolveUIProp()) ?? this.prop;
      if (prop === undefined) {
        console.error("Error in dropdown menu _onselect: no property resolved");
        return;
      }

      this._value = this._convertVal(id, prop) ?? id;
      if (callProp) {
        prop.setValue(id);
      }

      this.setAttribute("name", prop!.ui_value_names[valmap[id]]);
      if (this.on_select) {
        this.on_select(id);
      }

      if (this.hasAttribute("datapath") && this.ctx) {
        this.setPathValue(this.ctx, this.getAttribute("datapath")!, id);
      }
    };
  }

  /**
   * Unpresses the button and detaches the current menu, returning it for the caller to
   * close or unhook. `setLockTimer` starts the reopen lockout `_onpress` checks.
   */
  _closeOut(setLockTimer: boolean): Menu<CTX> | undefined {
    if (setLockTimer) {
      this.lockTimer = util.time_ms();
    }

    this._pressed = false;
    this._redraw();

    const menu = this._menu;
    this._menu = undefined;

    return menu;
  }

  override _onpress = async (e: unknown) => {
    const _e = e as { x: number; y: number; stopPropagation?(): void; preventDefault?(): void };
    this.abortToolTips(1000);

    if (this._menu !== undefined) {
      this._closeOut(true)?.close();
      return;
    }

    if (util.time_ms() - this.lockTimer < 200) {
      return;
    }

    await this._build_menu();

    // TypeScript can't see that _build_menu() sets this._menu, so cast to re-read
    const builtMenu = (this as DropBox<CTX>)._menu;
    if (builtMenu === undefined) {
      return;
    }

    builtMenu.autoSearchMode = false;
    builtMenu.srcWidget = this;

    builtMenu._dropbox = this;
    (this.dom as HTMLCanvasElement & { _background: unknown })._background =
      this.getDefault("BoxDepressed");
    this._background = this.getDefault("BoxDepressed") as string;
    this._redraw();
    this._pressed = true;
    this.setCSS();

    const onclose = builtMenu._onclose;
    builtMenu._onclose = () => {
      const menu = this._closeOut(true);
      if (menu) {
        menu._dropbox = undefined;
      }

      if (onclose) {
        onclose.call(menu);
      }
    };

    const menu = builtMenu;
    const screen = this.getScreen() as unknown as Screen<CTX> | undefined;

    let x = _e.x;
    let y = _e.y;
    const rects = this.dom.getBoundingClientRect();

    const rheight = rects.height;
    x = rects.x;
    y = rects.y + rheight;

    /* need to figure out a better way to pop up a menu
     *  above a given y position */
    if (cconst.menusCanPopupAbove && screen && y > screen.size[1] * 0.5 && !this.searchMenuMode) {
      const con = screen.popup(this, 500, 400, false, 0) as unknown as PopupContainer;

      con.style["zIndex"] = `${ZIndexes.measuringHidden}`;
      con.style["position"] = UIBase.PositionKey;
      document.body.appendChild(con);

      con.style["visibility"] = "hidden";

      con.add(menu);
      menu.start();

      const time = util.time_ms();

      const timer = window.setInterval(() => {
        if (util.time_ms() - time > 1500) {
          window.clearInterval(timer);
          return;
        }

        const r = menu.dom.getBoundingClientRect();

        if (!r || r.height < 55) {
          return;
        }

        window.clearInterval(timer);

        y -= r.height + rheight;

        menu.dom.remove();
        con.remove();

        const popup = (this._popup = openMenuPopup(
          menu as unknown as Menu,
          screen! as unknown as Screen,
          this as unknown as UIBase,
          x,
          y
        ));

        popup.style["left"] = x + "px";
        popup.style["top"] = y + "px";
      }, 1);

      return;
    }

    if (!screen) return;

    this._popup = openMenuPopup(
      menu as unknown as Menu,
      screen as unknown as Screen,
      this as unknown as UIBase,
      x,
      y,
      { search: this.searchMenuMode }
    );
  };

  _redraw() {
    if (this.getAttribute("simple")) {
      this.g.clearRect(0, 0, this.dom.width, this.dom.height);

      if (this._highlight) {
        drawRoundBox2(this, {
          canvas: this.dom,
          g     : this.g,
          color : this.getDefault("BoxHighlight") as string | undefined,
        });
      }

      if (this._focus) {
        drawRoundBox2(this, {
          canvas  : this.dom,
          g       : this.g,
          color   : this.getDefault("BoxHighlight") as string | undefined,
          op      : "stroke",
          no_clear: true,
        });
        drawRoundBox(this, this.dom, this.g, undefined, undefined, 2, "stroke");
      }

      this._draw_text();
      return;
    }

    super._redraw(false);

    const g = this.g;
    const w = this.dom.width;
    const h = this.dom.height;
    const dpi = this.getDPI();

    const p = 10 * dpi;
    const p2 = dpi;

    const bg = this.getDefault("dropTextBG");
    if (bg !== undefined) {
      g.fillStyle = bg;

      g.beginPath();
      g.rect(p2, p2, this.dom.width - p2 - h, this.dom.height - p2 * 2);
      g.fill();
    }

    g.fillStyle = "rgba(50, 50, 50, 0.2)";
    g.strokeStyle = "rgba(50, 50, 50, 0.8)";
    g.beginPath();

    const sz = 0.3;
    g.moveTo(w - h * 0.5 - p, p);
    g.lineTo(w - p, p);
    g.moveTo(w - h * 0.5 - p, p + (sz * h) / 3);
    g.lineTo(w - p, p + (sz * h) / 3);
    g.moveTo(w - h * 0.5 - p, p + (sz * h * 2) / 3);
    g.lineTo(w - p, p + (sz * h * 2) / 3);

    g.lineWidth = 1;
    g.stroke();

    this._draw_text();
  }

  _convertVal(val: string | number, prop: toolprop.EnumProperty) {
    if (typeof val === "string" && prop) {
      if (val in prop.values) {
        return prop.values[val];
      } else if (val in prop.keys) {
        return prop.keys[val];
      } else {
        return undefined;
      }
    }

    return val;
  }

  setValue(val: string | number | undefined, setLabelOnly = false) {
    if (val === undefined || val === this._value) {
      return;
    }

    // XXX bad compatibility code
    if (this.prop) {
      val = this._convertVal(val, this.prop);
    }

    if (val === undefined) {
      console.warn("Bad val", val);
      return;
    }

    this._value = val;

    const fromPropLabel = (prop: toolprop.EnumProperty, val: string | number) => {
      // fetch value for this key
      if (val in prop.keys) {
        // deal with number vs string flakiness in objects
        val = prop.keys[val] ?? prop.keys["" + val];
      }
      // fetch ui name
      const label = prop.ui_value_names[val] ?? "" + val;
      this.setAttribute("name", label);
      this._name = label;
    };

    if (this.prop !== undefined && !setLabelOnly) {
      fromPropLabel(this.prop, val);
    } else if (this.uiProp) {
      //set label asyncronously
      this.resolveUIProp().then((prop) => {
        if (prop) {
          fromPropLabel(prop, val);
        }
      });
    } else {
      // fallback to using the raw value as the label
      this.setAttribute("name", "" + val);
      this._name = "" + val;
    }

    if (this._onchangeCallback && !setLabelOnly) {
      this._onchangeCallback(val);
    }

    this.setCSS();
    this.refreshPathWatches();
    this._redraw();
  }
}

UIBase.internalRegister(DropBox as unknown as IUIBaseConstructor);
