import {Icons} from "./ui_base.js";
import {EnumProperty} from "./toolprop.js";
import {CurveConstructors} from './curve1d.js';

export function makeGenEnum() {
  let enumdef = {};
  let uinames = {};
  let icons = {};

  for (let k in CurveConstructors) {
    let cls = CurveConstructors[k];
    let def = cls.define();

    let uiname = def.uiname;
    uiname = uiname === undefined ? def.name : uiname;

    enumdef[def.name] = k;
    uinames[def.name] = uiname;
    icons[def.name] = def.icon !== undefined ? def.icon : -1;
  }

  //return enumdef;
  return new EnumProperty(undefined, enumdef).addUINames(uinames).addIcons(icons);
}

