"use strict";

/*FIXME: not sure this works anymore*/
import {nstructjs} from "../struct.js";
import {Icons} from "../icon_enum.js";

import * as util from '../util.js';
//import * as ui_base from './ui_base.js';
import * as vectormath from '../vectormath.js';
import {EventDispatcher} from "../events.js";

var Vector2 = vectormath.Vector2;

import './curve1d_basic.js';
import './curve1d_bspline.js';

export function mySafeJSONStringify(obj) {
  return JSON.stringify(obj.toJSON(), function(key) {
    let v = this[key];

    if (typeof v === "number") {
      if (v !== Math.floor(v)) {
        v = parseFloat(v.toFixed(5));
      } else {
        v = v;
      }
    }

    return v;
  });
}
export function mySafeJSONParse(buf) {
  return JSON.parse(buf, (key, val) => {

  });
};

window.mySafeJSONStringify = mySafeJSONStringify;

export {CurveConstructors, CURVE_VERSION} from './curve1d_base.js';
import {CurveConstructors, CURVE_VERSION} from './curve1d_base.js';

export class Curve1D extends EventDispatcher {
  constructor() {
    super();

    this.generators = [];
    this.VERSION = CURVE_VERSION;

    for (let gen of CurveConstructors) {
      gen = new gen();

      gen.parent = this;
      this.generators.push(gen);
    }

    this.generators.active = this.generators[0];
  }

  get generatorType() {
    return this.generators.active ? this.generators.active.type : undefined;
  }

  load(b) {
    if (b === undefined) {
      return;
    }

    let buf1 = mySafeJSONStringify(b);
    let buf2 = mySafeJSONStringify(this);

    if (buf1 === buf2) {
      return;
    }

    this.loadJSON(JSON.parse(buf1));
    this._on_change();
    this.redraw();

    return this;
  }

  copy() {
    let ret = new Curve1D();
    ret.loadJSON(JSON.parse(mySafeJSONStringify(this)));
    return ret;
  }

  _on_change() {

  }

  redraw() {
    this._fireEvent("draw", this);
  }

  setGenerator(type) {
    for (let gen of this.generators) {
      if (gen.type === type || gen.constructor.name === type || gen.constructor === type) {
        if (this.generators.active) {
          this.generators.active.onInactive();
        }

        this.generators.active = gen;
        gen.onActive();

        return;
      }
    }

    throw new Error("unknown curve type" + type);
  }

  get fastmode() {
    return this._fastmode;
  }

  set fastmode(val) {
    this._fastmode = val;

    for (let gen of this.generators) {
      gen.fastmode = val;
    }
  }

  toJSON() {
    let ret = {
      generators       : [],
      VERSION          : this.VERSION,
      active_generator : this.generatorType
    };

    for (let gen of this.generators) {
      ret.generators.push(gen.toJSON());
    }

    return ret;
  }

  getGenerator(type) {
    for (let gen of this.generators) {
      if (gen.type === type) {
        return gen;
      }
    }

    throw new Error("Unknown generator " + type + ".");
  }

  switchGenerator(type) {
    let gen = this.getGenerator(type);

    if (gen !== this.generators.active) {
      let old = this.generators.active;

      this.generators.active = gen;

      old.onInactive(this);
      gen.onActive(this);
    }

    return gen;
  }

  equals(b) {
    //console.log(mySafeJSONStringify(this));
    //console.log(mySafeJSONStringify(b));

    let a = mySafeJSONStringify(this).trim();
    let b2 = mySafeJSONStringify(b).trim();

    if (a !== b2) {
      console.log(a);
      console.log(b2);
    }

    return a === b2;
  }

  destroy() {
    return this;
  }

  loadJSON(obj) {
    this.VERSION = obj.VERSION;

    //this.generators = [];
    for (let gen of obj.generators) {
      let gen2 = this.getGenerator(gen.type);
      gen2.parent = undefined;
      gen2.reset();
      gen2.loadJSON(gen);
      gen2.parent = this;

      if (gen.type === obj.active_generator) {
        this.generators.active = gen2;
      }

      //this.generators.push(gen2);
    }

    return this;
  }

  evaluate(s) {
    return this.generators.active.evaluate(s);
  }

  derivative(s) {
    return this.generators.active.derivative(s);
  }

  derivative2(s) {
    return this.generators.active.derivative2(s);
  }

  inverse(s) {
    return this.generators.active.inverse(s);
  }

  reset() {
    this.generators.active.reset();
  }

  update() {
    return this.generators.active.update();
  }

  draw(canvas, g, draw_transform) {
    var w=canvas.width, h=canvas.height;

    g.save();

    let sz = draw_transform[0], pan = draw_transform[1];

    g.beginPath();
    g.moveTo(-1, 0);
    g.lineTo(1, 0);
    g.strokeStyle = "red";
    g.stroke();

    g.beginPath();
    g.moveTo(0, -1);
    g.lineTo(0, 1);
    g.strokeStyle = "green";
    g.stroke();

    //g.rect(0, 0, 1, 1);
    //g.fillStyle = "rgb(50, 50, 50)";
    //g.fill();

    var f=0, steps=64;
    var df = 1/(steps-1);
    var w = 6.0/sz;

    let curve = this.generators.active;

    g.beginPath();
    for (var i=0; i<steps; i++, f += df) {
      var val = curve.evaluate(f);

      (i==0 ? g.moveTo : g.lineTo).call(g, f, val, w, w);
    }

    g.strokeStyle = "grey";
    g.stroke();

    if (this.overlay_curvefunc !== undefined) {
      g.beginPath();
      f = 0.0;

      for (var i=0; i<steps; i++, f += df) {
        var val = this.overlay_curvefunc(f);

        (i==0 ? g.moveTo : g.lineTo).call(g, f, val, w, w);
      }

      g.strokeStyle = "green";
      g.stroke();
    }

    this.generators.active.draw(canvas, g, draw_transform);

    g.restore();
    return this;
  }

  loadSTRUCT(reader) {
    this.generators = [];
    reader(this);

    console.log("VERSION", this.VERSION);

    if (this.VERSION <= 0.75) {
      this.generators = [];
      for (let cls of CurveConstructors) {
        this.generators.push(new cls());
      }

      this.generators.active = this.getGenerator("BSplineCurve");
    }

    console.log("ACTIVE", this._active);

    for (let gen of this.generators) {
      if (gen.type === this._active) {
        console.log("found active", this._active);
        this.generators.active = gen;
      }
    }

    delete this._active;
  }
}

Curve1D.STRUCT = `
Curve1D {
  generators  : array(abstract(CurveTypeData));
  _active     : string | obj.generators.active.type;
  VERSION     : float;
}
`;
nstructjs.register(Curve1D);

