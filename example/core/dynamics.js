import {PropTypes, ToolProperty, Vector2, nstructjs, util} from "../pathux.js";

export const DynamicModes = {
  MULTIPLY : 1,
  REPLACE  : 2
};

export const PenKeys = {
  PRESSURE : 0,
  TILTX    : 1,
  TILTY    : 2
};

export class DynamicKey {
  constructor(key, min, max, exp, mode=DynamicModes.MULTIPLY, penkey=PenKeys.PRESSURE) {
    this.key = key;
    this.min = min;
    this.max = max;
    this.exp = exp;
    this.mode = mode;
    this.penkey = penkey;
  }

  copy() {
    return new DynamicKey(this.key, this.min, this.max, this.exp, this.mode, this.penkey);
  }
}
DynamicKey.STRUCT = `
DynamicKey {
  key    : string;
  min    : float;
  max    : float;
  exp    : float;
  mode   : int;
  penkey : int;
}
`;
nstructjs.register(DynamicKey);

export class Dynamics {
  constructor() {
    this.keys = [];
    this.keymap = {};
  }

  static makeDefault() {
    let ret = new Dynamics();
    let DK = DynamicKey;

    ret.addKey(new DK("brushSize"), 0.05, 1.0, 0.5, DynamicModes.MULTIPLY);
    ret.addKey(new DK("opacity"), 0.005, 1.0, 2.0, DynamicModes.MULTIPLY);

    return ret;
  }

  addKey(key) {
    this.keys.push(key);
    this.keymap[key.key] = key;
    return this;
  }

  clear() {
    this.keys = [];
    this.keymap = {};

    return this;
  }

  apply(key, value, dynamic_state) {
    if (!(key in this.keymap)) {
      return value;
    }

    let channel = this.keymap[key];

    let ds = dynamic_state;
    let data;

    switch (channel.penkey) {
      case PenKeys.PRESSURE:
        data = ds.pressure;
        break;
      case PenKeys.TILTX:
        data = ds.tilt[0];
        break;
      case PenKeys.TILTY:
        data = ds.tile[1];
        break;
      default:
        throw new Error("invalid pen key " + channel.penkey);
    }

    switch (channel.mode) {
      case DynamicModes.MULTIPLY:
        value *= data;
        break;
      case DynamicModes.REPLACE:
        value = data;
        break;
      default:
        throw new Error("unknown dynamics channel mode " + channel.mode);
    }

    data = Math.pow(data, channel.exp);

    return value;
  }

  copy() {
    return new Dynamics().load(this);
  }

  load(b) {
    if (!b)
      return this;

    this.clear();

    for (let key of b.keys) {
      this.addKey(key.copy());
    }
    return this;
  }

  loadSTRUCT(reader) {
    reader(this);

    for (let key of this.keys) {
      this.keymap[key.key] = key;
    }
  }
}
Dynamics.STRUCT = `
Dynamics {
  keys : array(abstract(DynamicKey));
}
`;
nstructjs.register(Dynamics);


export class DynamicsState {
  constructor(pressure=1.0, tiltx=0.0, tilty=0.0) {
    this.pressure = pressure;
    this.tilt = new Vector2([tiltx, tilty]);
  }

  interp(b, t) {
    this.pressure += (b.pressure - this.pressure)*t;
    this.tilt.interp(b.tilt, t);
    return this;
  }

  load(b) {
    if (!b)
      return this;

    this.pressure = b.pressure;
    this.tilt = b.tilt.copy();

    return this;
  }

  copy() {
    return new DynamicsState().load(this);
  }
}

DynamicsState.STRUCT = `
DynamicsState {
  pressure : float;
  tilt     : vec2;
}
`;
nstructjs.register(DynamicsState);

//find free bit in PropTypes
let i = 21;
while (i < 45) {
  let ok = true;
  let bit = 1<<i;
  for (let k in PropTypes) {
    if (PropTypes[k] === bit) {
      ok = false;
      break;
    }
  }

  if (ok) {
    PropTypes.DYNAMICS = (1<<i);
    PropTypes.DYNAMICS_STATE = (1<<(i+1));
    break;
  }
}

export class DynamicsProperty extends ToolProperty {
  constructor(value=Dynamics.makeDefault()) {
    super(PropTypes.DYNAMICS);

    this.data = new Dynamics(value);
  }

  getValue() {
    return this.data;
  }

  setValue(val) {
    this.data.load(val);
    super.setValue(val);

    return this;
  }

  copyTo(b) {
    super.copyTo(b);

    b.data.load(this.data);
  }
}


export class DynamicsStateProperty extends ToolProperty {
  constructor(value) {
    super(PropTypes.DYNAMICS);

    this.data = new DynamicsState();

    if (value) {
      this.data.load(value);
    }
  }

  getValue() {
    return this.data;
  }

  setValue(val) {
    this.data.load(val);
    super.setValue(val);

    return this;
  }

  copyTo(b) {
    super.copyTo(b);

    b.data.load(this.data);
  }
}
