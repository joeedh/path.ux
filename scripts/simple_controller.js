import * as toolprop from './toolprop.js';

let PropFlags = toolprop.PropFlags,
    PropTypes = toolprop.PropTypes;

import {ModelInterface, ToolOpIface,
        DataFlags,DataPathError} from './controller.js';
import {initToolPaths, parseToolPath} from './toolpath.js';

export let tool_classes = {};
let tool_idgen = 1;
Symbol.ToolID = Symbol("toolid");

function toolkey(cls) {
  if (!(Symbol.ToolID in cls)) {
    cls[Symbol.ToolID] = tool_idgen++;
  }
  
  return cls[Symbol.ToolID];
}

export const DataTypes = {
  STRUCT : 0,
  PROP : 1
}

export class DataPath {
  constructor(path, apiname, prop, type=DataTypes.PROP) {
    this.type = type;
    this.data = prop;
    this.apiname = apiname;
    this.path = path;
    this.struct = undefined;
  }
  
  read_only() {
    this.flag |= DataFlags.READ_ONLY;
    return this;      
  }
  
  //get/set will be called 
  //like other callbacks,
  //e.g. the real object owning the property
  //will be stored in this.dataref
  customGetSet(get, set) {
    this.data.flag |= PropFlags.USE_CUSTOM_GETSET;
    
    this.data._getValue = this.data.getValue;
    this.data._setValue = this.data.setValue;
    
    if (get)
      this.data.getValue = get;
    
    if (set)
      this.data.setValue = set;
    
    return this;
  }
  
  //db will be executed with underlying data object
  //that contains this path in 'this.dataref'
  on(type, cb) {
    if (this.type == DataTypes.PROP) {
      this.data.on(type, cb);
    } else {
      throw new Error("invalid call to DataPath.on");
    }
    
    return this;
  }
  
  off(type, cb) {
    if (this.type == DataTypes.PROP) {
      this.data.off(type, cb);
    }
  }
  
  range(min, max) {
    this.data.setRange(min, max);
    return this;
  }
  
  decimalPlaces(n) {
    this.data.setDecimalPlaces(n);
    return this;
  }
  
  radix(r) {
    this.data.setRadix(r);
    return this;
  }
  
  step(s) {
    this.data.setStep(s);
    return this;
  }
  
  icon(i) {
    this.data.setIcon(i);
    return this;
  }
  
  icons(icons) { //for enum/flag properties
    this.data.addIcons(icons);
    return this;
  }
  
  description(d) {
    this.data.description = d;
    return this;
  }
}

export class DataStruct {
  constructor(members=[], name="unnamed") {
    this.members = [];
    this.name = name;
    this.pathmap = {};
    
    for (let m of members) {
      this.add(m);
    }
  }
  
  struct(path, apiname, uiname, existing_struct=undefined) {
    let ret = existing_struct ? existing_struct : new DataStruct();

    let dpath = new DataPath(path, apiname, ret, DataTypes.STRUCT);
    
    this.add(dpath);
    return ret;
  }
  
  float(path, apiname, uiname, description) {
    let prop = new toolprop.FloatProperty(0, apiname, uiname, description);
    
    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }
  
  string(path, apiname, uiname, description) {
    let prop = new toolprop.StringProperty(undefined, apiname, uiname, description);

    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }
  
  int(path, apiname, uiname, description) {
    let prop = new toolprop.IntProperty(0, apiname, uiname, description);
    
    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }
  
  enum(path, apiname, enumdef, uiname, description) {
    let prop = new toolprop.EnumProperty(undefined, enumdef, apiname, uiname, description);
    
    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }
  
  array(path, apiname, struct) {
    //do nothing for now
  }
  
  flags(path, apiname, enumdef, uiname, description) {
    let prop = new toolprop.FlagProperty(undefined, enumdef, apiname, uiname, description);
    
    let dpath = new DataPath(path, apiname, prop);
    this.add(dpath);
    return dpath;
  }
  
  add(m) {
    this.members.push(m);
    m.parent = this;
    
    this.pathmap[m.path] = m;
    
    return this;
  }
}

let _map_struct_idgen = 1;
let _map_structs = {};

export class DataAPI extends ModelInterface {
  constructor() {
    super();
  }

  mapStruct(cls, auto_create=true) {
    let key = cls.__dp_map_id;
    
    if (key === undefined && auto_create) {
      key = cls.__dp_map_id = _map_struct_idgen++;
      _map_structs[key] = new DataStruct(undefined, cls.name);
    }
    
    return _map_structs[key];
  }

