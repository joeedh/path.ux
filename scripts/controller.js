let _controller = undefined; //for use in debugging console *only*

define([
  "./toolprop"
], function(toolprop) {
  "use strict";
  
  let exports = _controller = {};
  
  let PropFlags = toolprop.PropFlags,
      PropTypes = toolprop.PropTypes;
  
  const DataFlags = exports.DataFlags = {
    READ_ONLY : 1
  };
  
  const DataPathError = exports.DataPathError = class DataPathError extends Error {
  };
  
  exports.ToolPropertyIface = class ToolPropertyIface {
    constructor() {
    }
    
    static tooldef() {return {
      uiname      : "!untitled tool",
      icon        : -1,
      toolpath    : "logical_module.tool", //logical_module need not match up to real module name
      description : undefined,
      hotkey      : undefined,
      is_modal    : false,
      inputs      : {}, //tool properties
      outputs     : {}  //tool properties
    }}
  };
  
  let tool_classes = exports.tool_classes = {};
  let tool_idgen = 1;
  Symbol.ToolID = Symbol("toolid");
  
  function toolkey(cls) {
    if (!(Symbol.ToolID in cls)) {
      cls[Symbol.ToolID] = tool_idgen++;
    }
    
    return cls[Symbol.ToolID];
  }
  
  exports.ModelInterface = class ModelInterface {
    constructor() {
      this.prefix = "";
    }
    
    getToolDef(path) {
      throw new Error("implement me");
    }
    
    createTool(path, inputs={}, constructor_argument=undefined) {
      throw new Error("implement me");
    }
    
    //returns tool class, or undefined if one cannot be found for path
    parseToolPath(path) {
      throw new Error("implement me");
    }
    
    execTool(ctx, path, inputs={}, constructor_argument=undefined) {
      return new Promise((accept, reject) => {
        let tool;
        
        try {
          tool = this.createTool(path ,inputs, constructor_argument);
        } catch (error) {
          reject(error);
          return;
        }
        
        //give client a chance to change tool instance directly
        accept(tool);
        
        //execute
        ctx.state.toolstack.execTool(tool);
      });
    }
    
    static toolRegistered(tool) {
      throw new Error("implement me");
    }
    
    static registerTool(tool) {
      throw new Error("implement me");
    }
    
    /*returns {
      parent : [parent object of path]
      object : [object owning property key]
      key : [property key]
      value : [value of property]
      prop : [optional toolprop.ToolProperty representing the property definition]
      struct : [optional datastruct representing the type, if value is an object]
    }
    */
    resolvePath(ctx, path) {
      //path = prefix + path;
    }
    
    setValue(ctx, path, val) {
      let res = this.resolvePath(ctx, path);
      let prop = res.prop;
      
      if (prop !== undefined && (prop.flag & PropFlags.USE_CUSTOM_GETSET)) {
        prop.setValue(val);
        return;
      }
      
      if (prop !== undefined && (prop.type & (PropTypes.INT|PropTypes.FLOAT)) && prop.range) {
        console.log(prop.range);
        val = Math.min(Math.max(val, prop.range[0]), prop.range[1]);
      }
      
      let old = res.obj[res.key];
      
      if (res.type == "enum") {
        if (val) {
          res.obj[res.key] = res.arg;
        }
      } else if (res.type == "flag") {
        if (val) {
          res.obj[res.key] |= res.arg;
        } else {
          res.obj[res.key] &= ~res.arg;
        }
      } else {
        res.obj[res.key] = val;
      }
      
      if (prop !== undefined) {
        prop.dataref = res.obj;
        prop._fire("change", res.obj[res.key], old);
      }
    }
    
    getValue(ctx, path) {
      let ret = this.resolvePath(ctx, path);
      
      if (ret.prop !== undefined && (ret.prop.flag & PropFlags.USE_CUSTOM_GETSET)) {
        ret.prop.dataref = ret.obj;
        
        return ret.prop.getValue();
      }
      
      return this.resolvePath(ctx, path).value;
    }
  }
  
  let DataTypes = exports.DataTypes = {
    STRUCT : 0,
    PROP : 1
  }
  
  let DataPath = exports.DataPath = class DataPath extends exports.ModelInterface {
    constructor(path, apiname, prop, type=DataTypes.PROP) {
      super();
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
  
  let DataStruct = exports.DataStruct = class DataStruct {
    constructor(members=[], name="unnamed") {
      this.members = [];
      this.name = name;
      this.pathmap = {};
      
      for (let m of members) {
        this.add(m);
      }
    }
    
    struct(name) {
      let ret = new DataStruct();
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
  
  let DataAPI = exports.DataAPI = class DataAPI extends exports.ModelInterface {
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
      parent : [parent object of path]
      object : [object owning property key]
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
      //path = path.trim().split(" ");
      
      for (let key in tool_classes) {
        let cls = tool_classes[key];
        
        let def = cls.tooldef();
        if (def.toolpath == path) {
          return cls;
        }
      }
      
      return undefined;
    }
    
    createTool(path, inputs={}, constructor_argument=undefined) {
      let cls = this.parseToolPath(path);
      
      if (cls === undefined) {
        throw new DataPathError("unknown path \"" + path + "\"");
      }
      
      let tool = new cls(constructor_argument);
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
  
  exports.registerTool = function(cls) {
    return DataAPI.registerTool(cls);
  }
  
  return exports;
});

