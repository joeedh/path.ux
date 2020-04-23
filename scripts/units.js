import * as util from './util.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from './vectormath.js';

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
  }

  static register(cls) {
    Units.push(cls);
  }

  //subclassed static methods start here
  static unitDefine() {return {
    name    : "",
    uiname  : "",
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
    icon    : -1,
    pattern : /\d+(\.\d*)?m/
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
    icon    : -1,
    pattern : /\d+(\.\d*)?in/
  }}

  static parse(string) {

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

let foot_re = /((\d+(\.\d*)?ft)(\d+(\.\d*)?in)?)|(\d+(\.\d*)?in)/

export class FootUnit extends Unit {
  static unitDefine() {return {
    name    : "foot",
    uiname  : "Foot",
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

export function setBaseUnit(unit) {
  Unit.baseUnit = unit;
}
Unit.baseUnit = "meter";

export function parseValue(string) {
  let base = Unit.getUnit(Unit.baseUnit);

  for (let unit of Units) {
    let def = unit.unitDefine();

    if (unit.validate(string)) {
      let value = unit.parse(string);

      value = unit.toInternal(value);
      return base.fromInternal(value);
    }
  }
}

/**
 *
 * @param value Note: is not converted to internal unit
 * @param unit: Unit to use, should be a string referencing unit type, see unitDefine().name
 * @returns {*}
 */
export function buildString(value, unit=Unit.baseUnit) {
  unit = Unit.getUnit(unit);
  return unit.buildString(value);
}
window._parseValueTest = parseValue;
window._buildStringTest = buildString;
