import * as util from '../util/util.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../util/vectormath.js';

/*
all units convert to meters
*/

function normString(s) {
  //remove all whitespace
  s = s.replace(/ /g, "").replace(/\t/g, "");
  return s.toLowerCase();
}

export const Units = [];

export class Unit {
  static getUnit(name) {
    for (let cls of Units) {
      if (cls.unitDefine().name === name) {
        return cls;
      }
    }

    throw new Error("Unknown unit " + name);
  }

  static register(cls) {
    Units.push(cls);
  }

  //subclassed static methods start here
  static unitDefine() {return {
    name    : "",
    uiname  : "",
    type    : "", //e.g. distance
    icon    : -1,
    pattern : undefined //a re literal to validate strings
  }}

  static parse(string) {

  }

  static validate(string) {
    string = normString(string);
    let def = this.unitDefine();

    let m = string.match(def.pattern);
    if (!m)
      return false;

    return m[0] === string;
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {

  }

  static fromInternal(value) {

  }

  static buildString(value, decimals=2) {

  }
}

export class MeterUnit extends Unit {
  static unitDefine() {return {
    name    : "meter",
    uiname  : "Meter",
    type    : "distance",
    icon    : -1,
    pattern : /-?\d+(\.\d*)?m$/
  }}

  static parse(string) {
    string = normString(string);
    if (string.endsWith("m")) {
      string = string.slice(0, string.length-1);
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value;
  }

  static fromInternal(value) {
    return value;
  }

  static buildString(value, decimals=2) {
    return "" + value + " m";
  }
}

Unit.register(MeterUnit);

export class InchUnit extends Unit {
  static unitDefine() {return {
    name    : "inch",
    uiname  : "Inch",
    type    : "distance",
    icon    : -1,
    pattern : /-?\d+(\.\d*)?(in|inch)$/
  }}

  static parse(string) {
    string = string.toLowerCase();
    let i = string.indexOf("i");

    if (i >= 0) {
      string = string.slice(0, i);
    }

    return parseInt(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value*0.0254;
  }

  static fromInternal(value) {
    return value/0.0254;
  }

  static buildString(value, decimals=2) {
    return "" + value.toFixed(decimals) + "in";
  }
}
Unit.register(InchUnit);

let foot_re = /((-?\d+(\.\d*)?ft)(-?\d+(\.\d*)?(in|inch))?)|(-?\d+(\.\d*)?(in|inch))$/

export class FootUnit extends Unit {
  static unitDefine() {return {
    name    : "foot",
    uiname  : "Foot",
    type    : "distance",
    icon    : -1,
    pattern : foot_re
  }}

  static parse(string) {
    string = normString(string);
    let i = string.search("ft");
    let parts = [];
    let vft=0.0, vin=0.0;

    if (i >= 0) {
      parts = string.split("ft");
      let j = parts[1].search("in");

      if (j >= 0) {
        parts = [parts[0]].concat(parts[1].split("in"));
        vin = parseFloat(parts[1]);
      }

      vft = parseFloat(parts[0]);
    } else {
      string = string.replace(/in/g, "");
      vin = parseFloat(string);
    }

    return vin/12.0 + vft;
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value*0.3048;
  }

  static fromInternal(value) {
    return value/0.3048;
  }

  static buildString(value, decimals=2) {
    let vft = ~~(value / 12);
    let vin = value % 12;

    if (vft === 0.0) {
      return vin.toFixed(decimals) + " in";
    }

    let s = "" + vft + " ft";
    if (vin !== 0.0) {
      s += " " + vin.toFixed(decimals) + " in";
    }

    return s;
  }
}
Unit.register(FootUnit);


export class MileUnit extends Unit {
  static unitDefine() {return {
    name    : "mile",
    uiname  : "Mile",
    type    : "distance",
    icon    : -1,
    pattern : /-?\d+(\.\d+)?miles$/
  }}

  static parse(string) {
    string = normString(string);
    string = string.replace(/miles/, "");
    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value*1609.34;
  }

  static fromInternal(value) {
    return value/1609.34;
  }

  static buildString(value, decimals=3) {
    return ""+value.toFixed(decimals) + " miles";
  }
}
Unit.register(MileUnit);

export class DegreeUnit extends Unit {
  static unitDefine() {return {
    name    : "degree",
    uiname  : "Degrees",
    type    : "angle",
    icon    : -1,
    pattern : /-?\d+(\.\d+)?(\u00B0|degree|deg|d|degree|degrees)?$/
  }}

  static parse(string) {
    string = normString(string);
    if (string.search("d") >= 0) {
      string = string.slice(0, string.search("d")).trim();
    } else if (string.search("\u00B0") >= 0) {
      string = string.slice(0, string.search("\u00B0")).trim();
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value/180.0*Math.PI;
  }

  static fromInternal(value) {
    return value*180.0/Math.PI;
  }

  static buildString(value, decimals=3) {
    return ""+value.toFixed(decimals) + " \u00B0";
  }
};
Unit.register(DegreeUnit);

export class RadianUnit extends Unit {
  static unitDefine() {return {
    name    : "radian",
    uiname  : "Radians",
    type    : "angle",
    icon    : -1,
    pattern : /-?\d+(\.\d+)?(r|rad|radian|radians)$/
  }}

  static parse(string) {
    string = normString(string);
    if (string.search("r") >= 0) {
      string = string.slice(0, string.search("r")).trim();
    }

    return parseFloat(string);
  }

  //convert to internal units,
  //e.g. meters for distance
  static toInternal(value) {
    return value;
  }

  static fromInternal(value) {
    return value;
  }

  static buildString(value, decimals=3) {
    return ""+value.toFixed(decimals) + " r";
  }
};

Unit.register(RadianUnit);

export function setBaseUnit(unit) {
  Unit.baseUnit = unit;
}
export function setMetric(val) {
  Unit.isMetric = val;
}

Unit.isMetric = true;
Unit.baseUnit = "meter";

export function parseValue(string, baseUnit=undefined) {
  let base;

  if (baseUnit) {
    base = Unit.getUnit(baseUnit);
    if (base === undefined) {
      console.warn("Unknown unit " + baseUnit);
      return NaN;
    }
  } else {
    base = Unit.getUnit(Unit.baseUnit);
  }

  for (let unit of Units) {
    let def = unit.unitDefine();

    if (unit.validate(string)) {
      console.log(unit);
      let value = unit.parse(string);

      value = unit.toInternal(value);
      return base.fromInternal(value);
    }
  }

  return NaN;
}

export function convert(value, unita, unitb) {
  if (typeof unita === "string")
    unita = Unit.getUnit(unita);

  if (typeof unitb === "string")
    unitb = Unit.getUnit(unitb);

  return unitb.fromInternal(unita.toInternal(value));
}

/**
 *
 * @param value Note: is not converted to internal unit
 * @param unit: Unit to use, should be a string referencing unit type, see unitDefine().name
 * @returns {*}
 */
export function buildString(value, baseUnit=Unit.baseUnit, decimalPlaces=3, displayUnit=Unit.baseUnit) {
  if (typeof baseUnit === "string") {
    baseUnit = Unit.getUnit(baseUnit);
  }
  if (typeof displayUnit === "string") {
    displayUnit = Unit.getUnit(displayUnit);
  }

  if (displayUnit !== baseUnit) {
    value = convert(value, baseUnit, displayUnit);
  }

  return displayUnit.buildString(value, decimalPlaces);
}
window._parseValueTest = parseValue;
window._buildStringTest = buildString;
