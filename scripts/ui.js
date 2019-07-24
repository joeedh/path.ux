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
    
    this.dom = document.createElement("div");
    this.dom.style["font"] = ui_base._getFont(undefined, "LabelText", false);
    this.dom.style["color"] = this.getDefault("LabelTextColor");
    
    this._label = "";
    this.shadow.appendChild(this.dom);
  }
  
  init() {
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
    
    val = ""+val;
    
    this.dom.innerText = this._label + val;
  }
  
  update() {
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
  
  static define() {return {
    tagname : "label-x"
  };}    
}
ui_base.UIBase.register(Label);

export class Container extends ui_base.UIBase {
  constructor() {
      super();
      
      this.inherit_packflag = 0;
      
      let ul = this.ul = document.createElement("ul")
      ul.style["margin"] = "1px";
      ul.style["padding"] = "1px";
      
      this.div = document.createElement("div")
      
      this.div.appendChild(ul);
      ul.style["list-style-type"] = "none";

      let style = this.styletag = document.createElement("style")
      this.div.setAttribute("class", "containerx");

      style.textContent = `
        ul.containerx {
          margin : 0px;
          padding : 0px;
        }
        
        li.containerx {
          margin : 0px;
          padding : 0px;
        }
      `

      this.setCSS();

      this.shadow.appendChild(style);
      this.shadow.appendChild(this.div);
      
      this.dom = ul;
  }

  init() {
    super.init();
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
  }

  noMargins() {
    this.style["margin"] = this.style["padding"] = "0px";
    this.div.style["margin"] = this.div.style["padding"] = "0px";
    this.ul.style["margin"] = this.ul.style["padding"] = "0px";
  }

  setMargin(m) {
    this.style["margin"] = m + "px";
    this.div.style["margin"] = m + "px";
    this.ul.style["margin"] = m + "px";
  }

  setPadding(m) {
    this.style["padding"] = m + "px";
    this.div.style["padding"] = m + "px";
    this.ul.style["padding"] = m + "px";
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
  }

  get background() {
    return this.__background;
  }
  
  set background(bg) {
    this.__background = bg;
    
    this.styletag.textContent = `div.containerx {
        background-color : ${bg};
      }
    `;
    this.style["background-color"] =  bg;
    this.dom.style["background-color"] = bg;
  }
  
