import * as toolprop from './toolprop.js';

let PropFlags = toolprop.PropFlags,
    PropTypes = toolprop.PropTypes;

export const DataFlags = {
  READ_ONLY : 1
};

export class DataPathError extends Error {
};

export class ToolOpIface {
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

export class ModelInterface {
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
        tool = this.createTool(ctx, path ,inputs, constructor_argument);
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
