import {ToolOp, ToolFlags} from "../toolsys/simple_toolsys.js";
import {PropTypes, PropFlags, BoolProperty, IntProperty, FloatProperty, FlagProperty,
        EnumProperty, StringProperty, Vec3Property, Vec2Property, Vec4Property,
        QuatProperty, Mat4Property} from "../toolsys/toolprop.js";

import * as util from '../util/util.js';
import {isVecProperty, getVecClass} from "./controller.js";

export class DataPathSetOp extends ToolOp {
  constructor() {
    super();

    this.propType = -1;
    this._undo = undefined;
  }

  setValue(ctx, val, object) {
    let prop = this.inputs.prop;
    let path = this.inputs.dataPath.getValue();

    if (path.type & (PropTypes.ENUM|PropTypes.FLAG)) {
      let rdef = ctx.api.resolvePath(ctx, path);
      if (rdef.subkey !== undefined) {
      //  val = rdef.value;
        //val = !!val;
      }
    }

    prop.dataref = object;
    prop.ctx = ctx;
    prop.datapath = path;

    prop.setValue(val);
  }

  static create(ctx, datapath, value, id, massSetPath) {
    let rdef = ctx.api.resolvePath(ctx, datapath);

    if (rdef === undefined || rdef.prop === undefined) {
      console.warn("DataPathSetOp failed", rdef, rdef.prop);
      return;
    }

    let prop = rdef.prop;
    let tool = new DataPathSetOp();

    tool.propType = prop.type;

    if (prop && (prop.flag & PropFlags.USE_BASE_UNDO)) {
      tool.inputs.fullSaveUndo.setValue(true);
    }

    let mask = PropTypes.FLAG|PropTypes.ENUM;
    mask |= PropTypes.VEC2|PropTypes.VEC3|PropTypes.VEC4|PropTypes.QUAT;

    if (rdef.subkey !== undefined && (prop.type & mask)) {
      if (prop.type & (PropTypes.ENUM|PropTypes.FLAG))
        tool.inputs.prop = new IntProperty();
      else
        tool.inputs.prop = new FloatProperty();

      //value = rdef.obj[rdef.key];
      //console.log("rdef.value", value);
    } else {
      tool.inputs.prop = prop.copy();
    }

    tool.inputs.dataPath.setValue(datapath);

    if (massSetPath) {
      tool.inputs.massSetPath.setValue(massSetPath);
    } else {
      tool.inputs.massSetPath.setValue("");
    }

    tool.id = id;

    tool.setValue(ctx, value, rdef.obj);

    return tool;
  }

  hash(massSetPath, dataPath, prop, id) {
    massSetPath = massSetPath === undefined ? "" : massSetPath;
    massSetPath = massSetPath === null ? "" : massSetPath;

    let ret = ""+massSetPath+":"+dataPath+":"+prop+":"+id;

    return ret;
  }

  hashThis() {
    return this.hash(this.inputs.massSetPath.getValue(),
                     this.inputs.dataPath.getValue(),
                     this.propType,
                     this.id);
  }

  undoPre(ctx) {
    if (this.inputs.fullSaveUndo.getValue()) {
      return super.undoPre(ctx);
    }

    if (this.__ctx)
      ctx = this.__ctx;

    this._undo = {};

    let paths = new util.set();

    if (this.inputs.massSetPath.getValue().trim()) {
      let massSetPath = this.inputs.massSetPath.getValue().trim();

      paths = new util.set(ctx.api.resolveMassSetPaths(ctx, massSetPath));

    }

    paths.add(this.inputs.dataPath.getValue());

    for (let path of paths) {
      this._undo[path] = ctx.api.getValue(ctx, path);
    }

    /*
    for (let path of paths) {
      let rdef = ctx.api.resolvePath(ctx, path);

      if (rdef === undefined) {
        console.warn("Failed to lookup path in DataPathSetOp.undoPre", path);
        continue;
      }

      let prop = rdef.prop;
      let value = rdef.value;

      if (prop.type & (PropTypes.ENUM|PropTypes.FLAG)) {
        this._undo[path] = rdef.obj[rdef.key];
      } else if (isVecProperty(prop)) {
        if (rdef.subkey) {
          this._undo[path] = rdef.value;
        } else {
          let cls = getVecClass(prop.type);
          this._undo[path] = new cls(rdef.value);
        }
      } else {
        let prop2 = prop.copy();

        prop2.dataref = rdef.obj;
        prop2.datapath = path;
        prop2.ctx = ctx;

        prop2.setValue(value);

        this._undo[path] = prop2.getValue();
      }
    }*/
  }

  undo(ctx) {
    if (this.__ctx)
      ctx = this.__ctx;

    if (this.inputs.fullSaveUndo.getValue()) {
      return super.undo(ctx);
    }

    for (let path in this._undo) {
      let rdef = ctx.api.resolvePath(ctx, path);

      if (rdef.prop !== undefined && (rdef.prop.type & (PropTypes.ENUM|PropTypes.FLAG))) {
        let old = rdef.obj[rdef.key];

        rdef.obj[rdef.key] = this._undo[path];

        rdef.prop.dataref = rdef.obj;
        rdef.prop.datapath = path;
        rdef.prop.ctx = ctx;

        rdef.prop._fire("change", rdef.obj[rdef.key], old);
      } else {
        try {
          ctx.api.setValue(ctx, path, this._undo[path]);
        } catch (error) {
          util.print_stack(error);
          console.warn("Failed to set property in undo for DataPathSetOp");
        }
      }
    }
  }

  exec(ctx) {
    //use saved ctx we got from modal start
    if (this.__ctx) {
      ctx = this.__ctx;
    }

    let path = this.inputs.dataPath.getValue();
    let massSetPath = this.inputs.massSetPath.getValue().trim();

    ctx.api.setValue(ctx, path, this.inputs.prop.getValue());
    if (massSetPath) {
      ctx.api.massSetProp(ctx, massSetPath, this.inputs.prop.getValue());
    }
  }

  modalStart(ctx) {
    this.__ctx = ctx.toLocked();

    //save full, modal ctx
    super.modalStart(this.__ctx);

    this.exec(this.__ctx);
    this.modalEnd(false);
  }

  static tooldef() {return {
    uiname : "Property Set",
    toolpath : "app.prop_set",
    icon : -1,
    flag : ToolFlags.PRIVATE,
    is_modal : true,
    inputs : {
      dataPath : new StringProperty(),
      massSetPath : new StringProperty(),
      fullSaveUndo : new BoolProperty(false)
    }
  }}
}
ToolOp.register(DataPathSetOp);