  resolvePath(ctx, path) {
    let splitchars = new Set([".", "[", "]", "=", "&"]);
    
    path = "." + this.prefix + path;
    //console.log(path);
    
    let p = [""];
    for (let i=0; i<path.length; i++) {
      let s = path[i];
      
      if (splitchars.has(s)) {
        if (s != "]") {
          p.push(s);
        }
        
        p.push("");
        continue;
      }
      
      p[p.length-1] += s;
    }
    
    for (let i=0; i<p.length; i++) {
      p[i] = p[i].trim();
      
      if (p[i].length == 0) {
        p.remove(p[i]);
        i--;
      }
      
      let c = parseInt(p[i]);
      if (!isNaN(c)) {
        p[i] = c;
      }
    }
    
    //console.log(p);
    let i = 0;
    
    let parent1, obj = ctx, parent2;
    let key = undefined;
    let dstruct = undefined;
    let arg = undefined;
    let type = "normal";
    
    while (i < p.length-1) {
      let a = p[i];
      let b = p[i+1];
      
      if (a == "." || a == "[") {
        key = b
        
        parent2 = parent1;
        parent1 = obj;
        obj = obj[b];
        
        if (obj === undefined || obj === null) {
          break;
        }
        
        if (typeof obj == "object") {
          dstruct = this.mapStruct(obj.constructor, false);
        }
        
        i += 2;
        continue;
      } else if (a == "&") {
        obj &= b;
        arg = b;
        
        i += 2;
        type = "flag";
        continue;
      } else if (a == "=") {
        obj = obj == b;
        arg = b;
        i += 2;
        type = "enum";
        continue;
      }
      
      i++;
    }
    /*
    console.log(p);
    console.log(parent2);
    console.log(parent1);
    console.log(obj);
    //*/
    let prop;
    
    if (dstruct !== undefined && dstruct.pathmap[key]) {
      let dpath = dstruct.pathmap[key];
      
      if (dpath.type == DataTypes.PROP) {
        prop = dpath.data;
      }
    }
    
    return {
      parent : parent2,
      obj : parent1,
      value : obj,
      key : key,
      dstruct : dstruct,
      prop : prop,
      arg : arg,
      type : type
    };
  }
  
  /*returns {
    obj : [object owning property key]
    parent : [parent of obj]
    key : [property key]
    value : [value of property]
    prop : [optional toolprop.ToolProperty representing the property definition]
    struct : [optional datastruct representing the type, if value is an object]
  }
  */    
  resolvePathold(ctx, path) {
    path = this.prefix + path;
    path = path.replace(/\[/g, ".").replace(/\]/g, "").trim().split(".");
    
    let parent1, obj = ctx, parent2;
    let key = undefined;
    let dstruct = undefined;
    
    for (let c of path) {
      let c2 = parseInt(c);
      if (!isNaN(c2)) {
        c = c2;
      }
      
      parent2 = parent1;
      parent1 = obj;
      key = c;

      if (typeof obj == "number") {
        //bitmask test
        obj = obj & c;
        break;
      }

      obj = obj[c];
      
      if (typeof obj == "object") {
        dstruct = this.mapStruct(obj.constructor, false);
      }
    }
    
    let prop;
    
    if (dstruct !== undefined && dstruct.pathmap[key]) {
      let dpath = dstruct.pathmap[key];
      
      if (dpath.type == DataTypes.PROP) {
        prop = dpath.data;
      }
    }
    
    return {
      parent : parent2,
      obj : parent1,
      value : obj,
      key : key,
      dstruct : dstruct,
      prop : prop
    };
  }
  
  getToolDef(path) {
    let cls = this.parseToolPath(path);
    if (cls === undefined) {
      throw new DataPathError("unknown path \"" + path + "\"");
    }
    
    return cls.tooldef();
  }
  
  parseToolPath(path) {
    return parseToolPath(path).toolclass;
  }
  
  createTool(ctx, path, inputs={}) {
    //parseToolPath will raise DataPathError if path is malformed
    let tpath = parseToolPath(path);

    let cls = tpath.toolclass;
    let args = cls.args;

    let tool = cls.invoke(ctx, args);

    if (inputs !== undefined) {
      for (let k in inputs) {
        if (!(k in tool.inputs)) {
          console.warn(cls.tooldef().uiname + ": Unknown tool property \"" + k + "\"");
          continue;
        }
        
        tool.inputs[k].setValue(inputs[k]);
      }
    }
    
    return tool;
  }
  
  static toolRegistered(cls) {
    let key = toolkey(cls);
    
    return key in tool_classes;
  }
  
  static registerTool(cls) {
    let key = toolkey(cls);
    
    if (!(key in tool_classes)) {
      tool_classes[key] = cls;
    }
  }
}

export function registerTool(cls) {
  return DataAPI.registerTool(cls);
}

export function initSimpleController() {
  initToolPaths();
}
