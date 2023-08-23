import * as util from '../path-controller/util/util.js';
import {Vector2, Vector3, Vector4, Quat, Matrix4} from '../path-controller/util/vectormath.js';

/*
all units convert to meters
*/

const FLT_EPSILONE = 1.192092895507812e-07;

function myfloor(f) {
  return Math.floor(f + FLT_EPSILONE*2.0);
}

function normString(s) {
  //remove all whitespace
  s = s.replace(/ /g, "").replace(/\t/g, "");
  return s.toLowerCase();
}

function myToFixed(f, decimals) {
  if (typeof f !== "number") {
    return "(error)";
  }

  f = f.toFixed(decimals);
  while (f.endsWith("0") && f.search(/\./) >= 0) {
    f = f.slice(0, f.length - 1);
  }

  if (f.endsWith(".")) {
    f = f.slice(0, f.length - 1);
  }

  if (f.length === 0)
    f = "0";

  return f.trim();
}

export const Units = [];

export class Unit {
  static getUnit(name) {
    if (name === "none" || name === undefined) {
      return undefined;
    }

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
  static unitDefine() {
    return {
      name   : "",
      uiname : "",
      type   : "", //e.g. distance
      icon   : -1,
      pattern: undefined //a re literal to validate strings
    }
  }

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

  static buildString(value, decimals = 2) {

  }
}

export class MeterUnit extends Unit {
  static unitDefine() {
    return {
      name   : "meter",
      uiname : "Meter",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d*)?m$/
    }
  }

  static parse(string) {
    string = normString(string);
    if (string.endsWith("m")) {
      string = string.slice(0, string.length - 1);
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

  static buildString(value, decimals = 2) {
    return "" + myToFixed(value, decimals) + " m";
  }
}

Unit.register(MeterUnit);

export class InchUnit extends Unit {
  static unitDefine() {
    return {
      name   : "inch",
      uiname : "Inch",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d*)?(in|inch)$/
    }
  }

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

  static buildString(value, decimals = 2) {
    return "" + myToFixed(value, decimals) + "in";
  }
}

Unit.register(InchUnit);

let foot_re = /((-?\d+(\.\d*)?ft)(-?\d+(\.\d*)?(in|inch))?)|(-?\d+(\.\d*)?(in|inch))$/

export class FootUnit extends Unit {
  static unitDefine() {
    return {
      name   : "foot",
      uiname : "Foot",
      type   : "distance",
      icon   : -1,
      pattern: foot_re
    }
  }

