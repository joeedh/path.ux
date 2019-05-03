//bind module to global var to get at it in console.
//
//note that require has an api for handling circular 
//module refs, in such cases do not use these vars.

var _ui = undefined;

define([
  './util', './vectormath', "./ui_curvewidget", "./ui_base", "./ui_widgets", './toolprop'
], function(util, vectormath, ui_curvewidget, ui_base, ui_widgets, toolprop) {
  'use strict';
  
  let EnumProperty = toolprop.EnumProperty;
    
  let exports = _ui = {};
  let Vector2 = vectormath.Vector2,
      UIBase = ui_base.UIBase,
      PackFlags = ui_base.PackFlags;
  
  exports.SimpleContext = ui_base.SimpleContext;
  exports.DataPathError = ui_base.DataPathError;
  
  var list = function list(iter) {
    let ret = [];
    
    for (let item of iter) {
      ret.push(item);
    }
    
    return ret;
  }
  
  var save_setting = exports.save_setting = function save_setting(key, val) {
    var settings = localStorage.startup_file_bn6;
    
    if (settings == undefined) {
        settings = {};
    } else {
      try {
        settings = JSON.parse(settings);
      } catch (error) {
        console.log("Warning, failed to parse cached settings");
        settings = {};
      }
    }
    
    settings[key] = val;
    localStorage.startup_file_bn6 = JSON.stringify(settings);
  }
  
  var load_setting = exports.load_setting = function load_setting(key) {
    var settings = localStorage.startup_file_bn6;
    
    if (settings == undefined) {
        settings = {};
    } else {
      try {
        settings = JSON.parse(settings);
      } catch (error) {
        console.log("Warning, failed to parse cached settings");
        settings = {};
      }
    }
    
    return settings[key];
  }
  
  class ObjectPath extends Array {
      constructor(path) {
          super();
          
          path = path.split(".");
          
          for (var key of path) {
              this.push(key);
          }
      }
  }
  
  var Label = exports.Label = class Label extends ui_base.UIBase {
    constructor() {
      super();
      
      this.dom = document.createElement("div");
      this.shadow.appendChild(this.dom);
    }
    
    get text() {
      return this.dom.innerText;
    }
    
    set text(text) {
      this.dom.innerText = text;
    }
    
    static define() {return {
      tagname : "label-x"
    };}    
  }
  ui_base.UIBase.register(Label);
  
  var Container = exports.Container = class Container extends ui_base.UIBase {
    constructor() {
        super();
        
        this.inherit_packflag = 0;
        
        let ul = document.createElement("ul")
        ul.style["margin"] = "0";
        ul.style["padding"] = "0";
        
        this.dom = document.createElement("div")
        
        this.dom.appendChild(ul);
        ul.style["list-style-type"] = "none";
        
        let style = this.styletag = document.createElement("style")
        this.dom.setAttribute("class", "containerx");
        
        style.textContent = `div.containerx {
          background-color : ${ui_base.getDefault("DefaultPanelBG")};
        }
        `
        
        this.shadow.appendChild(style);
        this.shadow.appendChild(this.dom);
        
        this.dom = ul;
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
        panels : {},
        opened : !this.closed
      };
      
      for (let c of this.controls) {
        if (!(c instanceof UI))
          continue;
        
        ret.panels[c.name] = c.toJSON();
      }
      
      return ret;
    }
    
    loadJSON(obj) {
      console.error("ui.js:Container.loadJSON: implement me!");
      
      return this;
    }
    
    redrawCurves() {
      throw new Error("Implement me (properly!)");
      
      if (this.closed)
        return;
      
      for (let cw of this.curve_widgets) {
        cw.draw();
      }
      
      for (let control of this.controls) {
        if (control instanceof UI) {
          control.redrawCurves();
        }
      }
    }
    
    listen() {
      window.setInterval(() => {
        this.update();
      }, 150);
    }
    
    get children() {
      let list = [];
      
      function indexOf(nodelist, item) {
        let i = 0;
        for (let child of nodelist) {
          if (child == item) {
            return i;
          }
          i++;
        }
        
        return -1;
        //return Array.prototype.indexOf.call(nodelist, item);
      }

      function rec(n) {
        if (n instanceof ui_base.UIBase) {
          list.push(n);
        } else {
          for (let n2 of n.childNodes) {
            rec(n2);
          }
        }
      }
      
      for (let child of this.shadow.childNodes) {
        rec(child);
      }
      for (let child of this.dom.childNodes) {
        rec(child);
      }
      for (let child of this.childNodes) {
        rec(child);
      }
      
      return list;
    }
    
    update() {
      function indexOf(nodelist, item) {
        let i = 0;
        for (let child of nodelist) {
          if (child == item) {
            return i;
          }
          i++;
        }
        
        return -1;
        //return Array.prototype.indexOf.call(nodelist, item);
      }
      
      let i = 0;
      for (let child of this.shadow.childNodes) {
        if (child !== this.dom && child instanceof ui_base.UIBase) {
          child.remove();
          this.dom.appendChild(child);
        }
        
        i++;
      }

      function rec(n) {
        if (n instanceof ui_base.UIBase) {
          n.update();
        } else {
          for (let n2 of n.childNodes) {
            rec(n2);
          }
        }
      }
      
      for (let child of this.shadow.childNodes) {
        rec(child);
      }
      for (let child of this.dom.childNodes) {
        rec(child);
      }
      for (let child of this.childNodes) {
        rec(child);
      }
      
      /*
      for (let child of this.dom.childNodes) {
        if (child.tagName == "LI" && child.childNodes.length > 0) {
          child = child.childNodes[0];
        }
        
        if (child instanceof ui_base.UIBase) {
          child.update();
        }
      }//*/
    }
    
    //on_destroy() {
    //  super.on_destroy();
      //this.dat.destroy();
    //}
    
    appendChild(child) {
      if (child instanceof ui_base.UIBase) {
        child.ctx = this.ctx;
      }
      
      return super.appendChild(child);
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
    
    _add(child) {
      if (child instanceof NodeList) {
        throw new Error("eek!");
      }
      
      child.parentWidget = this;
      child.ctx = this.ctx;
      
      let li = document.createElement("li");
      li.style["list-style-type"] = "none";
      li.appendChild(child);
      
      this.dom.appendChild(li);
      
      return li;
    }
    
    textbox(text, cb, packflag=0) {
      packflag |= this.inherit_packflag;
      
      let ret = document.createElement("textbox-x")
    
      ret.packflag |= packflag;
      ret.onchange = cb;
      ret.text = text;
      
      this._add(ret);
      return ret;
    }
    
    label(text) {
      let ret = document.createElement("label-x");
      ret.text = text;

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
        
    check(path, name, packflag=0) {
      packflag |= this.inherit_packflag;
      
      //let prop = this.ctx.getProp(path);
      let ret;
      if (packflag & PackFlags.USE_ICONS) {
        ret = document.createElement("iconcheck-x");
      } else {
        ret = document.createElement("check-x");
      }
      
      ret.packflag |= packflag;
      ret.label = name;
      ret.setAttribute("datapath", path);
      
      this._add(ret);
      
      ret.update();
      
      return ret;
    }
  
    checkenum(path, name, packflag, enummap, defaultval, callback, iconmap) {
      packflag = packflag === undefined ? 0 : packflag;
      packflag |= this.inherit_packflag;
      
      let ret = document.createElement("dropbox-x")
      ret.prop = new ui_base.EnumProperty(defaultval, enummap, path, name);
      
      if (iconmap !== undefined) {
        ret.prop.addIcons(iconmap)
      }
      
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
        
        frame.background = ui_base.getDefault("BoxSubBG");
        
        if (packflag & PackFlags.USE_ICONS) {
          for (let key in prop.values) {
            let check = frame.check(path + " = " + prop.values[key], "", packflag);
            
            check.icon = prop.iconmap[key];
            
            check.style["padding"] = "0px";
            check.style["margin"] = "0px";
            frame.style["padding"] = "0px";
            frame.style["margin"] = "0px";
            check.dom.style["padding"] = "0px";
            check.dom.style["margin"] = "0px";
            
            check.description = prop.ui_value_names[key];
            
            console.log("PATH", path);
          }          
        } else {
          for (let key in prop.values) {
            frame.check(path + " = " + prop.values[key], prop.ui_value_names[key]);
            console.log("PATH", path);
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
    
    on_tick() {
      if (this.dat == undefined) {
        console.log("warning, dead ui panel");
        return;
      }
      
      if (this.dat.closed != this._last_closed) {
        this._last_closed = this.dat.closed;
        
        this.getroot().saveVisibility();
      }
      
      for (var i=0; i<this.controls.length; i++) {
        if (!(this.controls[i] instanceof UI)) {
          continue;
        }
        
        this.controls[i].on_tick();
      }
      
      //update visibility of curve widgets
      var closed = this.dat.closed;
      for (var i=0; i<this.curve_widgets.length; i++) {
        var cvw = this.curve_widgets[i];
        
        cvw.closed = closed;
      }
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
      }
      
      ret.setAttribute("name", name);
      ret.setAttribute("min", min);
      ret.setAttribute("max", max);
      
      if (callback) {
        ret.onchange = callback;
      }
      
      this._add(ret);
      
      return ret;
    }
    
    _add_control(control) {
      let remove = control.remove;
      let this2 = this;
      
      control.remove = function() {
        if (this2.controls.indexOf(control) >= 0) {
          this2.controls.remove(control);
        }
        
        remove.apply(control, arguments);
      }
      
      this.controls.push(control);
      return control;
    }
    
    row(packflag=0) {
      packflag |= this.inherit_packflag;
      
      let ret = document.createElement("rowframe-x");
      ret.packflag |= packflag;
      
      this._add(ret);
      return ret;      
    }
    
    table(packflag=0) {
      packflag |= this.inherit_packflag;
      
      let ret = document.createElement("tableframe-x");
      ret.packflag |= packflag;
      
      this._add(ret);
      return ret;      
    }
    
    col(packflag=0) {
      packflag |= this.inherit_packflag;
      
      let ret = document.createElement("colframe-x");
      ret.packflag |= packflag;
      
      this._add(ret);
      return ret;      
    }
    
    colorPicker(packflag=0) {
      packflag |= this.inherit_packflag;
      
      let ret = document.createElement("colorpicker-x");
      
      ret.constructor.setDefault(ret);
      ret.packflag |= packflag;
      
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
      
      this._add(ret);
      return ret;
    }
  };

  ui_base.UIBase.register(Container, "div");
  
  
  let RowFrame = exports.RowFrame = class RowFrame extends Container {
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
  
  let ColumnFrame = exports.ColumnFrame = class ColumnFrame extends Container {
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
  
  let TableRow = exports.TableRow = class TableRow extends Container {
    constructor() {
      super();
      
      this.dom.remove();
      this.dom = document.createElement("tr");
      
      //kind of dumb, but this.dom doesn't live within this element itself, bleh
      //this.shadow.appendChild(this.dom);
      this.dom.setAttribute("class", "containerx");
    }
    
    static define() {return {
      tagname : "tablerow-x"
    };}
    
    _add(child) {
      child.ctx = this.ctx;
      
      let td = document.createElement("td");
      td.appendChild(child);
      
      this.dom.appendChild(td);
    }
  };
  UIBase.register(TableRow);
  
  let TableFrame = exports.TableFrame = class TableFrame extends Container {
    constructor() {
      super();
      
      this.dom.remove();
      this.dom = document.createElement("table");
      this.shadow.appendChild(this.dom);
      this.dom.setAttribute("class", "containerx");
      
      //this.dom.style["display"] = "block";
    }
    
    update() {
      this.style["display"] = "inline-block";      
      super.update();
    }
    
    _add(child) {
      child.ctx = this.ctx;
      this.dom.appendChild(child);
    }
    
    row() {
      let tr = document.createElement("tr");
      let cls = "table-tr";
      
      tr.setAttribute("class", cls);
      this.dom.appendChild(tr);
      
      function maketd() {
        let td = document.createElement("td");
        tr.appendChild(td);
        
        let container = document.createElement("rowframe-x");
          
        container.setAttribute("class", cls);
        container.dom.setAttribute("class", cls);
        td.setAttribute("class", cls);
        
        //let div2 = document.createElement("div");
        //div2.setAttribute("class", cls);
        //div2.innerHTML = "sdfsdf";
        
        //td.appendChild(div2);
        td.appendChild(container);
        
        return container;
      }
      
      //hrm wish I could subclass html elements easier
      let ret = {
        _tr : tr,
        
        focus(args) {
          tr.focus(args);
        },
        
        blur(args) {
          tr.blur(args);
        },
        
        remove : () => {
          tr.remove();
        },
        
        addEventListener(type, cb, arg) {
          tr.addEventListener(type, cb, arg);
        },
        
        removeEventListener(type, cb, arg) {
          tr.removeEventListener(type, cb, arg);
        },
        
        setAttribute(attr, val) {
          if (attr == "class") {
            cls = val;
          }
          
          tr.setAttribute(attr, val);
        }
      };

      function makefunc(f) {
        ret[f] = function() {
          let container = maketd();
          
          container.background = tr.style["background-color"]; //"rgba(0,0,0,0)";
          return container[f].apply(container, arguments);
        }
      }
      
      let _bg = "";
      
      //need to implement proper proxy here!
      Object.defineProperty(ret, "tabIndex", {
        set : function(f) {
          tr.tabIndex = f;
        },
        
        get : function(f) {
          return tr.tabIndex;
        }
      });
      
      Object.defineProperty(ret, "background", {
        set(bg) {
          _bg = bg;
          tr.style["background-color"] = bg;
          
          for (let node of tr.childNodes) {
            if (node.childNodes.length > 0) {
              node.childNodes[0].background = bg;
              node.style["background-color"] = bg;
            }
          }
        }, get() {
          return _bg;
        }
      });
      
      /*
      Object.defineProperty(ret, "class", {
        set(bg) {
          tr.class = bg;
        }
      });//*/
      
      makefunc("label");
      makefunc("button");
      makefunc("textbox");
      makefunc("col");
      makefunc("row");
      makefunc("table");
      makefunc("listenum");
      makefunc("check");
      
      return ret;
    }
    
    update() {
      super.update();
    }
    
    clear() {
      super.clear();
      for (let child of list(this.dom.childNodes)) {
        child.remove();
      }
    }
    
    static define() {return {
      tagname : "tableframe-x"
    };}
  }
  UIBase.register(TableFrame);
  
  return exports;
});
