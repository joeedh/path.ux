import "./controller_ops.js";
import * as toolprop from './toolprop.js';
import {ToolOp} from './simple_toolsys.js';
import {print_stack} from './util.js';
import * as toolprop_abstract from "./toolprop_abstract.js";

let PropFlags = toolprop.PropFlags,
    PropTypes = toolprop.PropTypes;

export function isVecProperty(prop) {
  if (!prop)
    return false;

  let ok = false;

  ok = ok || prop instanceof toolprop_abstract.Vec2Property;
  ok = ok || prop instanceof toolprop_abstract.Vec3Property;
  ok = ok || prop instanceof toolprop_abstract.Vec4Property;
  ok = ok || prop instanceof toolprop.Vec2Property;
  ok = ok || prop instanceof toolprop.Vec3Property;
  ok = ok || prop instanceof toolprop.Vec4Property;

  ok = ok || prop.type === PropTypes.VEC2;
  ok = ok || prop.type === PropTypes.VEC3;
  ok = ok || prop.type === PropTypes.VEC4;
  ok = ok || prop.type === PropTypes.QUAT;

  return ok;
}

export const DataFlags = {
  READ_ONLY : 1
};

export class DataPathError extends Error {
};

export class ListIface {
  getStruct(api, list, key) {

  }
  get(api, list, key) {

  }

  getKey(api, list, obj) {

  }

  getActive(api, list) {

  }

  setActive(api, list, val) {

  }

  set(api, list, key, val) {
    list[key] = val;
  }

  getIter() {

  }

  filter(api, list, filter) {

  }
}

export class ToolOpIface {
  constructor() {
  }
  
  static tooldef() {return {
    uiname      : "!untitled tool",
    icon        : -1,
    toolpath    : "logical_module.tool", //logical_module need not match up to real module name
    description : undefined,
    is_modal    : false,
    inputs      : {}, //tool properties
    outputs     : {}  //tool properties
  }}
};

export class ModelInterface {
  constructor() {
    this.prefix = "";
  }
  
  getToolDef(path) {
    throw new Error("implement me");
  }

  getToolPathHotkey(ctx, path) {
    return undefined;
  }

  get list() {
    throw new Error("implement me");
    return ListIface;
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
      let tool = path;
      
      try {
        if (typeof tool == "string" || !(tool instanceof ToolOp)) {
          tool = this.createTool(ctx, path, inputs, constructor_argument);
        }
      } catch (error) {
        print_stack(error);
        reject(error);
        return;
      }
      
      //give client a chance to change tool instance directly
      accept(tool);
      
      //execute
      try {
        ctx.state.toolstack.execTool(ctx, tool);
      } catch (error) { //for some reason chrome is suppressing errors
        print_stack(error);
        throw error;
      }
    });
  }
  
  static toolRegistered(tool) {
    throw new Error("implement me");
  }
  
  static registerTool(tool) {
    throw new Error("implement me");
  }
  
  //not yet supported by path.ux's controller implementation
  massSetProp(ctx, mass_set_path, value) {
    throw new Error("implement me");
  }

  resolveMassSetPaths(ctx, mass_set_path) {
    throw new Error("implement me");
  }
  
  /**
   * @example
   *
   * return {
   *   obj      : [object owning property key]
   *   parent   : [parent of obj]
   *   key      : [property key]
   *   subkey   : used by flag properties, represents a key within the property
   *   value    : [value of property]
   *   prop     : [optional toolprop.ToolProperty representing the property definition]
   *   struct   : [optional datastruct representing the type, if value is an object]
   *   mass_set : mass setter string, if controller implementation supports it
   * }
   */
  resolvePath(ctx, path, ignoreExistence) {
  }
  
  setValue(ctx, path, val) {
    let res = this.resolvePath(ctx, path);
    let prop = res.prop;

    if (prop !== undefined && (prop.flag & PropFlags.USE_CUSTOM_GETSET)) {
      prop.setValue(val);
      return;
    }

    if (prop !== undefined) {
      let use_range = (prop.type & (PropTypes.INT | PropTypes.FLOAT));

      use_range = use_range || (res.subkey && (prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4)));
      use_range = use_range && prop.range;
      use_range = use_range && !(prop.range[0] === 0.0 && prop.range[1] === 0.0);

      if (use_range) {
        val = Math.min(Math.max(val, prop.range[0]), prop.range[1]);
      }
    }

    let old = res.obj[res.key];

    if (res.subkey !== undefined && res.prop !== undefined && res.prop.type == PropTypes.ENUM) {
      let ival = res.prop.values[res.subkey];

      if (val) {
        res.obj[res.key] = ival;
      }
    } else if (res.prop !== undefined && res.prop.type == PropTypes.FLAG) {
      let ival = res.prop.values[res.subkey];

      if (val) {
        res.obj[res.key] |= ival;
      } else {
        res.obj[res.key] &= ~ival;
      }
    } else if (res.subkey !== undefined && isVecProperty(res.prop)) {
      res.obj[res.subkey] = val;
    } else if (!(prop !== undefined && prop instanceof ListIface)) {
      res.obj[res.key] = val;
    }

    if (prop !== undefined && prop instanceof ListIface) {
      prop.set(this, res.obj, res.key, val);
    } else if (prop !== undefined) {
      prop.dataref = res.obj;
      prop._fire("change", res.obj[res.key], old);
    }
  }
  
  getValue(ctx, path) {
    if (typeof ctx == "string") {
      throw new Error("You forgot to pass context to getValue");
    }

    let ret = this.resolvePath(ctx, path);
    
    if (ret === undefined) {
      throw new DataPathError("invalid path", path);
    }
    
    if (ret.prop !== undefined && (ret.prop.flag & PropFlags.USE_CUSTOM_GETSET)) {
      ret.prop.dataref = ret.obj;
      
      return ret.prop.getValue();
    }
    
    return this.resolvePath(ctx, path).value;
  }
}

let DataAPIClass = undefined;
export function setImplementationClass(cls) {
  DataAPIClass = cls;
}

export function registerTool(cls) {
  if (DataAPIClass === undefined) {
    throw new Error("data api not initialized properly; call setImplementationClass");
  }
  
  return DataAPIClass.registerTool(cls);
}
