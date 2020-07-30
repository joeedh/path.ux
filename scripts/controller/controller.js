import * as toolprop from '../toolsys/toolprop.js';
import {ToolOp} from '../toolsys/simple_toolsys.js';
import {print_stack} from '../util/util.js';
import * as toolprop_abstract from "../toolsys/toolprop_abstract.js";
import {ToolProperty} from "../toolsys/toolprop.js";
import * as util from '../util/util.js';
import {Vector2, Vector3, Vector4, Quat} from '../util/vectormath.js';

let PropFlags = toolprop.PropFlags,
    PropTypes = toolprop.PropTypes;

export function getVecClass(proptype) {
  switch (proptype) {
    case PropTypes.VEC2:
      return Vector2;
    case PropTypes.VEC3:
      return Vector3;
    case PropTypes.VEC4:
      return Vector4;
    case PropTypes.QUAT:
      return Quat;
    default:
      throw new Error("bad prop type " + proptype);
  }
}
export function isVecProperty(prop) {
  if (!prop || typeof prop !== "object" || prop === null)
    return false;

  let ok = false;

  ok = ok || prop instanceof toolprop_abstract.Vec2PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec3PropertyIF;
  ok = ok || prop instanceof toolprop_abstract.Vec4PropertyIF;
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
  READ_ONLY         : 1,
  USE_CUSTOM_GETSET : 2,
  USE_FULL_UNDO     : 4 //DataPathSetOp in controller_ops.js saves/loads entire file for undo/redo
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

  /**
   * runs .undo,.redo if toolstack head is same as tool
   *
   * otherwise, .execTool(ctx, tool) is called.
   *
   * @param compareInputs : check if toolstack head has identical input values, defaults to false
   * */
  execOrRedo(ctx, toolop, compareInputs=false) {
    return ctx.toolstack.execOrRedo(ctx, toolop, compareInputs);
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
        ctx.toolstack.execTool(ctx, tool);
      } catch (error) { //for some reason chrome is suppressing errors
        print_stack(error);
        throw error;
      }
    });
  }

  //used by simple_controller.js for tagging error messages
  pushReportContext(name) {

  }

  //used by simple_controller.js for tagging error messages
  popReportContext() {

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

  /** takes a mass_set_path and returns an array of individual paths */
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
      prop.dataref = res.obj;
      prop.ctx = ctx;
      prop.datapath = path;

      prop.setValue(val);
      return;
    }

    if (prop !== undefined) {
      if (prop.type === PropTypes.CURVE && !val) {
        throw new DataPathError("can't set curve data to nothing");
      }

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

  getDescription(ctx, path) {
    let rdef = this.resolvePath(ctx, path);
    if (rdef === undefined) {
      throw new DataPathError("invalid path " + path);
    }

    if (!rdef.prop || !(rdef.prop instanceof ToolProperty)) {
      return "";
    }

    let type = rdef.prop.type;
    let prop = rdef.prop;

    if (rdef.subkey !== undefined) {
      let subkey = rdef.subkey;

      if (type & (PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4)) {
        if (prop.descriptions && subkey in prop.descriptions) {
          return prop.descriptions[subkey];
        }
      } else if (type & (PropTypes.ENUM|PropTypes.FLAG)) {
        if (!(subkey in prop.values) && subkey in prop.keys) {
          subkey = prop.keys[subkey]
        };

        if (prop.descriptions && subkey in prop.descriptions) {
          return prop.descriptions[subkey];
        }
      } else if (type === PropTypes.PROPLIST) {
        let val = tdef.value;
        if (typeof val === "object" && val instanceof ToolProperty) {
          return val.description;
        }
      }
    }

    return rdef.prop.description ? rdef.prop.description : rdef.prop.uiname;
  }

  validPath(ctx, path) {
    try {
      this.getValue(ctx, path);
      return true;
    } catch (error) {
      if (!(error instanceof DataPathError)) {
        throw error;
      }
    }

    return false;
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
      ret.prop.datapath = path;
      ret.prop.ctx = ctx;
      
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
