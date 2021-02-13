//bind module to global var to get at it in console.
//
//note that require has an api for handling circular 
//module refs, in such cases do not use these vars.

var _ui = undefined;

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from './ui_base.js';
import * as ui_widgets from '../widgets/ui_widgets.js';
import * as toolprop from '../path-controller/toolsys/toolprop.js';
import '../path-controller/util/html5_fileapi.js';
import {HotKey} from '../path-controller/util/simple_events.js';
import {CSSFont} from './ui_theme.js';
import {theme} from './ui_base.js';

import {createMenu, startMenu} from "../widgets/ui_menu.js";

let PropFlags = toolprop.PropFlags;
let PropSubTypes = toolprop.PropSubTypes;

let EnumProperty = toolprop.EnumProperty;

let Vector2 = vectormath.Vector2,
  UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  PropTypes = toolprop.PropTypes;

import {DataPathError} from '../path-controller/controller/controller_base.js';

import cconst from '../config/const.js';

var list = function list(iter) {
  let ret = [];

  for (let item of iter) {
    ret.push(item);
  }

  return ret;
};

export class Label extends ui_base.UIBase {
  constructor() {
    super();

    this._label = "";

    this._lastText = "";

    this.dom = document.createElement("div");
    this.dom.setAttribute("class", "_labelx");

    let style = document.createElement("style");
    style.textContent = `
      div._labelx::selection {
        color: none;
        background: none;
         -webkit-user-select:none;
         user-select:none;
      }
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.dom);

    this.font = "LabelText";
  }

  init() {
    this.dom.style["width"] = "max-content";
  }

  get font() {
    return this._font;
  }

  /**Set a font defined in ui_base.defaults
   e.g. DefaultText*/
  set font(fontDefaultName) {
    if (typeof fontDefaultName === "string") {
      this._font = this.getDefault(fontDefaultName);
      if (!this._font) {
        console.warn("Invalid font", fontDefaultName);
      }
    } else if (typeof fontDefaultName === "object" && fontDefaultName instanceof CSSFont) {
      this._font = fontDefaultName;
    } else {
      console.warn("Invalid font", fontDefaultName);
    }

    this._updateFont();
  }

  setCSS() {
    super.setCSS(false);
  }

  on_disabled() {
    super.on_disabled();
    this._enabled_font = this.font;
    this.font = "DefaultText";
    this._updateFont();
  }

  on_enabled() {
    super.on_enabled();
    this.font = this._enabled_font;
    this._updateFont();
  }

  _updateFont() {
    let font = this._font;
    if (!font) return;

    this.dom.style["font"] = font.genCSS();
    this.dom.style["color"] = font.color;
  }

  updateDataPath() {
    if (this.ctx === undefined) {
      return;
    }

    let path = this.getAttribute("datapath");
    let prop = this.getPathMeta(this.ctx, path);
    let val = this.getPathValue(this.ctx, path);

    if (val === undefined) {
      return;
    }

    //console.log(path);
    if (prop !== undefined && prop.type === PropTypes.INT) {
      val = val.toString(prop.radix);

      if (prop.radix === 2) {
        val = "0b" + val;
      } else if (prop.radix === 16) {
        val += "h";
      }
    } else if (prop !== undefined && prop.type === PropTypes.FLOAT && val !== Math.floor(val)) {
      val = val.toFixed(prop.decimalPlaces);
    }

    val = "" + this._label + " " + val;

    if (val !== this._lastText) {
      this._lastText = val;
      this.dom.innerText = val;
    }
  }

  update() {
    let key = "";

    if (this._font !== undefined && this._font instanceof CSSFont) {
      key += this._font.genKey();
    }

    if (key !== this._last_font) {
      this._last_font = key;
      this._updateFont();
    }
    
    this.dom.style["pointer-events"] = this.style["pointer-events"];

    if (this.hasAttribute("datapath")) {
      this.updateDataPath();
    }
  }

  get text() {
    return this._label;
    //return this.dom.innerText;
  }

  set text(text) {
    this._label = text;

    if (!this.hasAttribute("datapath")) {
      this.dom.innerText = text;
    }
  }

  static define() {
    return {
      tagname: "label-x"
    };
  }
}

ui_base.UIBase.internalRegister(Label);

export class Container extends ui_base.UIBase {
  constructor() {
    super();

    this.dataPrefix = '';
    this.inherit_packflag = 0;

    let style = this.styletag = document.createElement("style")
    style.textContent = `
    `;

    this.shadow.appendChild(style);
    this.reversed = false;

    this._prefixstack = [];
  }

  reverse() {
    this.reversed ^= true;
    return this;
  }

  pushDataPrefix(val) {
    this._prefixstack.push(this.dataPrefix);
    this.dataPrefix = val;
    return this;
  }

  popDataPrefix() {
    this.dataPrefix = this._prefixstack.pop();
    return this;
  }

  saveData() {
    return {
      scrollTop  : this.scrollTop,
      scrollLeft : this.scrollLeft
    }
  }


  loadData(obj) {
    if (!obj) return;

    let x = obj.scrollLeft || 0;
    let y = obj.scrollTop  || 0;

    this.doOnce(() => {
      this.scrollTo(x, y);
    }, 12);
  }

  init() {
    this.style["display"] = "flex";
    this.style["flex-direction"] = this.reversed ? "column-reverse" : "column";
    this.style["flex-wrap"] = "nowrap";

    this.setCSS();

    super.init();

    this.setAttribute("class", "containerx");
  }

  useIcons(enabled=true) {
    if (enabled) {
      this.packflag |= PackFlags.USE_ICONS;
      this.inherit_packflag |= PackFlags.USE_ICONS;
    } else {
      this.packflag &= ~PackFlags.USE_ICONS;
      this.inherit_packflag &= ~PackFlags.USE_ICONS;
    }

    return this;
  }

  /**
   *
   * @param mode: flexbox wrap mode, can be wrap, nowrap, or wrap-reverse
   * @returns {Container}
   */
  wrap(mode="wrap") {
    this.style["flex-wrap"] = mode;
    return this;
  }

  noMarginsOrPadding() {
    super.noMarginsOrPadding();

    let keys = ["margin", "padding", "margin-block-start", "margin-block-end"];
    keys = keys.concat(["padding-block-start", "padding-block-end"]);

    for (let k of keys) {
      this.style[k] = "0px";
    }

    return this;
  }

  setCSS() {
    let rest = '';

    let add = (style) => {
      if (!this.hasDefault(style)) {
        return;
      }

      let val = this.getDefault(style);

      if (val !== undefined) {
        rest += `  ${style} = ${val};\n`;
        this.style[style] = val;
      }
    }

    add("border-radius");
    add("border-width");
    add("border-top");
    add("border-bottom");
    add("border-left");
    add("border-right");

    this.styletag.textContent = `div.containerx {
        background-color : ${this.getDefault("background-color")};
        ${rest}
      }
      `;
  }

  overrideDefault(key, val) {
    super.overrideDefault(key, val);
    this.setCSS();

    return this;
  }

  /*
  * shorthand for:
  *
  * .row().noMarginsOrPadding().oneAxisPadding()
  * */
  strip(themeClass="strip", margin1 = this.getDefault("oneAxisPadding"), margin2 = 1, horiz=undefined) {
    if (horiz === undefined) {
      horiz = this instanceof RowFrame;
      horiz = horiz || this.style["flex-direction"] === "row";
    }

    let flag = horiz ? PackFlags.STRIP_HORIZ : PackFlags.STRIP_VERT;

    let strip = (horiz ? this.row() : this.col());

    if (typeof margin1 !== "number") {
      throw new Error("margin1 was not a number");
    }
    if (typeof margin2 !== "number") {
      throw new Error("margin2 was not a number");
    }

    strip.packflag |= flag;
    strip.dataPrefix = this.dataPrefix;

    if (themeClass in theme) {
      strip.overrideClass(themeClass);
      strip.background = strip.getDefault("background-color");
      strip.setCSS();
      strip.overrideClass(themeClass);

      let lastkey;

      strip.update.after(function() {
        let bradius = strip.getDefault("border-radius");
        let bline = strip.getDefault("border-width");
        let bstyle = strip.getDefault("border-style") || 'solid';
        let padding = strip.getDefault("padding");
        let bcolor = strip.getDefault("border-color") || "rgba(0,0,0,0)";
        let margin = strip.getDefault("margin") || 0;

        bline = bline === undefined ? 0 : bline;
        bradius = bradius === undefined ? 0 : bradius;
        padding = padding === undefined ? 5 : padding;

        let bg = strip.getDefault("background-color");

        let key = "" + bradius + ":" + bline + ":" + bg + ":" + padding + ":";
        key += bstyle + ":" + padding + ":" + bcolor + ":" + margin;

        if (key !== lastkey) {
          lastkey = key;

          strip.oneAxisPadding(margin1+padding, margin2+padding);
          strip.setCSS();

          strip.background = bg;

          strip.style["margin"] = "" + margin + "px";
          strip.style["border"] = `${bline}px ${bstyle} ${bcolor}`;
          strip.style["border-radius"] = "" + bradius + "px";
        }
      })
    } else {
      console.warn(this.constructor.name + ".strip(): unknown theme class " + themeClass);
    }

    /*
    let prev = strip.previousElementSibling;
    if (prev !== undefined && (prev.packflag & flag)) {
      if (horiz) {
        prev.style["padding-right"] = "0px";
      } else {
        prev.style["padding-top"] = "0px";
      }
    }//*/

    return strip;
  }

  /**
   * tries to set margin along one axis only in smart manner
   * */
  oneAxisMargin(m = this.getDefault("oneAxisMargin"), m2 = 0) {
    this.style["margin-top"] = this.style["margin-bottom"] = "" + m + "px";
    this.style["margin-left"] = this.style["margin-right"] = "" + m2 + "px";

    return this;
  }

  /**
   * tries to set padding along one axis only in smart manner
   * */
  oneAxisPadding(axisPadding = this.getDefault("oneAxisPadding"), otherPadding = 0) {
    this.style["padding-top"] = this.style["padding-bottom"] = "" + axisPadding + "px";
    this.style["padding-left"] = this.style["padding-right"] = "" + otherPadding + "px";

    return this;
  }

  setMargin(m) {
    this.style["margin"] = m + "px";

    return this;
  }

  setPadding(m) {
    this.style["padding"] = m + "px";

    return this;
  }

  setSize(width, height) {
    if (width !== undefined) {
      if (typeof width == "number")
        this.style["width"] = this.div.style["width"] = ~~width + "px";
      else
        this.style["width"] = this.div.style["width"] = width;
    }

    if (height !== undefined) {
      if (typeof height == "number")
        this.style["height"] = this.div.style["height"] = ~~height + "px";
      else
        this.style["height"] = this.div.style["height"] = height;
    }

    return this;
  }

  set background(bg) {
    this.__background = bg;

    this.styletag.textContent = `div.containerx {
        background-color : ${bg};
      }
    `;
    this.style["background-color"] = bg;
  }

  static define() {
    return {
      tagname: "container-x"
    };
  }

  save() {
  }

  load() {
  }

  saveVisibility() {
    localStorage[this.storagePrefix + "_settings"] = JSON.stringify(this);
    return this;
  }

  loadVisibility() {
    let key = this.storagePrefix + "_settings";
    let ok = true;

    if (key in localStorage) {
      console.log("loading UI visibility state. . .");

      try {
        this.loadJSON(JSON.parse(localStorage[key]));
      } catch (error) {
        util.print_stack(error);
        ok = false;
      }
    }

    return ok;
  }

  toJSON() {
    let ret = {
      opened: !this.closed
    };

    return Object.assign(super.toJSON(), ret);
  }

  _ondestroy() {
    this._forEachChildWidget((n) => {
      n._ondestroy();
    });

    super._ondestroy();
  }

  loadJSON(obj) {
    //console.error("ui.js:Container.loadJSON: implement me!");

    return this;
  }

  redrawCurves() {
    throw new Error("Implement me (properly!)");

    if (this.closed)
      return;

    for (let cw of this.curve_widgets) {
      cw.draw();
    }
  }

  listen() {
    window.setInterval(() => {
      this.update();
    }, 150);
  }

  get children() {
    let list = [];

    this._forEachChildWidget((n) => {
      list.push(n);
    });

    return list
  }

  update() {
    super.update();
    //this._forEachChildWidget((n) => {
    //  n.update();
    //});
  }

  //on_destroy() {
  //  super.on_destroy();
  //this.dat.destroy();
  //}

  appendChild(child) {
    if (child instanceof ui_base.UIBase) {
      child.ctx = this.ctx;
      child.parentWidget = this;
      this.shadow.appendChild(child);

      if (child.onadd) {
        child.onadd();
      }

      return;
    }

    return super.appendChild(child);
  }

  clear(trigger_on_destroy=true) {
    for (let child of this.children) {
      if (child instanceof ui_base.UIBase) {
        child.remove(trigger_on_destroy);
      }
    }
  }

  removeChild(child, trigger_on_destroy=true) {
    let ret = super.removeChild(child);

    if (child.on_remove) {
      child.on_remove();
    }

    if (trigger_on_destroy && child.on_destroy) {
      child.on_destroy();
    }

    child.parentWidget = undefined;

    return ret;
  }

  prepend(child) {
    if (child instanceof UIBase) {
      this._prepend(child);
    } else {
      super.prepend(child);
    }
  }

  //*
  _prepend(child) {
    return this._add(child, true);
  }//*/

  add(child) {
    return this._add(child);
  }

  insert(i, ch) {
    ch.parentWidget = this;
    ch.ctx = this;

    if (i >= this.shadow.childNodes.length) {
      this.add(ch);
    } else {
      this.shadow.insertBefore(ch, list(this.children)[i]);
    }

    if (ch.onadd) {
      ch.onadd();
    }
  }

  _add(child, prepend = false) {
    //paranoia check for if we accidentally got a DOM NodeList
    if (child instanceof NodeList) {
      throw new Error("eek!");
    }

    child.ctx = this.ctx;
    child.parentWidget = this;
    child._useDataPathUndo = this._useDataPathUndo;

    if (prepend) {
      this.shadow.prepend(child);
    } else {
      this.shadow.appendChild(child);
    }

    /*
    if (child._ctx) {
      child._init();
    }//*/

    if (child.onadd)
      child.onadd();

    return child;
  }

  //TODO: make sure this works on Electron?
  dynamicMenu(title, list, packflag=0) {
    //actually, .menu works for now
    return this.menu(title, list, packflag);
  }

  /**example usage:

   .menu([
     "some_tool_path.tool()|CustomLabel",
     ui_widgets.Menu.SEP,
     "some_tool_path.another_tool()",
     ["Name", () => {console.log("do something")}]
   ])

   **/
  menu(title, list, packflag = 0) {
    let dbox = UIBase.createElement("dropbox-x");

    dbox._name = title;
    dbox.setAttribute("simple", true);
    dbox.setAttribute("name", title);

    dbox._build_menu = function() {
      if (this._menu !== undefined && this._menu.parentNode !== undefined) {
        this._menu.remove();
      }

      this._menu = createMenu(this.ctx, title, list);
      return this._menu;
    }

    dbox.packflag |= packflag;
    dbox.inherit_packflag |= packflag;

    this._add(dbox);
    return dbox;
  }

  toolPanel(path_or_cls, args={}) {
    let tdef;
    let cls;

    if (typeof path_or_cls === "string") {
      cls = this.ctx.api.parseToolPath(path_or_cls);
    } else {
      cls = path_or_cls;
    }

    tdef = cls._getFinalToolDef();

    let packflag = args.packflag || 0;
    let label = args.label || tdef.uiname;
    let create_cb = args.create_cb;
    let container = args.container || this.panel(label);
    let defaultsPath = args.defaultsPath || "toolDefaults";

    if (defaultsPath.length > 0 && !defaultsPath.endsWith(".")) {
      defaultsPath += ".";
    }

    let path = defaultsPath + tdef.toolpath;

    container.useIcons(false);

    let inputs = tdef.inputs || {};
    for (let k in inputs) {
      let prop = inputs[k];

      if (prop.flag & PropFlags.PRIVATE) {
        continue;
      }

      let apiname = prop.apiname || k;
      let path2 = path + "." + apiname;

      container.prop(path2);
    }

    container.tool(path_or_cls, packflag, create_cb, label);

    return container;
  }

  tool(path_or_cls, packflag = 0, create_cb = undefined, label=undefined) {
    let cls;

    if (typeof path_or_cls == "string") {
      if (this.ctx === undefined) {
        console.warn("this.ctx was undefined in tool()");
        return;
      }

      cls = this.ctx.api.parseToolPath(path_or_cls);

      if (cls === undefined) {
        console.warn("Unknown tool for toolpath \"" + path_or_cls + "\"");
        return;
      }
    } else {
      cls = path_or_cls;
    }

    packflag |= this.inherit_packflag;
    let hotkey;

    if (create_cb === undefined) {
      create_cb = (cls) => {
        return this.ctx.api.createTool(this.ctx, path_or_cls);
      }
    }

    let cb = () => {
      console.log("tool run");

      let toolob = create_cb(cls);
      this.ctx.api.execTool(this.ctx, toolob);
    }

    let def = typeof path_or_cls === "string" ? this.ctx.api.getToolDef(path_or_cls) : cls.tooldef();
    let tooltip = def.description === undefined ? def.uiname : def.description;

    //is there a hotkey hardcoded in the class?
    if (def.hotkey !== undefined) {
      tooltip += "\n\t" + def.hotkey;
      hotkey = def.hotkey;
    } else { //if not, use getToolPathHotkey api
      let path = path_or_cls;

      if (typeof path != "string") {
        path = def.toolpath;
      }

      let hotkey = this.ctx.api.getToolPathHotkey(this.ctx, path);
      if (hotkey !== undefined) {
        tooltip += "\n\tHotkey: " + hotkey;
      }
    }

    let ret;

    if (def.icon !== undefined && (packflag & PackFlags.USE_ICONS)) {
      //console.log("iconbutton!");
      label = label !== undefined ? label : tooltip;

      ret = this.iconbutton(def.icon, label, cb);

      if (packflag & PackFlags.SMALL_ICON) {
        ret.iconsheet = ui_base.IconSheets.SMALL;
      } else {
        ret.iconsheet = ui_base.IconSheets.LARGE;
      }

      ret.packflag |= packflag;
    } else {
      label = label !== undefined ? label : def.uiname;

      ret = this.button(label, cb);
      ret.description = tooltip;
      ret.packflag |= packflag;
    }

    return ret;
  }

  //supports number types
  textbox(inpath, text="", cb=undefined, packflag = 0) {
    let path;

    if (inpath)
      path = this._joinPrefix(inpath);

    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("textbox-x");

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();
    ret.setCSS();
    ret.update();

    ret.packflag |= packflag;
    ret.onchange = cb;
    ret.text = text;

    this._add(ret);
    return ret;
  }

  pathlabel(inpath, label = "") {
    let path;

    if (inpath) {
      path = this._joinPrefix(inpath);
    }

    let ret = UIBase.createElement("label-x");

    ret.text = label;
    ret.setAttribute("datapath", path);

    this._add(ret);

    return ret;
  }

  label(text) {
    let ret = UIBase.createElement("label-x");
    ret.text = text;

    this._add(ret);

    return ret;
  }

  /**
   *
   * makes a button for a help picker tool
   * to view tooltips on mobile devices
   * */
  helppicker() {
    let ret = this.iconbutton(ui_base.Icons.HELP, "Help Picker", () => {
      this.getScreen().hintPickerTool();
    })

    if (util.isMobile()) {
      ret.iconsheet = 2;
    }

    if (ret.ctx) {
      ret._init();
      ret.setCSS();
    }

    return ret;
  }

  iconbutton(icon, description, cb, thisvar, packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("iconbutton-x")

    ret.packflag |= packflag;

    ret.setAttribute("icon", icon);
    ret.description = description;
    ret.icon = icon;

    if (packflag & PackFlags.SMALL_ICON) {
      ret.iconsheet = ui_base.IconSheets.SMALL;
    } else {
      ret.iconsheet = ui_base.IconSheets.LARGE;
    }

    ret.onclick = cb;

    this._add(ret);

    return ret;
  }

  button(label, cb, thisvar, id, packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("button-x")

    ret.packflag |= packflag;

    ret.setAttribute("name", label);
    ret.setAttribute("buttonid", id); //XXX no longer used?
    ret.onclick = cb;

    this._add(ret);

    return ret;
  }

  _joinPrefix(path) {
    if (path === undefined) {
      return undefined;
    }

    let prefix = this.dataPrefix.trim();

    path = path.trim();

    if (prefix.length > 0 && !prefix.endsWith(".") && !path.startsWith(".")) {
      path = "." + path;
    }

    return prefix + path;
  }

  colorbutton(inpath, packflag, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("color-picker-button-x");

    if (inpath !== undefined) {
      inpath = this._joinPrefix(inpath);
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path !== undefined) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    ret.packflag |= packflag;

    this._add(ret);
    return ret;
  }

  noteframe(packflag = 0) {
    let ret = UIBase.createElement("noteframe-x");

    ret.packflag |= this.inherit_packflag | packflag;

    this._add(ret);
    return ret;
  }

  curve1d(inpath, packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("curve-widget-x");

    ret.ctx = this.ctx;
    ret.packflag |= packflag;

    if (inpath) {
      inpath = this._joinPrefix(inpath);
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path)
      ret.setAttribute("mass_set_path", mass_set_path);

    this.add(ret);

    return ret;
  }

  vecpopup(inpath, packflag=0, mass_set_path=undefined) {
    let button = UIBase.createElement("vector-popup-button-x");

    packflag |= this.inherit_packflag;
    let name = "vector";

    if (inpath) {
      inpath = this._joinPrefix(inpath);

      button.setAttribute("datapath", inpath);
      if (mass_set_path) {
        button.setAttribute("mass_set_path", mass_set_path);
      }

      let rdef = this.ctx.api.resolvePath(this.ctx, inpath);
      if (rdef && rdef.prop) {
        name = rdef.prop.uiname || rdef.prop.name;
      }
    }

    button.setAttribute("name", name);
    button.packflag |= packflag;

    this.add(button);
    return button;
  }

  prop(inpath, packflag = 0, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let rdef = this.ctx.api.resolvePath(this.ctx, this._joinPrefix(inpath), true);

    if (rdef === undefined || rdef.prop === undefined) {
      console.warn("Unknown property at path", this._joinPrefix(inpath), this.ctx.api.resolvePath(this.ctx, this._joinPrefix(inpath), true));
      return;
    }
    //slider(path, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag=0) {
    let prop = rdef.prop;

    //console.log(prop, PropTypes, PropSubTypes);

    function makeUIName(name) {
      if (typeof name === "number" && isNaN(name)) {
        console.warn("Subkey error in data api", inpath);
        return ""+name;
      }
      
      name = ""+name;
      name = name[0].toUpperCase() + name.slice(1, name.length).toLowerCase();
      name = name.replace(/_/g, " ");
      return name;
    }

    if (prop.type === PropTypes.REPORT) {
      return this.pathlabel(inpath, prop.uiname);
    } else if (prop.type === PropTypes.STRING) {
      let ret;

      if (prop.flag & PropFlags.READ_ONLY) {
        ret = this.pathlabel(inpath, prop.uiname);
      } else if (prop.multiLine) {
        ret = this.textarea(inpath, rdef.value, packflag, mass_set_path);
      } else {
        let strip = this.strip();

        let uiname = prop.uiname !== undefined ? prop.uiname : ToolProperty.makeUIName(prop.apiname);

        strip.label(prop.uiname);

        ret = strip.textbox(inpath);

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }
      }

      ret.packflag |= packflag;
      return ret;
    } else if (prop.type === PropTypes.CURVE) {
      return this.curve1d(inpath, packflag, mass_set_path);
    } else if (prop.type === PropTypes.INT || prop.type === PropTypes.FLOAT) {
      let ret;
      if (packflag & PackFlags.SIMPLE_NUMSLIDERS) {
        ret = this.simpleslider(inpath, {packflag : packflag});
      } else {
        ret = this.slider(inpath, {packflag : packflag});
      }

      ret.packflag |= packflag;

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      return ret;
    } else if (prop.type === PropTypes.BOOL) {
      return this.check(inpath, prop.uiname, packflag, mass_set_path);
    } else if (prop.type === PropTypes.ENUM) {
      if (rdef.subkey !== undefined) {
        let subkey = rdef.subkey;
        let name = rdef.prop.ui_value_names[rdef.subkey];

        if (name === undefined) {
          name = makeUIName(rdef.subkey);
        }

        let check = this.check(inpath, rdef.prop.ui_value_names[subkey], packflag, mass_set_path);
        let tooltip = rdef.prop.descriptions[subkey];

        check.description = tooltip === undefined ? rdef.prop.ui_value_names[subkey] : tooltip;
        check.icon = rdef.prop.iconmap[rdef.subkey];

        return check;
      }

      if (!(packflag & PackFlags.USE_ICONS)) {
        let val;
        try {
          val = this.ctx.api.getValue(this.ctx, this._joinPrefix(inpath));
        } catch (error) {
          if (!(error instanceof DataPathError)) {
            throw error;
          }
        }

        if (packflag & PackFlags.FORCE_PROP_LABELS) {
          let strip = this.strip();
          strip.label(prop.uiname);

          return strip.listenum(inpath, {packflag, mass_set_path});
        } else {
          return this.listenum(inpath, {packflag, mass_set_path});
        }

      } else {
        if (packflag & PackFlags.FORCE_PROP_LABELS) {
          let strip = this.strip();
          strip.label(prop.uiname);

          return strip.checkenum(inpath, undefined, packflag);
        } else {
          return this.checkenum(inpath, undefined, packflag);
        }
      }
    } else if (prop.type & (PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4)) {
      if (rdef.subkey !== undefined) {
        let ret;

        if (packflag & PackFlags.SIMPLE_NUMSLIDERS)
          ret = this.simpleslider(inpath, {packflag : packflag});
        else
          ret = this.slider(inpath, {packflag : packflag});

        ret.packflag |= packflag;
        return ret;
      } else if (prop.subtype === PropSubTypes.COLOR) {
        return this.colorbutton(inpath, packflag, mass_set_path);
        //return this.colorPicker(inpath, packflag, mass_set_path);
      } else {
        let ret = UIBase.createElement("vector-panel-x");
        ret.packflag |= packflag;

        if (inpath) {
          ret.setAttribute("datapath", inpath);
        }

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }

        this.add(ret);

        return ret;
      }
    } else if (prop.type === PropTypes.FLAG) {
      if (rdef.subkey !== undefined) {
        let tooltip = rdef.prop.descriptions[rdef.subkey];
        let name = rdef.prop.ui_value_names[rdef.subkey];

        if (typeof rdef.subkey === "number") {
          name = rdef.prop.keys[rdef.subkey];
          if (name && name in rdef.prop.ui_value_names) {
            name = rdef.prop.ui_value_names[name];
          } else {
            name = makeUIName(name ? name : "(error)");
          }
        }

        if (name === undefined) {
          name = "(error)";
        }

        let ret = this.check(inpath, name, packflag, mass_set_path);

        ret.icon = rdef.prop.iconmap[rdef.subkey];

        if (tooltip) {
          ret.description = tooltip;
        }
      } else {
        let con = this;

        if (packflag & PackFlags.FORCE_PROP_LABELS) {
          con = this.strip();
          con.label(prop.uiname);
        }

        if (packflag & PackFlags.PUT_FLAG_CHECKS_IN_COLUMNS) {
          let i = 0;
          let row = con.row();
          let col1 = row.col();
          let col2 = row.col();

          for (let k in prop.values) {
            let name = prop.ui_value_names[k];
            let tooltip = prop.descriptions[k];

            if (name === undefined) {
              name = makeUIName(k);
            }

            let con2 = i & 1 ? col1 : col2;
            let check = con2.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

            if (tooltip) {
              check.description = tooltip;
            }

            i++;
          }


          return;
        }

        for (let k in prop.values) {
          let name = prop.ui_value_names[k];
          let tooltip = prop.descriptions[k];

          if (name === undefined) {
            name = makeUIName(k);
          }

          let check = con.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

          if (tooltip) {
            check.description = tooltip;
          }
        }
      }
    }
  }

  iconcheck(inpath, icon, name, mass_set_path) {
    let ret = UIBase.createElement("iconcheck-x");
    ret.icon = icon;
    ret.description = name;

    if (inpath) {
      ret.setAttribute("datapath", inpath);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this.add(ret);

    return ret;
  }

  check(inpath, name, packflag = 0, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let path = inpath !== undefined ? this._joinPrefix(inpath) : undefined;

    //let prop = this.ctx.getProp(path);
    let ret;
    if (packflag & PackFlags.USE_ICONS) {
      ret = UIBase.createElement("iconcheck-x");

      if (packflag & PackFlags.SMALL_ICON) {
        ret.iconsheet = ui_base.IconSheets.SMALL;
      }
    } else {
      ret = UIBase.createElement("check-x");
    }

    ret.packflag |= packflag;
    ret.label = name;
    ret.noMarginsOrPadding();

    if (inpath) {
      ret.setAttribute("datapath", path);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this._add(ret);

    //ret.update();

    return ret;
  }

  /*
  *
  * new (optional) form: checkenum(inpath, args)
  * */
  checkenum(inpath, name, packflag, enummap, defaultval, callback, iconmap, mass_set_path) {
    if (typeof name === "object" && name !== null) {
      let args = name;

      name = args.name;
      packflag = args.packflag;
      enummap = args.enummap;
      defaultval = args.defaultval;
      callback = args.callback;
      iconmap = args.iconmap;
      mass_set_path = args.mass_set_path;
    }

    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    let has_path = path !== undefined;
    let prop;

    if (path !== undefined) {
      prop = this.ctx.api.resolvePath(this.ctx, path, true);

      if (prop !== undefined)
        prop = prop.prop;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return;
      }

      let frame;

      frame = this.strip();

      frame.oneAxisPadding();
      frame.setCSS.after(frame.background = this.getDefault("BoxSub2BG"));

      if (packflag & PackFlags.USE_ICONS) {
        for (let key in prop.values) {
          let check = frame.check(inpath + "["+key+"]", "", packflag);

          check.icon = prop.iconmap[key];
          check.drawCheck = false;

          check.style["padding"] = "0px";
          check.style["margin"] = "0px";

          check.dom.style["padding"] = "0px";
          check.dom.style["margin"] = "0px";

          check.description = prop.descriptions[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname;
        }

        frame.label(name).font = "TitleText";

        let checks = {};

        let ignorecb = false;

        function makecb(key) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (let k in checks) {
              if (k !== key) {
                checks[k].checked = false;
              }
            }
            ignorecb = false;

            if (callback) {
              callback(key);
            }
          }
        }

        for (let key in prop.values) {
          let check = frame.check(inpath + " = " + prop.values[key], prop.ui_value_names[key]);
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }


          check.description = prop.descriptions[prop.keys[key]];
          if (!check.description) {
            check.description = ""+prop.ui_value_names[key];
          }
          check.onchange = makecb(key);
          //console.log("PATH", path);
        }
      }
    }
  }

  checkenum_panel(inpath, name, packflag=0, callback=undefined, mass_set_path=undefined, prop=undefined) {
    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    let has_path = path !== undefined;

    if (path !== undefined && prop === undefined) {
      prop = this.ctx.api.resolvePath(this.ctx, path, true);

      if (prop !== undefined)
        prop = prop.prop;
    }

    if (!name && prop) {
      name = prop.uiname;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return;
      }

      let frame = this.panel(name, name, packflag);

      frame.oneAxisPadding();
      frame.setCSS.after(frame.background = this.getDefault("BoxSub2BG"));

      if (packflag & PackFlags.USE_ICONS) {
        for (let key in prop.values) {
          let check = frame.check(inpath + " == " + prop.values[key], "", packflag);

          check.icon = prop.iconmap[key];
          check.drawCheck = false;

          check.style["padding"] = "0px";
          check.style["margin"] = "0px";

          check.dom.style["padding"] = "0px";
          check.dom.style["margin"] = "0px";

          check.description = prop.descriptions[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        if (name === undefined) {
          name = prop.uiname;
        }

        frame.label(name).font = "TitleText";

        let checks = {};

        let ignorecb = false;

        function makecb(key) {
          return () => {
            if (ignorecb) return;

            ignorecb = true;
            for (let k in checks) {
              if (k !== key) {
                checks[k].checked = false;
              }
            }
            ignorecb = false;

            if (callback) {
              callback(key);
            }
          }
        }

        for (let key in prop.values) {
          let check = frame.check(inpath + " = " + prop.values[key], prop.ui_value_names[key]);
          checks[key] = check;

          if (mass_set_path) {
            check.setAttribute("mass_set_path", mass_set_path);
          }


          check.description = prop.descriptions[prop.keys[key]];
          if (!check.description) {
            check.description = ""+prop.ui_value_names[key];
          }
          check.onchange = makecb(key);
          //console.log("PATH", path);
        }
      }
    }

  }

  /*
    enummap is an object that maps
    ui names to keys, e.g.:
    
    ui.listenum("color", "Color", {
      RED   : 0,
      GREEN : 1,
      BLUE  : 2
    });

    path can be undefined, in which case, use callback,
    which gets the current enum as an argument

    defaultval cannot be undefined
  */
  listenum(inpath, name, enumDef, defaultval, callback, iconmap, packflag = 0) {
    packflag |= this.inherit_packflag;
    let mass_set_path;

    if (name && typeof name === "object") {
      let args = name;

      name = args.name;
      enumDef = args.enumDef;
      defaultval = args.defaultval;
      callback = args.callback;
      iconmap = args.iconmap;
      packflag = args.packflag || 0;
      mass_set_path = args.mass_set_path;
    }

    let path;

    if (inpath !== undefined) {
      path = this._joinPrefix(inpath);
    }

    let ret = UIBase.createElement("dropbox-x")
    if (enumDef !== undefined) {
      if (enumDef instanceof toolprop.EnumProperty) {
        ret.prop = enumDef;
      } else {
        ret.prop = new toolprop.EnumProperty(defaultval, enumDef, path, name);
      }

      if (iconmap !== undefined) {
        ret.prop.addIcons(iconmap)
      }
    } else {
      let res = this.ctx.api.resolvePath(this.ctx, path, true);

      if (res !== undefined) {
        ret.prop = res.prop;

        name = name === undefined ? res.prop.uiname : name;
      }
    }

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }
    if (mass_set_path !== undefined) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    ret.setAttribute("name", name);

    if (defaultval) {
      ret.setValue(defaultval);
    }

    ret.onchange = callback;
    ret.onselect = callback;

    ret.packflag |= packflag;

    this._add(ret);
    return ret;
  }

  getroot() {
    let p = this;

    while (p.parent !== undefined) {
      p = p.parent;
    }

    return p;
  }

  curve(id, name, default_preset, packflag = 0) {
    packflag |= this.inherit_packflag;

    //XXX don't forget to OR packflag into widget
    throw new Error("implement me!");
  }

  simpleslider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {
    if (arguments.length === 2 || typeof name === "object") {
      let args = Object.assign({}, name);

      args.packflag = (args.packflag || 0) | PackFlags.SIMPLE_NUMSLIDERS;
      return this.slider(inpath, args);
      //new-style api call
    } else {
      return this.slider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag | PackFlags.SIMPLE_NUMSLIDERS);
    }
  }

  /**
   *
   * usage: .slider(inpath, {
   *  name : bleh,
   *  defaultval : number,
   *  etc...
   * });
   * */
  slider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {
    if (arguments.length === 2 || typeof name === "object") {
      //new-style api call

      let args = name;

      name = args.name;
      defaultval = args.defaultval;
      min = args.min;
      max = args.max;
      step = args.step;
      is_int = args.is_int || args.isInt;
      do_redraw = args.do_redraw;
      callback = args.callback;
      packflag = args.packflag || 0;
    }

    packflag |= this.inherit_packflag;
    let ret;

    if (inpath) {
      inpath = this._joinPrefix(inpath);

      let rdef = this.ctx.api.resolvePath(this.ctx, inpath, true);
      if (rdef && rdef.prop && (rdef.prop.flag & PropFlags.SIMPLE_SLIDER)) {
        packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      }
      if (rdef && rdef.prop && (rdef.prop.flag & PropFlags.FORCE_ROLLER_SLIDER)) {
        packflag |= PackFlags.FORCE_ROLLER_SLIDER;
      }
    }

    let simple = packflag & PackFlags.SIMPLE_NUMSLIDERS && !(packflag & PackFlags.FORCE_ROLLER_SLIDER);
    let extraTextBox = cconst.useNumSliderTextboxes && !(packflag & PackFlags.NO_NUMSLIDER_TEXTBOX);

    if (extraTextBox) {
      if (simple) {
        ret = UIBase.createElement("numslider-simple-x");
      } else {
        ret = UIBase.createElement("numslider-textbox-x");
      }
    } else {
      if (simple) {
        ret = UIBase.createElement("numslider-simple-x");
      } else {
        ret = UIBase.createElement("numslider-x");
      }
    }

    ret.packflag |= packflag;

    let decimals;

    if (inpath) {
      ret.setAttribute("datapath", inpath);

      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, inpath, true);
      } catch (error) {
        if (error instanceof DataPathError) {
          util.print_stack(error);
          console.warn("Error resolving property", inpath);
        } else {
          throw error;
        }
      }
      if (rdef && rdef.prop) {
        let prop = rdef.prop;

        let range = prop.uiRange !== undefined ? prop.uiRange : prop.range;
        range = range === undefined ? [-100000, 100000] : range;

        min = min === undefined ? range[0] : min;
        max = max === undefined ? range[1] : max;
        is_int = is_int === undefined ? prop.type === PropTypes.INT : is_int;
        name = name === undefined ? prop.uiname : name;
        step = step === undefined ? prop.step : step;
        step = step === undefined ? (is_int ? 1 : 0.1) : step;
        decimals = decimals === undefined ? prop.decimalPlaces : decimals;
      } else {
        console.warn("warning, failed to lookup property info for path", inpath);
      }
    }

    if (name) {
      ret.setAttribute("name", name);
    }

    if (min !== undefined) {
      //ret.range[0] = min;
      ret.setAttribute("min", min);
    }
    if (max !== undefined) {
      //ret.range[1] = max;
      ret.setAttribute("max", max);
    }

    if (defaultval !== undefined) {
      ret.setValue(defaultval);
    }

    if (is_int)
      ret.setAttribute("integer", is_int);
    if (decimals !== undefined) {
      ret.decimalPlaces = decimals;
    }

    if (callback) {
      ret.onchange = callback;
    }

    this._add(ret);

    return ret;
  }

  treeview() {
    let ret = UIBase.createElement("tree-view-x");
    ret.ctx = this.ctx;
    this.add(ret);

    ret.packflag |= this.inherit_packflag;
    ret.inherit_packflag |= this.inherit_packflag;
    ret.dataPrefix = this.dataPrefix;

    return ret;
  }

  panel(name, id, packflag = 0) {
    id = id === undefined ? name : id;
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("panelframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.dataPrefix = this.dataPrefix;

    ret.setAttribute("title", name);
    ret.setAttribute("id", id);

    this._add(ret);

    ret.ctx = this.ctx;
    ret.contents.ctx = ret.ctx;
    ret.contents.dataPrefix = this.dataPrefix;

    return ret.contents;
  }

  row(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("rowframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.dataPrefix = this.dataPrefix;

    this._add(ret);

    ret.ctx = this.ctx;

    return ret;
  }

  listbox(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("listbox-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.dataPrefix = this.dataPrefix;

    this._add(ret);
    return ret;
  }

  table(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("tableframe-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.dataPrefix = this.dataPrefix;

    this._add(ret);
    return ret;
  }

  col(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("colframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.dataPrefix = this.dataPrefix;

    this._add(ret);
    return ret;
  }

  colorPicker(inpath, packflag = 0, mass_set_path = undefined) {
    let path;

    if (inpath) {
      path = this._joinPrefix(inpath);
    }

    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("colorpicker-x");

    packflag |= PackFlags.SIMPLE_NUMSLIDERS;

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.dataPrefix = this.dataPrefix;

    ret.ctx = this.ctx;
    ret.parentWidget = this;
    ret._init();
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.constructor.setDefault(ret);

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    console.warn("mass_set_path", mass_set_path);
    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    //XXX
    window.colorpicker = ret;

    this._add(ret);
    return ret;
  }

  textarea(datapath=undefined, value="", packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("rich-text-editor-x");
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath)
      ret.setAttribute("datapath", datapath)
    if (mass_set_path)
      ret.setAttribute("mass_set_path", mass_set_path)

    this.add(ret);
    return ret;
  }

  /**
   * html5 viewer
   * */
  viewer(datapath=undefined, value="", packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("html-viewer-x");
    ret.ctx = this.ctx;

    ret.packflag |= packflag;

    if (value !== undefined) {
      ret.value = value;
    }

    if (datapath)
      ret.setAttribute("datapath", datapath)
    if (mass_set_path)
      ret.setAttribute("mass_set_path", mass_set_path)

    this.add(ret);
    return ret;
  }

  //
  tabs(position = "top", packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = UIBase.createElement("tabcontainer-x");

    ret.constructor.setDefault(ret);
    ret.setAttribute("bar_pos", position);
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.ctx = this.ctx;

    this._add(ret);
    return ret;
  }
};

ui_base.UIBase.internalRegister(Container, "div");


export class RowFrame extends Container {
  constructor() {
    super();

    let style = UIBase.createElement("style");

    this.shadow.appendChild(style);
  }

  //try to set styling as early as possible
  connectedCallback() {
    super.connectedCallback();

    this.style['display'] = 'flex';
    this.style['flex-direction'] = this.reversed ? 'row-reverse' : 'row';
  }

  init() {
    super.init();

    this.style['display'] = 'flex';
    this.style['flex-direction'] = this.reversed ? 'row-reverse' : 'row';

    if (!this.style['align-items'] || this.style['align-items'] == '') {
      this.style['align-items'] = 'center';
    }
  }

  oneAxisMargin(m = this.getDefault('oneAxisMargin'), m2 = 0) {
    this.style['margin-left'] = this.style['margin-right'] = m + 'px';
    this.style['margin-top'] = this.style['margin-bottom'] = '' + m2 + 'px';

    return this;
  }

  oneAxisPadding(m = this.getDefault('oneAxisPadding'), m2 = 0) {
    this.style['padding-left'] = this.style['padding-right'] = '' + m + 'px';
    this.style['padding-top'] = this.style['padding-bottom'] = '' + m2 + 'px';

    return this;
  }

  update() {
    super.update();
  }

  static define() {
    return {
      tagname: 'rowframe-x'
    };
  }
}

UIBase.internalRegister(RowFrame);

export class ColumnFrame extends Container {
  constructor() {
    super();
  }

  init() {
    super.init();

    this.style["display"] = "flex";
    this.style["flex-direction"] = "column";
  }

  update() {
    super.update();
  }


  oneAxisMargin(m = this.getDefault('oneAxisMargin'), m2 = 0) {
    this.style['margin-top'] = this.style['margin-bottom'] = '' + m + 'px';
    this.style['margin-left'] = this.style['margin-right'] = m2 + 'px';

    return this;
  }

  oneAxisPadding(m = this.getDefault('oneAxisPadding'), m2 = 0) {
    this.style['padding-top'] = this.style['padding-bottom'] = '' + m + 'px';
    this.style['padding-left'] = this.style['padding-right'] = '' + m2 + 'px';

    return this;
  }

  static define() {
    return {
      tagname: "colframe-x"
    };
  }
}

UIBase.internalRegister(ColumnFrame);

