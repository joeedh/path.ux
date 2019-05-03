let _model_interface = undefined;

define([
  "./toolprop"
], function(toolprop) {
  "use strict";
  
  let exports = _model_interface = {};
  
  let PropFlags = toolprop.PropFlags,
      PropTypes = toolprop.PropTypes;
  
  exports.ModelInterface = class ModelInterface {
    constructor() {
      this.prefix = "";
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
      
      if (prop !== undefined && (prop.flag & PropFlags.USE_CUSTOM_SETTER)) {
        prop.setValue(val);
        return;
      }
      
      if (prop !== undefined && (prop.type & (PropTypes.INT|PropTypes.FLOAT)) && prop.range) {
        console.log(prop.range);
        val = Math.min(Math.max(val, prop.range[0]), prop.range[1]);
      }
      
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
        prop._fire("change", val);
      }
    }
    
    getValue(ctx, path) {
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
    
    on(type, cb) {
      if (this.type === PropTypes.PROP) {
        this.data.on(type, cb);
      }
    }
    
    off(type, cb) {
      if (this.type === PropTypes.PROP) {
        this.data.off(type, cb);
      }
    }
    
    range(min, max) {
      this.data.setRange(min, max);
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
          p.push(s);
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
      
      let i = 0;
      
      let parent1, obj = ctx, parent2;
      let key = undefined;
      let dstruct = undefined;
      let arg = undefined;
      let type = "normal";
      
      while (i < p.length-1) {
        let a = p[i];
        let b = p[i+1];
        
        if (a == ".") {
          key = b
          
          parent2 = parent1;
          parent1 = obj;
          obj = obj[b];
          
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
  }
  
  return exports;
});
