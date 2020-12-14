import {PropFlags, PropTypes} from '../toolsys/toolprop_abstract.js';
import {Quat, Vector2, Vector3, Vector4} from '../util/vectormath.js';
import * as toolprop_abstract from '../toolsys/toolprop_abstract.js';
import * as toolprop from '../toolsys/toolprop.js';

export const DataFlags = {
  READ_ONLY         : 1,
  USE_CUSTOM_GETSET : 2,
  USE_FULL_UNDO     : 4 //DataPathSetOp in controller_ops.js saves/loads entire file for undo/redo
};


export const DataTypes = {
  STRUCT: 0,
  DYNAMIC_STRUCT: 1,
  PROP: 2,
  ARRAY: 3
};


export class DataPathError extends Error {
};


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

export class DataPath {
  constructor(path, apiname, prop, type = DataTypes.PROP) {
    this.type = type;
    this.data = prop;
    this.apiname = apiname;
    this.path = path;
    this.flag = 0;
    this.struct = undefined;
  }

  copy() {
    let ret = new DataPath();

    ret.flag = this.flag;
    ret.type = this.type;
    ret.data = this.data;
    ret.apiname = this.apiname;
    ret.path = this.path;
    ret.struct = this.struct;

    return ret;
  }

  setProp(prop) {
    this.data = prop;
  }

  readOnly() {
    this.flag |= DataFlags.READ_ONLY;

    if (this.type === DataTypes.PROP) {
      this.data.flag |= PropFlags.READ_ONLY;
    }

    return this;
  }

  read_only() {
    console.warn("DataPath.read_only is deprecated; use readOnly");
    return this.readOnly();
  }

  /**
   *
   * For the callbacks 'this' points to an internal ToolProperty;
   * Referencing object lives in 'this.dataref'; calling context in 'this.ctx';
   * and the datapath is 'this.datapath'
   **/
  customGetSet(get, set) {
    this.flag |= DataFlags.USE_CUSTOM_GETSET;

    if (this.type !== DataTypes.DYNAMIC_STRUCT && this.type !== DataTypes.STRUCT) {
      this.data.flag |= PropFlags.USE_CUSTOM_GETSET;
      this.data._getValue = this.data.getValue;
      this.data._setValue = this.data.setValue;

      if (get)
        this.data.getValue = get;

      if (set)
        this.data.setValue = set;
    } else {
      this.getSet = {
        get, set
      };

      this.getSet.dataref = undefined;
      this.getSet.datapath = undefined;
      this.getSet.ctx = undefined;
    }

    return this;
  }

  customSet(set) {
    this.customGetSet(undefined, set);
    return this;
  }

  customGet(get) {
    this.customGetSet(get, undefined);
    return this;
  }

  /**db will be executed with underlying data object
   that contains this path in 'this.dataref'

   main event is 'change'
   */
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

  simpleSlider() {
    this.data.flag |= PropFlags.SIMPLE_SLIDER;
    return this;
  }

  rollerSlider() {
    this.data.flag &= ~PropFlags.SIMPLE_SLIDER;
    this.data.flag |= PropFlags.FORCE_ROLLER_SLIDER;

    return this;
  }

  noUnits() {
    this.baseUnit("none");
    this.displayUnit("none");
    return this;
  }

  baseUnit(unit) {
    this.data.setBaseUnit(unit);
    return this;
  }

  displayUnit(unit) {
    this.data.setDisplayUnit(unit);
    return this;
  }

  range(min, max) {
    this.data.setRange(min, max);
    return this;
  }

  uiRange(min, max) {
    this.data.setUIRange(min, max);
    return this;
  }

  decimalPlaces(n) {
    this.data.setDecimalPlaces(n);
    return this;
  }

  expRate(exp) {
    this.data.setExpRate(exp);
    return this;
  }

  /**adds a slider for moving vector component sliders simultaneously*/
  uniformSlider(state=true) {
    this.data.uniformSlider(state);

    return this;
  }

  radix(r) {
    this.data.setRadix(r);
    return this;
  }

  relativeStep(s) {
    this.data.setRelativeStep(s);
    return this;
  }

  step(s) {
    this.data.setStep(s);
    return this;
  }

  /**
   *
   * Tell DataPathSetOp to save/load entire app state for undo/redo
   *
   * */
  fullSaveUndo() {
    this.flag |= DataFlags.USE_FULL_UNDO;
    this.data.flag |= PropFlags.USE_BASE_UNDO;

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

  descriptions(description_map) { //for enum/flag properties
    this.data.addDescriptions(description_map);
    return this;
  }

  uiNames(uinames) {
    this.data.addUINames(uinames);
    return this;
  }

  description(d) {
    this.data.description = d;
    return this;
  }
}

export const StructFlags = {
  NO_UNDO: 1 //struct and its child structs can't participate in undo
             //via the DataPathToolOp
};
