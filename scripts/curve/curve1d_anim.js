import {nstructjs} from "../util/struct.js";
import {CurveConstructors, CurveTypeData} from "./curve1d_base.js";
import Ease from './ease.js';
import * as util from '../util/util.js';

function bez3(a, b, c, t) {
  var r1 = a + (b - a)*t;
  var r2 = b + (c - b)*t;

  return r1 + (r2 - r1)*t;
}

function bez4(a, b, c, d, t) {
  var r1 = bez3(a, b, c, t);
  var r2 = bez3(b, c, d, t);

  return r1 + (r2 - r1)*t;
}

export class ParamKey {
  constructor(key, val) {
    this.key = key;
    this.val = val;
  }
}
ParamKey.STRUCT = `
ParamKey {
  key : string;
  val : float;
}
`
nstructjs.register(ParamKey);
let BOOL_FLAG = 1e17;

export class SimpleCurveBase extends CurveTypeData {
  constructor() {
    super();

    this.type = this.constructor.name;

    let def = this.constructor.define();
    let params = def.params;

    this.params = {};
    for (let k in params) {
      this.params[k] = params[k][1];
    }
  }

  redraw() {
    if (this.parent)
      this.parent.redraw();
  }

  get hasGUI() {
    return true;
  }

  makeGUI(container) {
    let def = this.constructor.define();
    let params = def.params;

    for (let k in params) {
      let p = params[k];

      if (p[2] === BOOL_FLAG) {
        let check = container.check(undefined, p[0]);
        check.checked = !!this.params[k];
        check.key = k;

        let this2 = this;
        check.onchange = function () {
          this2.params[this.key] = this.checked ? 1 : 0;
          this2.update();
          this2.redraw();
        }
      } else {
        let slider = container.slider(undefined, {
          name: p[0],
          defaultval: this.params[k],
          min: p[2],
          max: p[3]
        })
        slider.baseUnit = slider.displayUnit = "none";

        slider.key = k;

        let this2 = this;
        slider.onchange = function () {
          this2.params[this.key] = this.value;
          this2.update();
          this2.redraw();
        }
      }
    }
  }

  killGUI(container) {
    container.clear();
  }

  evaluate(s) {
    throw new Error("implement me!");
  }

  reset() {

  }

  update() {
    super.update();
  }

  draw(canvas, g, draw_transform) {
    let steps = 128;
    let s=0, ds = 1.0 / (steps-1);

    g.beginPath();
    for (let i=0; i<steps; i++, s += ds) {
      let co = this.evaluate(s);

      if (i) {
        g.lineTo(co[0], co[1]);
      } else {
        g.moveTo(co[0], co[1]);
      }
    }

    g.stroke();
  }

  _saveParams() {
    let ret = [];
    for (let k in this.params) {
      ret.push(new ParamKey(k, this.params[k]));
    }

    return ret;
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      params : this.params
    });
  }

  loadJSON(obj) {
    for (let k in obj.params) {
      this.params[k] = obj.params[k];
    }

    return this;
  }

  loadSTRUCT(reader) {
    reader(this);
    super.loadSTRUCT(reader);

    let ps = this.params;
    this.params = {};

    let pdef = this.constructor.define().params;
    if (!pdef) {
      console.warn("Missing define function for curve", this.constructor.name)
      return;
    }
    console.log(this.constructor.define(), this, "<-----");

    for (let pair of ps) {
      if (pair.key in pdef) {
        this.params[pair.key] = pair.val;
      }
    }

    for (let k in pdef) {
      if (!(k in this.params)) {
        this.params[k] = pdef[k][1];
      }
    }
  }
}

SimpleCurveBase.STRUCT = nstructjs.inherit(SimpleCurveBase, CurveTypeData) + `
  params : array(ParamKey) | obj._saveParams();
}
`;
nstructjs.register(SimpleCurveBase);

export class BounceCurve extends SimpleCurveBase {
  _evaluate(t) {
    let params = this.params;
    let decay = params.decay + 1.0;
    let scale = params.scale;
    let freq = params.freq;
    let phase = params.phase;
    let offset = params.offset;

    t *= freq;
    let t2 = Math.abs(Math.cos(phase + t*Math.PI*2.0))*scale; ;//+ (1.0-scale);

    t2 *= Math.exp(decay*t) / Math.exp(decay);

    return t2;
  }

