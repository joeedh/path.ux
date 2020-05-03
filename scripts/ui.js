//bind module to global var to get at it in console.
//
//note that require has an api for handling circular 
//module refs, in such cases do not use these vars.

var _ui = undefined;

import * as util from './util.js';
import * as vectormath from './util.js';
import * as ui_curvewidget from './ui_curvewidget.js';
import * as ui_base from './ui_base.js';
import * as ui_widgets from './ui_widgets.js';
import * as toolprop from './toolprop.js';
import './html5_fileapi.js';

let PropFlags = toolprop.PropFlags;
let PropSubTypes = toolprop.PropSubTypes;

let EnumProperty = toolprop.EnumProperty;

let Vector2 = vectormath.Vector2,
  UIBase = ui_base.UIBase,
  PackFlags = ui_base.PackFlags,
  PropTypes = toolprop.PropTypes;

export const SimpleContext = ui_base.SimpleContext;
export const DataPathError = ui_base.DataPathError;

var list = function list(iter) {
  let ret = [];

  for (let item of iter) {
    ret.push(item);
  }

  return ret;
}

export class Label extends ui_base.UIBase {
  constructor() {
    super();

    this._label = "";
    this._font = "LabelText";

    this.dom = document.createElement("div");
    this.dom.setAttribute("class", "_labelx");

    let style = document.createElement("style");
    style.textContent = `
      div._labelx::selection {
        color: none;
        background: none;
      }
    `;

    this.shadow.appendChild(style);
    this.shadow.appendChild(this.dom);
  }

  init() {
    let font = this.getDefault(this._font);

    this.dom.style["width"] = "max-content";

    this.dom.style["font"] = font.genCSS();
    this.dom.style["color"] = font.color;
  }

  get font() {
    return this._font;
  }

  /**Set a font defined in ui_base.defaults
   e.g. DefaultText*/
  set font(prefix) {
    if (this._font == prefix) {
      return;
    }

    this._font = prefix;

    this.dom.style["font"] = ui_base.getFont(this, undefined, prefix, false);
    this.dom.style["color"] = this.getDefault(prefix + "Color");
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
    if (prop !== undefined && prop.type == PropTypes.INT) {
      val = val.toString(prop.radix);

      if (prop.radix == 2) {
        val = "0b" + val;
      } else if (prop.radix == 16) {
        val += "h";
      }
    } else if (prop !== undefined && prop.type == PropTypes.FLOAT && val !== Math.floor(val)) {
      val = val.toFixed(prop.decimalPlaces);
    }

    val = "" + val;

    this.dom.innerText = this._label + val;
  }