  static parse(string) {
    string = normString(string);
    let i = string.search("ft");
    let parts = [];
    let vft = 0.0, vin = 0.0;

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

  static buildString(value, decimals = 2) {
    let vft = myfloor(value);
    let vin = ((value + FLT_EPSILONE*2)*12)%12;

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


let square_foot_re = /((-?\d+(\.\d*)?ft(\u00b2)?)(-?\d+(\.\d*)?(in|inch)(\u00b2)?)?)|(-?\d+(\.\d*)?(in|inch)(\u00b2)?)$/

export class SquareFootUnit extends FootUnit {
  static unitDefine() {
    return {
      name   : "square_foot",
      uiname : "Square Feet",
      type   : "area",
      icon   : -1,
      pattern: square_foot_re
    }
  }

  static parse(string) {
    string = string.replace(/\u00b2/g, "");
    return super.parse(string);
  }


  static buildString(value, decimals = 2) {
    let vft = myfloor(value);
    let vin = ((value + FLT_EPSILONE*2)*12)%12;

    if (vft === 0.0) {
      return myToFixed(vin, decimals) + " in\u00b2";
    }

    let s = "" + vft + " ft\u00b2";
    if (vin !== 0.0) {
      s += " " + myToFixed(vin, decimals) + " in\u00b2";
    }

    return s;
  }
}

Unit.register(SquareFootUnit);


export class MileUnit extends Unit {
  static unitDefine() {
    return {
      name   : "mile",
      uiname : "Mile",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d+)?miles$/
    }
  }

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

  static buildString(value, decimals = 3) {
    return "" + myToFixed(value, decimals) + " miles";
  }
}

Unit.register(MileUnit);

export class DegreeUnit extends Unit {
  static unitDefine() {
    return {
      name   : "degree",
      uiname : "Degrees",
      type   : "angle",
      icon   : -1,
      pattern: /-?\d+(\.\d+)?(\u00B0|degree|deg|d|degree|degrees)$/
    }
  }

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

  static buildString(value, decimals = 3) {
    return "" + myToFixed(value, decimals) + " \u00B0";
  }
};
Unit.register(DegreeUnit);

export class RadianUnit extends Unit {
  static unitDefine() {
    return {
      name   : "radian",
      uiname : "Radians",
      type   : "angle",
      icon   : -1,
      pattern: /-?\d+(\.\d+)?(r|rad|radian|radians)$/
    }
  }

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

  static buildString(value, decimals = 3) {
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

let numre1 = /[+\-]?[0-9]+(\.[0-9]*)?$/
let numre2 = /[+\-]?[0-9]?(\.[0-9]*)+$/
let hexre1 = /[+\-]?[0-9a-fA-F]+h$/
let hexre2 = /[+\-]?0x[0-9a-fA-F]+$/
let binre = /[+\-]?0b[01]+$/
let expre = /[+\-]?[0-9]+(\.[0-9]*)?[eE]\-?[0-9]+$/
let intre = /[+\-]?[0-9]+$/

function isnumber(s) {
  s = ("" + s).trim();

  function test(re) {
    return s.search(re) === 0;
  }

  return test(intre) || test(numre1) || test(numre2) || test(hexre1) || test(hexre2) || test(binre) || test(expre);
}


export function parseValueIntern(string, baseUnit = undefined) {
  string = string.trim();
  if (string[0] === ".") {
    string = "0" + string;
  }

  if (typeof baseUnit === "string") {
    let base = Unit.getUnit(baseUnit);

    if (base === undefined && baseUnit !== "none") {
      console.warn("Unknown unit " + baseUnit);
      return NaN;
    }

    baseUnit = base;
  }

  //unannotated string?
  if (isnumber(string)) {
    //assume base unit
    let f = parseFloat(string);

    return f;
  }

  if (baseUnit === undefined) {
    console.warn("No base unit in units.js:parseValueIntern");
  }

  for (let unit of Units) {
    let def = unit.unitDefine();

    if (unit.validate(string)) {
      console.log(unit);
      let value = unit.parse(string);

      if (baseUnit) {
        value = unit.toInternal(value);
        return baseUnit.fromInternal(value);
      } else {
        return value;
      }
    }
  }

  return NaN;
}

/* if displayUnit is undefined, final value will be converted from displayUnit to baseUnit */
export function parseValue(string, baseUnit = undefined, displayUnit = undefined) {
  displayUnit = Unit.getUnit(displayUnit);
  baseUnit = Unit.getUnit(baseUnit);

  let f = parseValueIntern(string, displayUnit || baseUnit);

  if (displayUnit) {
    f = displayUnit.toInternal(f);
  }

  if (baseUnit) {
    f = baseUnit.fromInternal(f);
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

export class PixelUnit extends Unit {
  static unitDefine() {
    return {
      name   : "pixel",
      uiname : "Pixel",
      type   : "distance",
      icon   : -1,
      pattern: /-?\d+(\.\d*)?px$/
    }
  }

  static parse(string) {
    string = normString(string);
    if (string.endsWith("px")) {
      string = string.slice(0, string.length - 2).trim();
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

  static buildString(value, decimals = 2) {
    return "" + myToFixed(value, decimals) + "px";
  }
}

Unit.register(PixelUnit);

export class PercentUnit extends Unit {
  static unitDefine() {
    return {
      name   : "percent",
      uiname : "Percent",
      type   : "distance",
      icon   : -1,
      pattern: /[0-9]+(\.[0-9]+)?[ \t]*%/
    }
  }

  static toInternal(value) {
    return value/100.0;
  }

  static fromInternal(value) {
    return value*100.0;
  }

  static parse(string) {
    return parseFloat(string.replace(/%/g, ""));
  }

  static buildString(value, decimals = 2) {
    return (value).toFixed(decimals) + "%";
  }
}

Unit.register(PercentUnit);


export function convert(value, unita, unitb) {
  /* Note: getUnit throws on invalid units *except* for
   *       'none' where it returns undefined.
   */

  if (typeof unita === "string") {
    unita = Unit.getUnit(unita);
  }

  if (typeof unitb === "string") {
    unitb = Unit.getUnit(unitb);
  }

  if (unita && unitb) {
    return unitb.fromInternal(unita.toInternal(value));
  } else if (unitb) {
    return unitb.fromInternal(value); /* unita was 'none' */
  } else if (unita) {
    return unita.toInternal(value);
  } else {
    return value;
  }
}

window.unitConvert = convert;

/**
 *
 * @param value Value (note: is not converted to internal unit)
 * @param unit: Unit to use, should be a string referencing unit type, see unitDefine().name
 * @returns {*}
 */
export function buildString(value, baseUnit = Unit.baseUnit, decimalPlaces = 3, displayUnit = Unit.baseUnit) {
  if (typeof baseUnit === "string" && baseUnit !== "none") {
    baseUnit = Unit.getUnit(baseUnit);
  }
  if (typeof displayUnit === "string" && displayUnit !== "none") {
    displayUnit = Unit.getUnit(displayUnit);
  }


  if (displayUnit !== baseUnit) {
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