  evaluate(t) {
    let s = this._evaluate(0.0);
    let e = this._evaluate(1.0);

    return (this._evaluate(t) - s) / (e - s) + this.params.offset;
  }

  static define() {return {
    params : {
      decay  : ["Decay", 1.0, 0.1, 5.0],
      scale  : ["Scale", 1.0, 0.01, 10.0],
      freq   : ["Freq", 1.0, 0.01, 50.0],
      phase  : ["Phase", 0.0, -Math.PI*2.0, Math.PI*2.0],
      offset : ["Offset", 0.0, -2.0, 2.0]
    },
    name   : "bounce",
    uiname : "Bounce"
  }}
}
CurveTypeData.register(BounceCurve);
BounceCurve.STRUCT = nstructjs.inherit(BounceCurve, SimpleCurveBase) + `
}`;
nstructjs.register(BounceCurve);


export class ElasticCurve extends SimpleCurveBase {
  constructor() {
    super();

    this._func = undefined;
    this._last_hash = undefined;
  }

  evaluate(t) {
    let hash = ~~(this.params.mode*127 + this.params.amplitude*256 + this.params.period*512);

    if (hash !== this._last_hash || !this._func) {
      this._last_hash = hash;
      if (this.params.mode) {
        this._func = Ease.getElasticOut(this.params.amplitude, this.params.period);
      } else {
        this._func = Ease.getElasticIn(this.params.amplitude, this.params.period);
      }
    }
    return this._func(t);
  }

  static define() {return {
    params : {
      mode      : ["Out Mode", false, BOOL_FLAG, BOOL_FLAG],
      amplitude : ["Amplitude", 1.0, 0.01, 10.0],
      period    : ["Period", 1.0, 0.01, 5.0]
    },
    name   : "elastic",
    uiname : "Elastic"
  }}
}
CurveTypeData.register(ElasticCurve);
ElasticCurve.STRUCT = nstructjs.inherit(ElasticCurve, SimpleCurveBase) + `
}`;
nstructjs.register(ElasticCurve);


export class EaseCurve extends SimpleCurveBase {
  constructor() {
    super();
  }

  evaluate(t) {
    let amp = this.params.amplitude;
    let a1 = this.params.mode_in ? 1.0-amp : 0.0;
    let a2 = this.params.mode_out ? amp : 0.0;

    return bez4(0.0, a1, a2, 1.0, t);
  }

  static define() {return {
    params : {
      mode_in   : ["in", true, BOOL_FLAG, BOOL_FLAG],
      mode_out  : ["out", true, BOOL_FLAG, BOOL_FLAG],
      amplitude : ["Amplitude", 1.0, 0.01, 4.0]
    },
    name   : "ease",
    uiname : "Ease"
  }}
}
CurveTypeData.register(EaseCurve);
EaseCurve.STRUCT = nstructjs.inherit(EaseCurve, SimpleCurveBase) + `
}`;
nstructjs.register(EaseCurve);


export class RandCurve extends SimpleCurveBase {
  constructor() {
    super();
    this.random = new util.MersenneRandom();
    this.seed = 0;
  }

  set seed(v) {
    this.random.seed(v);
    this._seed = v;
  }

  get seed() {
    return this._seed;
  }

  evaluate(t) {
    let r = this.random.random();
    let decay = this.params.decay + 1.0;
    let amp = this.params.amplitude;
    let in_mode = this.params.in_mode;

    if (in_mode) {
      t = 1.0 - t;
    }
    //r *= t;

    let d;

    //r *= 0.5;

    if (in_mode) {
      d = Math.exp(t*decay) / Math.exp(decay);
    } else {
      d = Math.exp(t*decay) / Math.exp(decay);
    }

    t = t + (r - t) * d;

    if (in_mode) {
      t = 1.0 - t;
    }

    return t;
  }

  static define() {return {
    params : {
      amplitude : ["Amplitude", 1.0, 0.01, 4.0],
      decay     : ["Decay", 1.0, 0.0, 5.0],
      in_mode   : ["In", true, BOOL_FLAG, BOOL_FLAG]
    },
    name   : "random",
    uiname : "Random"
  }}
}
CurveTypeData.register(RandCurve);
EaseCurve.STRUCT = nstructjs.inherit(RandCurve, SimpleCurveBase) + `
}`;
nstructjs.register(RandCurve);


