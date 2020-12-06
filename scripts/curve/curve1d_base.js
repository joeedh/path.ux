import {nstructjs} from "../util/struct.js";

export const CurveConstructors = [];
export const CURVE_VERSION = 1.0;

export const CurveFlags = {
  SELECT : 1
};


export const TangentModes = {
  SMOOTH : 1,
  BREAK  : 2
};

export function getCurve(type, throw_on_error=true) {
  for (let cls of CurveConstructors) {
    if (cls.name === type)
      return cls;
    if (cls.define().name === type)
      return cls;
  }

  if (throw_on_error) {
    throw new Error("Unknown curve type " + type)
  } else {
    console.warn("Unknown curve type", type);
    return getCurve("ease");
  }
}

export class CurveTypeData {
  constructor() {
    this.type = this.constructor.name;
  }

  static register(cls) {
    if (cls.define === CurveTypeData.define) {
      throw new Error("missing define() static method");
    }

    let def = cls.define();
    if (!def.name) {
      throw new Error(cls.name + ".define() result is missing 'name' field");
    }


    CurveConstructors.push(cls);
  }

  toJSON() {
    return {
      type: this.type
    }
  }

  equals(b) {
    return this.type === b.type;
  }

  loadJSON(obj) {
    this.type = obj.type;

    return this;
  }

  redraw() {
    if (this.parent)
      this.parent.redraw();
  }

  get hasGUI() {
    throw new Error("get hasGUI(): implement me!");
  }

  makeGUI(container) {

  }

  killGUI(container) {
    container.clear();
  }

  evaluate(s) {
    throw new Error("implement me!");
  }

  integrate(s1, quadSteps=64) {
    let ret = 0.0, ds = s1 / quadSteps;

    for (let i=0, s=0; i<quadSteps; i++, s += ds) {
      ret += this.evaluate(s)*ds;
    }

    return ret;
  }

  derivative(s) {
    let df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.evaluate(s) - this.evaluate(s - df)) / df;
    } else if (s < df * 3) {
      return (this.evaluate(s + df) - this.evaluate(s)) / df;
    } else {
      return (this.evaluate(s + df) - this.evaluate(s - df)) / (2 * df);
    }
  }

  derivative2(s) {
    let df = 0.0001;

    if (s > 1.0 - df * 3) {
      return (this.derivative(s) - this.derivative(s - df)) / df;
    } else if (s < df * 3) {
      return (this.derivative(s + df) - this.derivative(s)) / df;
    } else {
      return (this.derivative(s + df) - this.derivative(s - df)) / (2 * df);
    }
  }

  inverse(y) {
    let steps = 9;
    let ds = 1.0 / steps, s = 0.0;
    let best = undefined;
    let ret = undefined;

    for (let i = 0; i < steps; i++, s += ds) {
      let s1 = s, s2 = s + ds;

      let mid;

      for (let j = 0; j < 11; j++) {
        let y1 = this.evaluate(s1);
        let y2 = this.evaluate(s2);
        mid = (s1 + s2) * 0.5;

        if (Math.abs(y1 - y) < Math.abs(y2 - y)) {
          s2 = mid;
        } else {
          s1 = mid;
        }
      }

      let ymid = this.evaluate(mid);

      if (best === undefined || Math.abs(y - ymid) < best) {
        best = Math.abs(y - ymid);
        ret = mid;
      }
    }

    return ret === undefined ? 0.0 : ret;
  }

  static define() {return {
    uiname : "Some Curve",
    name   : "somecurve"
  }}

  onActive(parent, draw_transform) {
  }

  onInactive(parent, draw_transform) {
  }

  reset() {

  }

  destroy() {
  }

  update() {
    if (this.parent)
      this.parent._on_change();
  }

  draw(canvas, g, draw_transform) {
  }

  loadSTRUCT(reader) {
    reader(this);
  }
}

CurveTypeData.STRUCT = `
CurveTypeData {
  type : string;
}
`;
nstructjs.register(CurveTypeData);

