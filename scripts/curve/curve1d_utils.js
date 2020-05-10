import {CurveConstructors} from "./curve1d_base.js";
import {EnumProperty} from "../toolprop.js";

export function makeGenEnum() {
  let enumdef = {};
  let uinames = {};
  let icons = {};

  for (let cls of CurveConstructors) {
    let def = cls.define();

    let uiname = def.uiname;
    uiname = uiname === undefined ? def.name : uiname;

    enumdef[def.name] = cls.name;
    uinames[def.name] = uiname;
    icons[def.name] = def.icon !== undefined ? def.icon : -1;
  }

  //return enumdef;
  return new EnumProperty(undefined, enumdef).addUINames(uinames).addIcons(icons);
}