  update() {
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

ui_base.UIBase.register(Label);

export class Container extends ui_base.UIBase {
  constructor() {
    super();

    this.dataPrefix = '';
    this.inherit_packflag = 0;

    let style = this.styletag = document.createElement("style")
    style.textContent = `
    `;

    this.shadow.appendChild(style);
  }

  init() {
    this.style["display"] = "flex";
    this.style["flex-direction"] = "column";
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
    this.styletag.textContent = `div.containerx {
        background-color : ${this.getDefault("DefaultPanelBG")};
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
  strip(m = this.getDefault("oneAxisPadding"), m2 = 0) {
    let horiz = this instanceof RowFrame;
    horiz = horiz || this.style["flex-direction"] === "row";

    let flag = horiz ? PackFlags.STRIP_HORIZ : PackFlags.STRIP_VERT;

    let strip = (horiz ? this.row() : this.col()).oneAxisPadding(m, m2);
    strip.packflag |= flag;

    let prev = strip.previousElementSibling;
    if (prev !== undefined && (prev.packflag & flag)) {
      if (horiz) {
        prev.style["padding-right"] = "0px";
      } else {
        prev.style["padding-top"] = "0px";
      }
    }

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
  oneAxisPadding(m = this.getDefault("oneAxisPadding"), m2 = 0) {
    this.style["padding-top"] = this.style["padding-bottom"] = "" + m + "px";
    this.style["padding-left"] = this.style["padding-right"] = "" + m2 + "px";

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
    }

    let ret = super.appendChild(child);

    if (child instanceof ui_base.UIBase && child.onadd) {
      child.onadd();
    }

    return ret;
  }

  clear() {
    for (let child of this.children) {
      if (child instanceof ui_base.UIBase) {
        child.remove();

        if (child.on_destroy !== undefined)
          child.on_destroy();
      }
    }
  }

  //*
  _prepend(child) {
    return this._add(child, true);
  }//*/

  add(child) {
    return this._add(child);
  }

  _add(child, prepend = false) {
    //paranoia check for if we accidentally got a DOM NodeList
    if (child instanceof NodeList) {
      throw new Error("eek!");
    }

    child.ctx = this.ctx;
    child.parentWidget = this;

    this.shadow.appendChild(child);

    if (child.onadd)
      child.onadd();

    return child;
  }

  /*
  .menu([
    "some_tool_path.tool",
    ui_widgets.Menu.SEP,
    "some_tool_path.another_tool",
    ["Name", () => {console.log("do something")}]
  ])
  */
  menu(title, list, packflag = 0) {
    let dbox = document.createElement("dropbox-x");

    dbox._name = title;
    dbox.setAttribute("simple", true);
    dbox.setAttribute("name", title);

    dbox._build_menu = () => {
      if (this._menu !== undefined && this._menu.parentNode !== undefined) {
        this._menu.remove();
      }

      let menu = dbox._menu = document.createElement("menu-x");
      //menu.setAttribute("name", title);

      let SEP = menu.constructor.SEP;
      let id = 0;
      let cbs = {};

      for (let item of list) {
        if (typeof item == "string") {
          let def;
          try {
            def = this.ctx.api.getToolDef(item);
          } catch (error) {
            menu.addItem("(tool path error)", id++);
            continue;
          }
          //addItemExtra(text, id=undefined, hotkey, icon=-1, add=true) {
          menu.addItemExtra(def.uiname, id, def.hotkey, def.icon);
          let this2 = this;

          cbs[id] = (function (toolpath) {
            return function () {
              this2.ctx.api.execTool(this2.ctx, toolpath);
            }
          })(item);

          id++;
        } else if (item === SEP) {
          menu.seperator();
        } else if (item instanceof Array) {
          let hotkey = item.length > 2 ? item[2] : undefined;
          let icon = item.length > 3 ? item[3] : undefined;

          menu.addItemExtra(item[0], id, hotkey, icon);

          cbs[id] = (function (cbfunc, arg) {
            return function () {
              cbfunc(arg);
            }
          })(item[1], item[2]);

          id++;
        }
      }

      menu.onselect = (id) => {
        cbs[id]();
      }
    };

    dbox.packflag |= packflag;
    dbox.inherit_packflag |= packflag;

    this._add(dbox);
    return dbox;
  }

  tool(path_or_cls, packflag = 0, create_cb = undefined) {
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

    let def = cls.tooldef();
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
      ret = this.iconbutton(def.icon, tooltip, cb);

      if (packflag & PackFlags.SMALL_ICON) {
        ret.iconsheet = ui_base.IconSheets.SMALL;
      } else {
        ret.iconsheet = ui_base.IconSheets.LARGE;
      }

      ret.packflag |= packflag;
    } else {
      ret = this.button(def.uiname, cb);
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

    let ret = document.createElement("textbox-x");

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
    if (inpath)
      path = this._joinPrefix(inpath);

    let ret = document.createElement("label-x");

    ret.text = label;
    ret.setAttribute("datapath", path);

    this._add(ret);

    return ret;
  }

  label(text) {
    let ret = document.createElement("label-x");
    ret.text = text;

    this._add(ret);

    return ret;
  }

  iconbutton(icon, description, cb, thisvar, packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("iconbutton-x")

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

    let ret = document.createElement("button-x")

    ret.packflag |= packflag;

    ret.setAttribute("name", label);
    ret.setAttribute("buttonid", id);
    ret.onclick = cb;

    this._add(ret);

    return ret;
  }

  _joinPrefix(path) {
    let prefix = this.dataPrefix.trim();

    return prefix + path;
  }

  colorbutton(inpath, packflag, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("color-picker-button-x");

    if (inpath !== undefined) {
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
    let ret = document.createElement("noteframe-x");

    ret.packflag |= this.inherit_packflag | packflag;

    this._add(ret);
    return ret;
  }

  prop(inpath, packflag = 0, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    let rdef = this.ctx.api.resolvePath(this.ctx, path, true);

    if (rdef === undefined || rdef.prop === undefined) {
      console.warn("Unknown property at path", path, this.ctx.api.resolvePath(this.ctx, path));
      return;
    }
    //slider(path, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag=0) {
    let prop = rdef.prop;

    //console.log(prop, PropTypes, PropSubTypes);

    function makeUIName(name) {
      name = name[0].toUpperCase() + name.slice(1, name.length).toLowerCase();
      name = name.replace(/_/g, " ");
      return name;
    }

    if (prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT) {
      let ret = this.slider(inpath);

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      return ret;
    } else if (prop.type == PropTypes.BOOL) {
      this.check(inpath, prop.uiname, packflag, mass_set_path);
    } else if (prop.type == PropTypes.ENUM) {
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
          val = this.ctx.api.getValue(this.ctx, path);
        } catch (error) {
          if (!(error instanceof DataPathError)) {
            throw error;
          }
        }

        this.listenum(inpath, undefined, undefined, val, undefined, undefined, packflag);
      } else {
        this.checkenum(inpath, undefined, packflag);
      }
    } else if (prop.type & (PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4)) {
      if (rdef.subkey !== undefined) {
        return this.slider(path);
      } else if (prop.subtype === PropSubTypes.COLOR) {
        return this.colorbutton(inpath, packflag, mass_set_path);
        //return this.colorPicker(inpath, packflag, mass_set_path);
      } else {
        let ret = document.createElement("vector-panel-x");

        if (inpath) {
          ret.setAttribute("datapath", inpath);
        }

        if (mass_set_path) {
          ret.setAttribute("mass_set_path", mass_set_path);
        }

        this.add(ret);

        return ret;
      }
    } else if (prop.type == PropTypes.FLAG) {
      if (rdef.subkey !== undefined) {
        let tooltip = rdef.prop.descriptions[rdef.subkey];
        let name = rdef.prop.ui_value_names[rdef.subkey];

        if (name === undefined) {
          name = makeUIName(rdef.subkey);
        }

        let ret = this.check(inpath, name, packflag, mass_set_path);

        ret.icon = rdef.prop.iconmap[rdef.subkey];

        if (tooltip) {
          ret.description = tooltip;
        }
      } else {
        for (let k in prop.values) {
          let name = prop.ui_value_names[k];
          let tooltip = prop.descriptions[k];

          if (name === undefined) {
            name = makeUIName(k);
          }

          let ret = this.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

          if (tooltip) {
            ret.description = tooltip;
          }
        }
      }
    }
  }

  check(inpath, name, packflag = 0, mass_set_path = undefined) {
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    //let prop = this.ctx.getProp(path);
    let ret;
    if (packflag & PackFlags.USE_ICONS) {
      ret = document.createElement("iconcheck-x");

      if (packflag & PackFlags.SMALL_ICON) {
        ret.iconsheet = ui_base.IconSheets.SMALL;
      }
    } else {
      ret = document.createElement("check-x");
    }

    ret.packflag |= packflag;
    ret.label = name;
    ret.setAttribute("datapath", path);
    ret.noMarginsOrPadding();

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this._add(ret);

    //ret.update();

    return ret;
  }

  checkenum(inpath, name, packflag, enummap, defaultval, callback, iconmap, mass_set_path) {
    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag;

    let path = this._joinPrefix(inpath);

    let has_path = path !== undefined;
    let prop;

    if (path !== undefined) {
      prop = this.ctx.api.resolvePath(this.ctx, path);

      if (prop !== undefined)
        prop = prop.prop;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return;
      }

      let frame;

      if (packflag & PackFlags.VERTICAL) {
        frame = this.col();
      } else {
        frame = this.row();
      }

      frame.oneAxisPadding();
      frame.background = this.getDefault("BoxSub2BG");

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
      prop = this.ctx.api.resolvePath(this.ctx, path);

      if (prop !== undefined)
        prop = prop.prop;
    }

    if (!name) {
      name = prop.uiname;
    }

    if (path !== undefined) {
      if (prop === undefined) {
        console.warn("Bad path in checkenum", path);
        return;
      }

      let frame = this.panel(name, name, packflag);

      frame.oneAxisPadding();
      frame.background = this.getDefault("BoxSub2BG");

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
  listenum(inpath, name, enummap, defaultval, callback, iconmap, packflag = 0) {
    packflag |= this.inherit_packflag;

    let path;

    if (inpath !== undefined) {
      path = this._joinPrefix(inpath);
    }

    let ret = document.createElement("dropbox-x")
    if (enummap !== undefined) {
      ret.prop = new ui_base.EnumProperty(defaultval, enummap, path, name);

      if (iconmap !== undefined) {
        ret.prop.addIcons(iconmap)
      }
    } else {
      let res = this.ctx.api.resolvePath(this.ctx, path);

      if (res !== undefined) {
        ret.prop = res.prop;

        name = name === undefined ? res.prop.uiname : name;
      }
    }

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    ret.setAttribute("name", name);

    ret.onselect = (id) => {
      if (callback !== undefined) {
        callback(id);
      }
    }

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

    var cw = new CurveWidget(this.storagePrefix + id);

    if (default_preset !== undefined)
      cw.load(default_preset);

    var l = this.dat.add({bleh: "name"}, "bleh");

    var parent = l.domElement.parentElement.parentElement.parentElement;

    parent["class"] = parent.style["class"] = "closed";

    cw.bind(parent, this);
    cw.draw();

    l.remove();

    this.curve_widgets.push(cw);

    return cw;
  }

  simpleslider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {
    return this.slider(inpath, name, defaultval, min,
      max, step, is_int, do_redraw,
      callback, packflag | PackFlags.SIMPLE_NUMSLIDERS);
  }

  slider(inpath, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag = 0) {
    packflag |= this.inherit_packflag;
    let ret;

    if (inpath) {
      let rdef = this.ctx.api.resolvePath(this.ctx, inpath);
      if (rdef && rdef.prop && (rdef.prop.flag & PropFlags.SIMPLE_SLIDER)) {
        packflag |= PackFlags.SIMPLE_NUMSLIDERS;
      }
    }

    if (packflag & PackFlags.SIMPLE_NUMSLIDERS) {
      ret = document.createElement("numslider-simple-x")
    } else {
      ret = document.createElement("numslider-x")
    }
    ret.packflag |= packflag;

    let decimals;

    if (inpath) {
      let path = this._joinPrefix(inpath);

      ret.setAttribute("datapath", path);

      let rdef;
      try {
        rdef = this.ctx.api.resolvePath(this.ctx, path, true);
      } catch (error) {
        if (error instanceof DataPathError) {
          util.print_stack(error);
          console.warn("Error resolving property", path);
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
        console.warn("warning, failed to lookup property info for path", path);
      }
    }

    if (name)
      ret.setAttribute("name", name);
    if (min !== undefined)
      ret.setAttribute("min", min);
    if (max !== undefined)
      ret.setAttribute("max", max);
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

  panel(name, id, packflag = 0) {
    id = id === undefined ? name : id;
    packflag |= this.inherit_packflag;

    let ret = document.createElement("panelframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    ret.setAttribute("title", name);
    ret.setAttribute("id", id);

    this._add(ret);

    ret.ctx = this.ctx;
    ret.contents.ctx = ret.ctx;

    return ret.contents;
  }

  row(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("rowframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);

    ret.ctx = this.ctx;

    return ret;
  }

  listbox(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("listbox-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);
    return ret;
  }

  table(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("tableframe-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);
    return ret;
  }

  col(packflag = 0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("colframe-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);
    return ret;
  }

  colorPicker(inpath, packflag = 0, mass_set_path = undefined) {
    let path;

    if (inpath)
      path = this._joinPrefix(inpath);

    packflag |= this.inherit_packflag;

    let ret = document.createElement("colorpicker-x");

    packflag |= PackFlags.SIMPLE_NUMSLIDERS;

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

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

    let ret = document.createElement("rich-text-editor-x");
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

    let ret = document.createElement("html-viewer-x");
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

    let ret = document.createElement("tabcontainer-x");

    ret.constructor.setDefault(ret);
    ret.setAttribute("bar_pos", position);
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    ret.ctx = this.ctx;

    this._add(ret);
    return ret;
  }
};

ui_base.UIBase.register(Container, "div");


export class RowFrame extends Container {
  constructor() {
    super();

    let style = document.createElement("style");

    this.shadow.appendChild(style);
  }

  //try to set styling as early as possible
  connectedCallback() {
    super.connectedCallback();

    this.style["display"] = "flex";
    this.style["flex-direction"] = "row";
  }

  init() {
    super.init();

    //this.style["flex-direction"] = "row";
    this.style["display"] = "flex";
    this.style["flex-direction"] = "row";
    this.style["align-items"] = "center";
  }

  oneAxisMargin(m = this.getDefault("oneAxisMargin"), m2 = 0) {
    this.style["margin-left"] = this.style["margin-right"] = m + "px";
    this.style["margin-top"] = this.style["margin-bottom"] = "" + m2 + "px";

    return this;
  }

  oneAxisPadding(m = this.getDefault("oneAxisPadding"), m2 = 0) {
    this.style["padding-left"] = this.style["padding-right"] = "" + m + "px";
    this.style["padding-top"] = this.style["padding-bottom"] = "" + m2 + "px";

    return this;
  }

  update() {
    super.update();
  }

  static define() {
    return {
      tagname: "rowframe-x"
    };
  }
}

UIBase.register(RowFrame);

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

  static define() {
    return {
      tagname: "colframe-x"
    };
  }
}

UIBase.register(ColumnFrame);

export class PanelFrame extends ColumnFrame {
  constructor() {
    super();

    this.contents = document.createElement("colframe-x");

    this._closed = false;
  }

  saveData() {
    let ret = {
      _closed: this._closed
    };

    return Object.assign(super.saveData(), ret);
  }

  loadData(obj) {
    this.closed = obj._closed;
  }

  clear() {
    this.clear();
    this.add(this.titleframe);
  }

  init() {
    super.init();

    //con.style["margin-left"] = "5px";
    let con = this.titleframe = this.row();

    this.setCSS();

    let row = con;

    let iconcheck = document.createElement("iconcheck-x");
    this.iconcheck = iconcheck;

    this.style["width"] = "100%";

    this.overrideDefault("BoxMargin", 0);
    iconcheck.overrideDefault("BoxMargin", 0);

    iconcheck.noMarginsOrPadding();

    iconcheck.overrideDefault("BoxBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxSubBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxDepressed", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxBorder", "rgba(0,0,0,0)");

    iconcheck.ctx = this.ctx;
    iconcheck._icon_pressed = ui_base.Icons.UI_EXPAND;
    iconcheck._icon = ui_base.Icons.UI_COLLAPSE;
    iconcheck.drawCheck = false;
    iconcheck.iconsheet = ui_base.IconSheets.SMALL;
    iconcheck.checked = this._closed;

    this.iconcheck.onchange = (e) => {
      this.closed = this.iconcheck.checked;
    };

    row._add(iconcheck);

    //stupid css, let's just hackishly put " " to create spacing2

    let onclick = (e) => {
      console.log("panel header click");
      iconcheck.checked = !iconcheck.checked;
    };

    let label = row.label(this.getAttribute("title"));

    label.overrideDefault("LabelText", this.getDefault("TitleText").copy());
    label.noMarginsOrPadding();
    label.addEventListener("mousedown", onclick);
    label.addEventListener("touchdown", onclick);

    row.background = this.getDefault("BoxSubBG");
    row.style["border-radius"] = "5px";
    
    this.background = this.getDefault("BoxSub2BG");

    row.style["padding-right"] = "20px";
    row.style["padding-left"] = "5px";
    row.style["padding-top"] = "7px";
    row.style["padding-bottom"] = "5px";

    this.contents.ctx = this.ctx;
    this.add(this.contents);
  }

  static define() {
    return {
      tagname: "panelframe-x"
    };
  }

  update() {
    super.update();
  }

  _setVisible(state) {
    if (state) {
      this.contents.remove();
    } else {
      this.add(this.contents, false);
    }

    this.contents.hidden = state;
    return;
    for (let c of this.shadow.childNodes) {
      if (c !== this.titleframe) {
        c.hidden = state;
      }
    }
  }

  _updateClosed() {
    this._setVisible(this._closed);
    this.iconcheck.checked = this._closed;
  }

  get closed() {
    return this._closed;
  }

  set closed(val) {
    let update = !!val != !!this.closed;
    this._closed = val;

    //console.log("closed set", update);
    if (update) {
      this._updateClosed();
    }
  }
}

UIBase.register(PanelFrame);
