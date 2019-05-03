var _toolprop = undefined; //for debugging use only!!!

define([
], function() {
  "use strict";
  
  let exports = _toolprop = {};
  
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

  let PropTypes = exports.PropTypes = {
    INT : 1,
    STRING : 2,
    BOOL : 4,
    ENUM : 8,
    FLAG : 16,
    //ITER : 32,
    VEC2 : 64,
    VEC3 : 128,
    VEC4 : 256,
    MATRIX4 : 512
  };
  
  let PropSubTypes = exports.PropSubTypes = {
    RGB : 0,
    RGBA : 1
  };
  
  let PropFlags = exports.PropFlags = {
    SELECT : 1,
    USE_ICONS : 2,
    USE_CUSTOM_SETTER : 4 //used by controller.js interface
  };
  
  let ToolProperty = exports.ToolProperty = class ToolProperty  {
    constructor(type, subtype, apiname, uiname, description, flag, icon) {
      this.data = undefined;
      
      this.type = type;
      this.subtype = subtype;
      
      this.apiname = apiname;
      this.uiname = uiname;
      this.description = description;
      this.flag = flag;
      this.icon = icon;
      
      this.callbacks = {};
    } 
    
    _fire(type, data) {
      if (this.callbacks[type] === undefined) {
        return;
      }
      
      for (let cb of this.callbacks[type]) {
        cb(data);
      }
      return this;
    }
    
    on(type, cb) {
      if (this.callbacks[type] === undefined) {
        this.callbacks[type] = [];
      }
      
      this.callbacks[type].push(cb);
      return this;
    }
    
    off(type, cb) {
      this.callbacks[type].remove(cb);
      return this;
    }
    
    toJSON() {
      return {
        type : this.type,
        subtype : this.subtype,
        apiname : this.apiname,
        uiname : this.uiname,
        description : this.description,
        flag : this.flag,
        icon : this.icon,
        data : this.data
      }
    }
    
    loadJSON(obj) {
      this.type = obj.type;
      this.subtype = obj.subtype;
      this.apiname = obj.apiname;
      this.uiname = obj.uiname;
      this.description = obj.description;
      this.flag = obj.flag;
      this.icon = obj.icon;
      this.data = obj.data;
      
      return this;
    }
    
    getValue() {
      return this.data;
    }  
    
    setValue(val) {
      if (this.constructor === ToolProperty) {
        throw new Error("implement me!");
      }
      
      this._fire("change", val);
    }
    
    copyTo(b) {
      b.apiname = this.apiname;
      b.uiname = this.uiname;
      b.description = this.description;
      b.flag = this.flag;
      b.icon = this.icon;
      b.subtype = this.subtype;
    }
    
    copy() { //default copy method
      let ret = new this.constructor();
      
      this.copyTo(ret);
      ret.data = this.data;
      
      return ret;
    }
    
    setStep(step) {
      this.step = step;
      return this;
    }
    
    setRange(min, max) {
      if (min === undefined || max === undefined) {
        throw new Error("min and/or max cannot be undefined");
      }
      
      this.range = [min, max];
      return this;
    }
    
    setIcon(icon) {
      this.icon = icon;
      
      return this;
    }
  }
  
  let NumProperty = exports.NumProperty = class NumProperty extends ToolProperty {
    constructor(type, value, apiname, 
                uiname, description, flag, icon) {
      super(type, undefined, apiname, uiname, description, flag, icon);
      
      this.data = 0;
      this.range = [0, 0];
    }
  };
  
  let IntProperty = exports.IntProperty = class IntProperty extends ToolProperty {
    constructor(value, apiname, 
                uiname, description, flag, icon)  
    {
      super(PropTypes.INT, undefined, apiname, uiname, description, flag, icon);
      
      this.data = value !== undefined ? Math.floor(value) : 0;
    }
    
    toJSON() {
      let ret = super.toJSON();
      ret.range = this.range;
      
      return ret;
    }
    
    loadJSON(obj) {
      super.loadJSON(obj);
      
      this.range = obj.range;
      return this;
    }
    
    setValue(val) {
      this.data = Math.floor(val);
      
      //fire events
      super.setValue(val);
      
      return this;
    }
    
    setStep(step) {
      super.setStep(Math.floor(step));
    }

    setRange(min, max) {
      if (min === undefined || max === undefined) {
        throw new Error("min and/or max cannot be undefined");
      }
      
      super.setRange(Math.floor(min), Math.floor(max));
      return this;
    }
  }
  
  let FloatProperty = exports.FloatProperty = class FloatProperty extends ToolProperty {
    constructor(value, apiname, 
                uiname, description, flag, icon)  
    {
      super(PropTypes.FLOAT, undefined, apiname, uiname, description, flag, icon);
      
      this.data = value !== undefined ? ~~value : 0;
    }
    
    toJSON() {
      let ret = super.toJSON();
      ret.range = this.range;
      
      return ret;
    }
    
    loadJSON(obj) {
      super.loadJSON(obj);
      
      this.range = obj.range;
      return this;
    }
    
    setValue(val) {
      this.data = val;
      
      //fire events
      super.setValue(val);
      
      return this;
    }
  }
  
  let EnumProperty = exports.EnumProperty = class EnumProperty extends ToolProperty {
    constructor(string, valid_values, apiname, 
                uiname, description, flag, icon) 
    {
      super(PropTypes.ENUM, undefined, apiname, uiname, description, flag, icon);
      
      this.values = {}
      this.keys = {};
      this.ui_value_names = {}
      
      if (valid_values === undefined) return;
      
      if (valid_values instanceof Array || valid_values instanceof String) {
        for (var i=0; i<valid_values.length; i++) {
          this.values[valid_values[i]] = valid_values[i];
          this.keys[valid_values[i]] = valid_values[i];
        }
      } else {
        for (var k in valid_values) {
          this.values[k] = valid_values[k];
          this.keys[valid_values[k]] = k;
        }
      }
      
      if (string === undefined) {
        this.data = first(valid_values);
      } else {
        this.setValue(string);
      }
      
      for (var k in this.values) {
        var uin = k[0].toUpperCase() + k.slice(1, k.length);
        
        uin = uin.replace(/\_/g, " ");
        this.ui_value_names[k] = uin;
      }
      
      this.iconmap = {};
    }
    
    addIcons(iconmap) {
      if (this.iconmap === undefined) {
        this.iconmap = {};
      }
      for (var k in iconmap) {
        this.iconmap[k] = iconmap[k];
      }
    }

    copyTo(dst) {
      p.keys = Object.create(this.keys);
      p.values = Object.create(this.values);
      p.data = this.data;
      p.ui_value_names = this.ui_value_names;
      p.update = this.update;
      p.api_update = this.api_update;
      
      for (var k in this.iconmap) {
        p.iconmap[k] = this.iconmap[k];
      }
      
      return p;
    }
    
    copy() {
      var p = new EnumProperty("dummy", {"dummy" : 0}, this.apiname, this.uiname, this.description, this.flag)
      
      p.keys = Object.create(this.keys);
      p.values = Object.create(this.values);
      p.data = this.data;
      p.ui_value_names = this.ui_value_names;
      p.update = this.update;
      p.api_update = this.api_update;
      
      for (var k in this.iconmap) {
        p.iconmap[k] = this.iconmap[k];
      }
      
      return p;
    }

    getValue() {
      if (this.data in this.values)
        return this.values[this.data];
      else
        return this.data;
    }

    setValue(val) {
      if (!(val in this.values) && (val in this.keys))
        val = this.keys[val];
      
      if (!(val in this.values)) {
        console.trace("Invalid value for enum!");
        console.log("Invalid value for enum!", val, this.values);
        return;
      }
      
      this.data = new String(val);
      
      //fire events
      super.setValue(val);
    }
  }

  return exports;
});
