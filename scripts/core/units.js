import * as util from '../path-controller/util/util.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../path-controller/util/vectormath.js';

/*
all units convert to meters
*/

function normString(s) {
  //remove all whitespace
  s = s.replace(/ /g, "").replace(/\t/g, "");
  return s.toLowerCase();
}

function myToFixed(f, decimals) {
  f = f.toFixed(decimals);
  while (f.endsWith("0") && f.search(/\./) >= 0) {
    f = f.slice(0, f.length-1);
  }

  if (f.endsWith(".")) {
    f = f.slice(0, f.length-1);
  }

  if (f.length === 0)
    f = "0";

  return f.trim();
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
    return "" + myToFixed(value, decimals) + " m";
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
    return "" + myToFixed(value, decimals) + "in";
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
    let vft = ~~(value);
    let vin = (value*12) % 12;

    if (vft === 0.0) {
      return myToFixed(vin, decimals) + " in";
    }

    let s = "" + vft + " ft";
    if (vin !== 0.0) {
      s += " " + myToFixed(vin, decimals) + " in";
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
    return "" + myToFixed(value, decimals) + " miles";
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
    return "" + myToFixed(value, decimals) + " \u00B0";
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
    return "" + myToFixed(value, decimals) + " r";
  }
};

Unit.register(RadianUnit);

export function setBaseUnit(unit) {
  Unit.baseUnit = unit;
}

window._getBaseUnit = () => Unit.baseUnit;

export function setMetric(val) {
  Unit.isMetric = val;
}

Unit.isMetric = true;
Unit.baseUnit = "meter";

let numre = /[+\-]?[0-9]+(\.[0-9]*)?$/
let hexre1 = /[+\-]?[0-9a-fA-F]+h$/
let hexre2 = /[+\-]?0x[0-9a-fA-F]+$/
let binre = /[+\-]?0b[01]+$/
let expre = /[+\-]?[0-9]+(\.[0-9]*)?[eE]\-?[0-9]+$/

function isnumber(s) {
  s = (""+s).trim();
  function test(re) {
    return s.search(re) == 0;
  }

  return test(numre) || test(hexre1) || test(hexre2) || test(binre) || test(expre);
}

/* if displayUnit is undefined, final value will be converted from displayUnit to baseUnit */
export function parseValue(string, baseUnit=undefined, displayUnit=undefined) {
  let f = parseValueIntern(string, baseUnit);

  let display, base;

  if (displayUnit && displayUnit !== "none") {
    display = Unit.getUnit(displayUnit);
  }

  if (baseUnit && baseUnit !== "none") {
    base = Unit.getUnit(baseUnit);
  }

  if (display && base) {
    f = display.toInternal(f);
    f = base.fromInternal(f);
  }

  return f;
}

export function isNumber(string) {
  if (isnumber(string)) {
    return true;
  }

  for (let unit of Units) {
    let def = unit.unitDefine();

    if (unit.validate(string)) {
      return true;
    }
  }

  return false;
}

export function parseValueIntern(string, baseUnit=undefined) {
  let base;

  string = string.trim();
  if (string[0] === ".") {
    string = "0" + string;
  }

  //unannotated string?
  if (isnumber(string)) {
    //assume base unit
    let f = parseFloat(string);
    
    return f;
  }  

  if (baseUnit && baseUnit !== "none") {
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
  if (typeof baseUnit === "string" && baseUnit !== "none") {
    baseUnit = Unit.getUnit(baseUnit);
  }
  if (typeof displayUnit === "string" && displayUnit !== "none") {
    displayUnit = Unit.getUnit(displayUnit);
  }


  if (baseUnit !== "none" && displayUnit !== baseUnit && displayUnit !== "none") {
    value = convert(value, baseUnit, displayUnit);
  }

  if (displayUnit !== "none") {
    return displayUnit.buildString(value, decimalPlaces);
  } else {
    return myToFixed(value, decimalPlaces);
  }
}
window._parseValueTest = parseValue;
window._buildStringTest = buildString;
