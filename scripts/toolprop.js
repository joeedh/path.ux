import * as util from './util.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from './vectormath.js';

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

export let PropTypes = {
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

//set PropTypes to custom type integers
export function setPropTypes(types) {
  for (let k in types) {
    PropTypes[k] = types[k];
  }
}

export const PropSubTypes = {
  COLOR : 1
};

export const PropFlags = {
  SELECT            : 1,
  USE_ICONS         : 64,
  USE_CUSTOM_GETSET : 128, //used by controller.js interface
  SAVE_LAST_VALUE   : 256
};

export let customPropertyTypes = [];

export class ToolProperty {
  constructor(type, subtype, apiname, uiname, description, flag, icon) {
    this.data = undefined;

    if (type === undefined) {
      type = this.constructor.PROP_TYPE_ID;
    }

    this.type = type;
    this.subtype = subtype;
    
    this.apiname = apiname;
    this.uiname = uiname;
    this.description = description;
    this.flag = flag;
    this.icon = icon;
    
    this.callbacks = {};
  } 

  static register(cls) {
    cls.PROP_TYPE_ID = util.strhash(cls.name);
    PropTypes[cls.name] = cls.PROP_TYPE_ID;

    customPropertyTypes.push(cls);
  }

  _fire(type, arg1, arg2) {
    if (this.callbacks[type] === undefined) {
      return;
    }
    
    for (let cb of this.callbacks[type]) {
      cb.call(this, arg1, arg2);
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

export class StringProperty extends ToolProperty {
  constructor(value, apiname, uiname, description, flag, icon) {
    super(PropTypes.STRING, undefined, apiname, uiname, description, flag, icon);
  }
  
  copyTo(b) {
    super.copyTo(b);
    b.value = this.value;
    
    return this;
  }
  
  copy() {
    let ret = new StringProperty();
    this.copyTo(ret);
    return ret;
  }
  
  setValue(val) {
    //fire events
    super.setValue(val);
    
    this.data = val;
  }
}  
  
let num_res =[
  /([0-9]+)/,
  /((0x)?[0-9a-fA-F]+(h?))/,
  /([0-9]+\.[0-9]*)/,
  /([0-9]*\.[0-9]+)/
];
//num_re = /([0-9]+\.[0-9]*)|([0-9]*\.[0-9]+)/

export function isNumber(f) {
  if (f == "NaN" || (typeof f == "number" && isNaN(f))) {
    return false;
  }
  
  f = (""+f).trim();
  
  let ok = false;
  
  for (let re of num_res) {
    let ret = f.match(re)
    if (!ret) {
      ok = false;
      continue;
    }
    
    ok = ret[0].length == f.length;
    if (ok) {
      break;
    }
  }
  
  return ok;
}

window.isNumber = isNumber;

export class NumProperty extends ToolProperty {
  constructor(type, value, apiname, 
              uiname, description, flag, icon) {
    super(type, undefined, apiname, uiname, description, flag, icon);
    
    this.data = 0;
    this.range = [0, 0];
  }
};

export class IntProperty extends ToolProperty {
  constructor(value, apiname, 
              uiname, description, flag, icon)  
  {
    super(PropTypes.INT, undefined, apiname, uiname, description, flag, icon);
    
    this.radix = 10;
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
  
  setRadix(radix) {
    this.radix = radix;
  }
}

export class BoolProperty extends ToolProperty {
  constructor(value, apiname,
              uiname, description, flag, icon)
  {
    super(PropTypes.BOOL, undefined, apiname, uiname, description, flag, icon);

    this.data = !!value;
  }

  toJSON() {
    let ret = super.toJSON();

    return ret;
  }

  loadJSON(obj) {
    super.loadJSON(obj);

    return this;
  }
}

export class FloatProperty extends ToolProperty {
  constructor(value, apiname, 
              uiname, description, flag, icon)  
  {
    super(PropTypes.FLOAT, undefined, apiname, uiname, description, flag, icon);
    
    this.data = value !== undefined ? ~~value : 0;
    this.decimalPlaces = 4;
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
  
  setDecimalPlaces(n) {
    this.decimalPlaces = n;
    return this;
  }
  
  setValue(val) {
    this.data = val;
    
    //fire events
    super.setValue(val);
    
    return this;
  }
}

export class EnumProperty extends ToolProperty {
  constructor(string, valid_values, apiname, 
              uiname, description, flag, icon) 
  {
    super(PropTypes.ENUM, undefined, apiname, uiname, description, flag, icon);
    
    this.values = {};
    this.keys = {};
    this.ui_value_names = {};
    this.descriptions = {};

    if (valid_values === undefined) return this;
    
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
      this.descriptions = uin;
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

  copyTo(p) {
    p.keys = Object.assign({}, this.keys);
    p.values = Object.assign({}, this.values);
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

    this.copyTo(p);
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

export class FlagProperty extends EnumProperty {
  constructor() {
    super();
  }

  setValue(bitmask) {
    this.data = bitmask;

    //do not trigger EnumProperty's setValue
    ToolProperty.prototype.setValue.call(this, bitmask);
  }

  copy() {
    let ret = new FlagProperty();
    this.copyTo(ret);
    
    return ret;
  }
}

export class Vec3Property extends ToolProperty {
  constructor(data) {
    super(PropTypes.VEC3);
    this.data = new Vector3(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data.load(this.data);
  }

  copy() {
    let ret = new Vec3Property();
    this.copyTo(ret);
    return ret;
  }
}

export class Mat4Property extends ToolProperty {
  constructor(data) {
    super(PropTypes.MATRIX4);
    this.data = new Matrix4(data);
  }

  setValue(v) {
    this.data.load(v);
    super.setValue(v);
  }

  getValue() {
    return this.data;
  }

  copyTo(b) {
    super.copyTo(b);
    b.data.load(this.data);
  }

  copy() {
    let ret = new Mat4Property();
    this.copyTo(ret);
    return ret;
  }
}

