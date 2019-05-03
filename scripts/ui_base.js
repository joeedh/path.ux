let _ui_base = undefined;

define([
  './util', './vectormath', './icon_enum', './toolprop', './controller'
], function(util, vectormath, icon_enum, toolprop) {
  'use strict';
  
  let exports = _ui_base = {};

  let EnumProperty = exports.EnumProperty = toolprop.EnumProperty;
  
  exports._defaults = {
    "ColorFieldSize" : 256,
    "numslider_width" : 100,
    "numslider_height" : 27,
    "TabStrokeStyle1" : "rgba(200, 200, 200, 1.0)",
    "TabStrokeStyle2" : "rgba(225, 225, 225, 1.0)",
    "TabInactive" : "rgba(150, 150, 150, 1.0)",
    "TabHighlight" : "rgba(50, 50, 50, 0.2)",
    
    "TabTextFont" : "sans-serif",
    "TabTextSize" : 18,
    "TabTextColor" : "rgba(35, 35, 35, 1.0)",
    
    "DefaultPanelBG" : "rgba(195, 195, 195, 1.0)",
    "InnerPanelBG" : "rgba(175, 175, 175, 1.0)",
    
    "BoxRadius" : 12,
    "BoxMargin" : 4,
    "BoxHighlight" : "rgba(155, 220, 255, 1.0)",
    "BoxDepressed" : "rgba(150, 150, 150, 1.0)",
    "BoxBG" : "rgba(220, 220, 220, 1.0)",
    "BoxBorder" : "rgba(255, 255, 255, 1.0)",
    "MenuBG" : "rgba(250, 250, 250, 1.0)",
    "MenuHighlight" : "rgba(155, 220, 255, 1.0)",
    
    //fonts
    "DefaultTextFont" : "sans-serif",
    "DefaultTextSize" : 14,
    "DefaultTextColor" : "rgba(35, 35, 35, 1.0)",
    
    "HotkeyTextSize"  : 14,
    "HotkeyTextColor" : "rgba(130, 130, 130, 1.0)",
    "HotkeyTextFont"  : "courier" 
  };
  
  exports.getDefault = function getDefault(key, val_if_fail) {
    if (key in exports._defaults) {
      return exports._defaults[key]
    } else {
      exports._defaults[key] = val_if_fail;
      return val_if_fail;
    }
  }
  
  //XXX remember to set this properly
  exports.IsMobile = () => {
    return false;
  };
  
  class _IconManager {
    constructor(image, tilesize, number_of_horizontal_tiles) {
      this.tilex = number_of_horizontal_tiles;
      this.tilesize = tilesize;
      
      this.image = image;
    }
    
    //icon is an integer
    getCSS(icon) {
      if (icon == -1) { //-1 means no icon
        return '';
      }
      
      let dpi = exports.UIBase.getDPI();
      
      let x = (-(icon % this.tilex) * this.tilesize);
      let y = (-(~~(icon / this.tilex)) * this.tilesize);
      
      return `url("${this.image.src}") ${x}px ${y}px`;
    }
  }
  
  let IconManager = exports.IconManager = class IconManager {
    constructor(images, sizes, horizontal_tiles) {
      this.iconsheets = [];
      this.tilex = horizontal_tiles;
      
      for (let i=0; i<images.length; i++) {
        this.iconsheets.push(new _IconManager(images[i], sizes[i], horizontal_tiles));
      }
    }
    
    getTileSize(sheet=0) {
      return this.iconsheets[sheet].tilesize;
    }
    
    //icon is an integer
    getCSS(icon, sheet=0) {
      return this.iconsheets[sheet].getCSS(icon);
    }
  }
  
  let iconmanager = exports.iconmanager = new IconManager([
    document.getElementById("iconsheet"),
    document.getElementById("iconsheet16"),    
  ], [32, 16], 16);
  
  let IconSheets = exports.IconSheets = {
    SHEET32 : 0,
    SHEET16 : 1
  };
  
  let makeIconDiv = exports.makeIconDiv = function makeIconDiv(icon, sheet=0) {
      let size = iconmanager.getTileSize(sheet);
      
      let icontest = document.createElement("div");
      
      icontest.style["width"] = icontest.style["min-width"] = size + "px";
      icontest.style["height"] = icontest.style["min-height"] = size + "px";
      
      icontest.style["background-color"] = "orange";
      
      icontest.style["margin"] = "0px";
      icontest.style["padding"] = "0px";
      
      icontest.style["background"] = iconmanager.getCSS(icon, sheet);
      
      return icontest;
  }
  
  let Vector2 = vectormath.Vector2;
  let Matrix4 = vectormath.Matrix4;

  let PackFlags = exports.PackFlags = {
    INHERIT_WIDTH  : 1,
    INHERIT_HEIGHT : 2
  };
   
  let first = (iter) => {
    if (iter === undefined) {
      return undefined;
    }
    
    if (!(Symbol.iterator in iter)) {
      for (let item in iter) {
        return item;
      }
      
      return undefined;
    }
    
    for (let item of iter) {
      return item;
    }
  }
  
  
  exports.DataPathError = class DataPathError extends Error {};
  
  exports.SimpleContext = class SimpleContext {
    constructor(stateobj) {
      this.state = stateobj;
    }
    
    getProp(path) {
      let cs = path.trim().split(".")
      let obj = this.state;
      let last;
      
      for (let i=0; i<cs.length; i++) {
        last = obj;
        obj = obj[cs[i]];
        
        if (obj === undefined) {
          throw new exports.DataPathError("bad path " + path);
        }
      }
      
      return [obj, last, cs[cs.length - 1]];
    }
    
    setProp(path, val) {
      let prop = this.getProp(path);
      
      prop[1][prop[2]] = val;
    }
  }
  
  exports._styles = {};
  exports.getWidgetStyle = function getWidgetStyle(key, val_if_fail) {
    if (key in exports._styles) {
      return exports._styles[key]
    } else {
      exports._styles[key] = val_if_fail;
      return val_if_fail;
    }
  }
  
  exports._idgen = 0;
  
  let UIBase = exports.UIBase = class UIBase extends HTMLElement {
    constructor() {
      super();
      
      let tagname = this.constructor.define().tagname;
      
      this._id = tagname.replace(/\-/g, "_") + (exports._idgen++);
      
      //getting css to flow down properly can be a pain, so 
      //some packing settings are set as bitflags here,
      //see PackFlags
      
      /*
      setInterval(() => {
        this.update();
      }, 200);
      //*/
      
      this.packflag = 0;
      this.shadow = this.attachShadow({mode : 'open'});
      this._ctx = undefined;
      
      let style = document.createElement("style");
      style.textContent = `
      .DefaultText {
        font: `+exports._getFont()+`;
      }
      `;
      this.shadow.appendChild(style);
    }
    
    static setDefault(element) {
      return element;
    }
    
    destory() {
    }
    
    on_resize(newsize) {
    }
    
    get ctx() {
      return this._ctx;
    }
    
    //not sure I'm happy about this. . .
    //it adds a method call to the event queue,
    //but only if that method (for this instance, as differentiated
    //by ._id) isn't there already.
    
    doOnce(func) {
      if (func._doOnce === undefined) {
        func._doOnce_reqs = new Set();
        
        func._doOnce = (thisvar) => {
          if (func._doOnce_reqs.has(thisvar._id)) {
            return;
          }
          
          func._doOnce_reqs.add(thisvar._id);
          
          window.setTimeout(() => {
            func._doOnce_reqs.delete(thisvar._id);
            
            func.call(thisvar);
          });
        }
      }
      
      func._doOnce(this);
    }
  
    
    set ctx(c) {
      this._ctx = c;
      
      let rec = (n) => { 
        if (n instanceof UIBase) {
          n.ctx = c;
        }
        for (let child of n.childNodes) {
          rec(child);
        }
      }
      
      this.update();
    }
    
    float(x=0, y=0, zindex=undefined) {
      this.style.position = "absolute";
      
      this.style.left = x + "px";
      this.style.top = y + "px";
      
      if (zindex !== undefined) {
        this.style["z-index"] = zindex
      }
      
      return this;
    }

    //called regularly
    update() {
    }
    
    //scaling ratio for high-resolution displays
    static getDPI() {
      let dpi = window.devicePixelRatio;
      
      let f = Math.fract(dpi);
      let steps = 6
      f = (Math.ceil(f*steps))/steps;
      
      //f = Math.ceil(Math.log(dpi) / Math.log(2));
      //f = Math.pow(2, f);
      
      return (Math.floor(dpi) + f)*1.33333333;
      
      //try to snap to a reasonable value
      
      return dpi;
    }
    
    /*for saving ui state.
      note that these methods should
      fail gracefully.*/
    saveData() {
      return undefined;
    }
    
    loadData(obj) {
      return this;
    }
    
    //parent_cls is a string, tagname of element to extend
    static register(cls) {
      //if (parent_cls !== undefined) {
      // customElements.define(cls.define().tagname, cls, {extends : "div"});
      //} else {
        customElements.define(cls.define().tagname, cls);
      //}
    }
    
    /* example:
    static define() {return {
      tagname : "my-tag-name-with-at-least-one-dash"
    };}
    */
    static define() {
      throw new Error("Missing define() for ux element");
    }
  }
  
  //okay, I need to refactor this function, 
  //it needs to take x, y as well as width, height,
  //and be usable for more use cases.
  exports.drawRoundBox = function drawRoundBox(canvas, g, width, height, r=undefined, op="fill", color=undefined) {
      width = width === undefined ? canvas.width : width;
      height = height === undefined ? canvas.height : height;
      
      let dpi = UIBase.getDPI();
      
      r = r === undefined ? exports.getDefault("BoxRadius", 12) : r;
      let pad = exports.getDefault("BoxMargin", 4) * dpi;
      
      r *= dpi;
      let r1=r, r2=r;
      
      if (r > (height - pad*2)*0.5) {
        r1 = (height - pad*2)*0.5;
      }
      
      if (r > (width - pad*2)*0.5) {
        r2 = (width - pad*2)*0.5;
      }
      
      let bg = color;
      
      if (bg === undefined && canvas._background !== undefined) {
        bg = canvas._background;
      } else if (bg === undefined) {
        bg = exports.getDefault("BoxBG", "rgba(220, 220, 220, 1.0)");
      }
      
      if (op == "fill") {
        g.clearRect(0, 0, width, height);
      }
      
      g.fillStyle = bg;
      //hackish!
      g.strokeStyle = color === undefined ? exports.getDefault("BoxBorder", "rgba(255, 255, 255, 1.0)") : color;
      
      let w = width, h = height;
      
      let th = Math.PI/4;
      let th2 = Math.PI*0.75;
      
      g.beginPath();

      g.moveTo(pad, pad+r1);
      g.lineTo(pad, h-r1-pad);

      g.quadraticCurveTo(pad, h-pad, pad+r2, h-pad);
      g.lineTo(w-pad-r2, h-pad);
      
      g.quadraticCurveTo(w-pad, h-pad, w-pad, h-pad-r1);
      g.lineTo(w-pad, pad+r1);
      
      g.quadraticCurveTo(w-pad, pad, w-pad-r2, pad);
      g.lineTo(pad+r2, pad);

      g.quadraticCurveTo(pad, pad, pad, pad+r1);
      g.closePath();
      
      if (op == "fill") {
        g.fill();
        g.stroke();
      } else {
        g.stroke();
      }
  };
  
  exports._getFont = function _getFont(size, font="DefaultText") {
    let dpi = UIBase.getDPI();
    
    if (size !== undefined) {
      return ""+(size * dpi) + "px " + exports.getDefault(font+"Font");
    } else {
      let size = exports.getDefault(font+"Size", 14);
      
      return ""+size+ "px " + exports.getDefault(font+"Font");
    }
  }
  
  exports._ensureFont = function _ensureFont(canvas, g, size) {
    let dpi = UIBase.getDPI();
    
    if (size !== undefined) {
      g.font = ""+Math.ceil(size * dpi) + "px sans-serif";
    } else if (!canvas.font) {
      let size = exports.getDefault("DefaultTextSize", 14) * dpi;
      
      let add = "0"; //Math.ceil(Math.fract((0.5 / dpi))*100);
      
      //size += 4;
      g.font = ""+Math.floor(size) + "." + add + "px sans-serif";
    } else {
      g.font = canvas.font;
    }
  }
  
  exports.measureText = function measureText(text, canvas, g, size=undefined) {
    exports._ensureFont(canvas, g, size);
    
    let ret = g.measureText(text);
    
    if (size !== undefined) {
      //clear custom font for next time
      g.font = undefined;
    }
    
    return ret;
  }
  
  exports.drawText = function drawText(x, y, text, canvas, g, color=undefined, size=undefined) {
    exports._ensureFont(canvas, g, size);
    
    g.fillStyle = exports.getDefault("DefaultTextColor", "rgba(35, 35, 35, 1.0)");
    g.fillText(text, x+0.5, y+0.5);
    
    if (size !== undefined) {
      //clear custom font for next time
      g.font = undefined;
    }
  }
  
  let PIDX=0, PSHADOW=1, PTOT=2;
  
  exports.saveUIData = function(node, key) {
    if (key === undefined) {
      throw new Error("ui_base.saveUIData(): key cannot be undefined");
    }
    
    let paths = [];
    
    let rec = (n, path, ni, is_shadow) => {
      path = path.slice(0, path.length); //copy path
      
      let pi = path.length;
      for (let i=0; i<PTOT; i++) {
        path.push(undefined);
      }
      
      path[pi] = ni;
      path[pi+1] = is_shadow;
      
      if (n instanceof UIBase) {
        let path2 = path.slice(0, path.length);
        path2.push(n.saveData());
        
        if (path2[pi+2]) {
          paths.push(path2);
        }
      }
      
      for (let i=0; i<n.childNodes.length; i++) {
        let n2 = n.childNodes[i];
        
        rec(n2, path, i, false);
      }
      
      let shadow = n.shadow;
      
      if (!shadow)
        return;
      
      for (let i=0; i<shadow.childNodes.length; i++) {
        let n2 = shadow.childNodes[i];
        
        rec(n2, path, i, true);
      }
    }
    
    rec(node, [], 0, false);
    
    return JSON.stringify({
      key : key,
      paths : paths,
      _ui_version : 1
    });
  }
  
  exports.loadUIData = function(node, buf) {
    let obj = JSON.parse(buf);
    let key = buf.key;
    
    for (let path of obj.paths) {
      let n = node;
      
      let data = path[path.length-1];
      path = path.slice(2, path.length-1); //in case some api doesn't want me calling .pop()
      
      for (let pi=0; pi<path.length; pi += PTOT) {
        let ni = path[pi], shadow = path[pi+1];
        
        let list;
        
        if (shadow) {
          list = n.shadow;
          
          if (list) {
            list = list.childNodes;
          }
        } else {
          list = n.childNodes;
        }
        
        if (list === undefined || list[ni] === undefined) {
          console.log("failed to load a ui data block", path, data, list);
          n = undefined;
          break;
        }
        
        n = list[ni];
      }
      
      if (n !== undefined) {
        n.loadData(data);
        
        console.log(n, path, data);
      }
    }
  }
  
  return exports;
});