  static define() {return {
    tagname : "container-x"
  };}
  
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
      opened : !this.closed
    };
          
    return Object.assign(super.toJSON(), ret);
  }
  
  _ondestroy() {
    for (let child of this.children) {
      child._ondestroy();
    }
    
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
    
    this._forEachChildren((n) => {
      list.push(n);
    });
    
    return list
  }
  
  update() {
    super.update();
    //this._forEachChildren((n) => {
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

  add(child) {
    return this._add(child);
  }

  _add(child) {
    if (child instanceof NodeList) {
      throw new Error("eek!");
    }
    
    child.parentWidget = this;
    child.ctx = this.ctx;
    
    let li = document.createElement("li");
    li.setAttribute("class", "containerx");

    li.style["list-style-type"] = "none";
    li.appendChild(child);
    
    this.dom.appendChild(li);

    if (child.onadd)
      child.onadd();
    
    return li;
  }
  
  /*
  .menu([
    "some_tool_path.tool",
    ui_widgets.Menu.SEP,
    "some_tool_path.another_tool",
    ["Name", () => {console.log("do something")}]
  ])
  */ 
  menu(title, list, packflag=0) {
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
            return function() {
              this2.ctx.api.execTool(this.ctx, toolpath);
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
            return function() {
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
  
  tool(path_or_cls, packflag=0, create_cb=undefined) {
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
  textbox(path, text, cb, packflag=0) {
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("textbox-x")
  
    ret.ctx = this.ctx;
    ret.packflag |= packflag;
    ret.onchange = cb;
    ret.text = text;
    
    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }
    
    this._add(ret);
    return ret;
  }
  
  pathlabel(path, label="") {
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
  
  iconbutton(icon, description, cb, thisvar, packflag=0) {
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
  
  button(label, cb, thisvar, id, packflag=0) {
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("button-x")
  
    ret.packflag |= packflag;
    
    ret.setAttribute("name", label);
    ret.setAttribute("buttonid", id);
    ret.onclick = cb;
    
    this._add(ret);
    
    return ret;
  }
  
  _path_get(path) {
    if (typeof path == "string" || path instanceof String) {
      path = new ObjectPath(path);
    }
    
    var obj = this.state;
    var parentobj = undefined;
    
    for (var key of path) {
      parentobj = obj;
      
      obj = obj[key];
    }
    
    return [obj, parentobj];
  }

  prop(path, packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;

    let rdef = this.ctx.api.resolvePath(this.ctx, path);

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
      let ret = this.slider(path);

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      return ret;
    } else if (prop.type == PropTypes.BOOL) {
      this.check(path, prop.uiname, packflag);
    } else if (prop.type == PropTypes.ENUM) {
      if (!(packflag & PackFlags.USE_ICONS)) {
        this.listenum(path, undefined, undefined, this.ctx.api.getValue(this.ctx, path), undefined, undefined, packflag);
      } else {
        this.checkenum(path, undefined, packflag);
      }
    } else if (prop.type == PropTypes.VEC3 || prop.type == PropTypes.VEC4) {
      if (prop.subtype == PropSubTypes.COLOR) {
        this.colorPicker(path, packflag, mass_set_path);
      } else {

      }
    } else if (prop.type == PropTypes.FLAG) {
      if (rdef.subkey !== undefined) {
        let tooltip = rdef.prop.descriptions[rdef.subkey];
        let name = rdef.prop.ui_value_names[rdef.subkey];

        if (name === undefined) {
          name = makeUIName(rdef.subkey);
        }

        let ret = this.check(path, name, packflag, mass_set_path);

        if (tooltip) {
          ret.description = tooltip;
        }
      } else {
        for (let k in prop.keys) {
          let name = prop.ui_key_names[k];
          let tooltip = prop.descriptions[k];

          if (name === undefined) {
            name = makeUIName(k);
          }

          let ret = this.check(`${path}[${k}]`, name, packflag, mass_set_path);

          if (tooltip) {
            ret.description = tooltip;
          }
        }
      }
    }
  }

  check(path, name, packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;
    
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
    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    this._add(ret);
    
    ret.update();
    
    return ret;
  }

  checkenum(path, name, packflag, enummap, defaultval, callback, iconmap, mass_set_path) {
    packflag = packflag === undefined ? 0 : packflag;
    packflag |= this.inherit_packflag;
    
    /*let ret = document.createElement("dropbox-x")
    ret.prop = new ui_base.EnumProperty(defaultval, enummap, path, name);
    
    if (iconmap !== undefined) {
      ret.prop.addIcons(iconmap)
    }//*/
    
    let has_path = path !== undefined;
    
    if (path !== undefined) {
      let prop = this.ctx.api.resolvePath(this.ctx, path).prop;
      
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
      
      frame.background = this.getDefault("BoxSubBG");

      if (packflag & PackFlags.USE_ICONS) {
        for (let key in prop.values) {
          let check = frame.check(path + " == " + prop.values[key], "", packflag);
          
          check.icon = prop.iconmap[key];
          check.drawCheck = false;

          check.style["padding"] = "0px";
          check.style["margin"] = "0px";
          frame.style["padding"] = "0px";
          frame.style["margin"] = "0px";
          if (packflag & PackFlags.VERTICAL) {
            frame.style["margin-top"] = "4px";
            frame.style["margin-bottom"] = "4px";
          } else {
            frame.style["margin-left"] = "4px";
            frame.style["margin-right"] = "4px";
          }

          check.dom.style["padding"] = "0px";
          check.dom.style["margin"] = "0px";
          
          check.description = prop.descriptions[key];
          //console.log(check.description, key, prop.keys[key], prop.descriptions, prop.keys);
        }
      } else {
        for (let key in prop.values) {
          let check = frame.check(path + " = " + prop.values[key], prop.ui_value_names[key]);

          check.description = prop.descriptions[prop.keys[key]];

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
  listenum(path, name, enummap, defaultval, callback, iconmap, packflag=0) {
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("dropbox-x")
    if (enummap !== undefined) {
      ret.prop = new ui_base.EnumProperty(defaultval, enummap, path, name);
    
      if (iconmap !== undefined) {
        ret.prop.addIcons(iconmap)
      }
    } else {
      let res = this.ctx.api.resolvePath(this.ctx, path);
      ret.prop = res.prop;

      name = name === undefined ? res.prop.uiname : name;
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
  
  curve(id, name, default_preset, packflag=0) {
    packflag |= this.inherit_packflag;
    
    //XXX don't forget to OR packflag into widget
    throw new Error("implement me!");
    
    var cw = new CurveWidget(this.storagePrefix + id);
    
    if (default_preset !== undefined)
      cw.load(default_preset);
    
    var l = this.dat.add({bleh : "name"}, "bleh");
    
    var parent = l.domElement.parentElement.parentElement.parentElement;
    
    parent["class"] = parent.style["class"] = "closed";
    
    cw.bind(parent, this);
    cw.draw();
    
    l.remove();
    
    this.curve_widgets.push(cw);
    
    return cw;
  }

  slider(path, name, defaultval, min, max, step, is_int, do_redraw, callback, packflag=0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("numslider-x")
    ret.packflag |= packflag;
    
    if (path) {
      ret.setAttribute("datapath", path);

      let rdef = this.ctx.api.resolvePath(this.ctx, path);
      if (rdef && rdef.prop) {
        let prop = rdef.prop;

        let range = prop.ui_range !== undefined ? prop.ui_range : prop.range;
        range = range === undefined ? [-10000, 10000] : range;

        if (min===undefined)
          min = range[0];
        if (max===undefined)
          max = range[1];
        if (is_int === undefined)
          is_int = prop.type === PropTypes.INT;
        if (name === undefined)
          name = prop.uiname;
        if (step === undefined)
          step = prop.step;
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
      ret.setAttribute("is_int", is_int);

    if (callback) {
      ret.onchange = callback;
    }
    
    this._add(ret);
    
    return ret;
  }
  
  panel(name, id, packflag=0) {
    id = id === undefined ? name : id;
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("panelframe-x");

    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    ret.setAttribute("title", name);
    ret.setAttribute("id", id);
    
    this._add(ret);
    
    ret.ctx = this.ctx;
    
    return ret;      
  }
  
  row(packflag=0) {
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("rowframe-x");
    
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    
    this._add(ret);
    
    ret.ctx = this.ctx;
    
    return ret;      
  }

  listbox(packflag=0) {
    packflag |= this.inherit_packflag;

    let ret = document.createElement("listbox-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    this._add(ret);
    return ret;
  }

  table(packflag=0) {
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("tableframe-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    
    this._add(ret);
    return ret;      
  }
  
  col(packflag=0) {
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("colframe-x");
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;
    
    this._add(ret);
    return ret;      
  }
  
  colorPicker(path, packflag=0, mass_set_path=undefined) {
    packflag |= this.inherit_packflag;
    
    let ret = document.createElement("colorpicker-x");
    
    ret.constructor.setDefault(ret);
    ret.packflag |= packflag;
    ret.inherit_packflag |= packflag;

    if (path !== undefined) {
      ret.setAttribute("datapath", path);
    }

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    //XXX
    window.colorpicker = ret;

    this._add(ret);
    return ret;
  }
  
  //
  tabs(position="top", packflag=0) {
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
    
    this.dom.style["display"] = "inline-block";
  }

  _add(child) {
    let li = super._add(child);
    li.style["display"] = "inline-block"
    return li;
  }
  
  update() {
    this.style["display"] = "inline-block";
    super.update();
  }
  
  static define() {return {
    tagname : "rowframe-x"
  };}
}
UIBase.register(RowFrame);

export class ColumnFrame extends Container {
  constructor() {
    super();
    
    //this.dom.style["display"] = "block";
  }
  
  update() {
    this.style["display"] = "inline-block";      
    super.update();
  }
  
  static define() {return {
    tagname : "colframe-x"
  };}
}
UIBase.register(ColumnFrame);

export class PanelFrame extends Container {
  constructor() {
    super();
    
    this._closed = false;
  }
  
  saveData() {
    let ret = {
      _closed : this._closed
    };
    
    return Object.assign(super.saveData(), ret);
  }
  
  loadData(obj) {
    this.closed = obj._closed;
  }
  
  init() {
    let con = this.frame = new Container();
    
    //con.style["margin-left"] = "5px";
    this.setCSS();

    let row = con.row();
    
    let iconcheck = document.createElement("iconcheck-x");
    this.iconcheck = iconcheck;

    this.style["width"] = "100%";

    iconcheck.overrideDefault("BoxBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxSubBG", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxDepressed", "rgba(0,0,0,0)");
    iconcheck.overrideDefault("BoxBorder", "rgba(0,0,0,0)");

    iconcheck.ctx = this.ctx;
    iconcheck._icon_pressed = ui_base.Icons.UI_EXPAND;
    iconcheck._icon = ui_base.Icons.UI_COLLAPSE;
    iconcheck.iconsheet = ui_base.IconSheets.SMALL;
    iconcheck.checked = this._closed;
    
    this.iconcheck.onclick = (e) => {
      this.closed = this.iconcheck.checked;
      console.log("icon click!", this.checked);
    };
    
    row._add(iconcheck);
    
    //stupid css, let's just hackishly put " " to create spacing2
    row.label(this.getAttribute("title"));
    
    row.background = con.background = this.getDefault("BoxSubBG");
    row.style["padding-right"] = "20px";
    row.style["padding-left"] = "5px";
    
    this.dom.remove();

    this.dom.style["padding-left"] = "10px";

    this.shadowRoot.appendChild(con);
    con.shadowRoot.appendChild(this.dom);
  }
  
  static define() {return {
    tagname : "panelframe-x"
  };}
  
  update() {
    super.update();
  }
  
  _updateClosed() {
    console.log(this._closed);
    if (this._closed) {
      this.dom.remove();
    } else {
      this.frame.shadow.appendChild(this.dom);
    }
    this.iconcheck.checked = this._closed;
  }
  
  get closed() {
    return this._closed;
  }
  
  set closed(val) {
    let update = !!val != !!this.closed;
    this._closed = val;
    
    console.log("closed set", update);
    if (update)
      this._updateClosed();
  }
}
UIBase.register(PanelFrame);
