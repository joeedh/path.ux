import {PropTypes, ToolProperty, Vector2, nstructjs} from "../pathux.js";

export const DynamicModes = {
  MULTIPLY : 1,
  REPLACE  : 2
};

export const PenKeys = {
  PRESSURE : 0,
  TILTX    : 1,
  TILTY    : 2
};

// PropTypes is a readonly bitmask map; the example adds two app-specific property
// types to it at runtime, so use an extended view for the new members.
const PropTypesExt = PropTypes as typeof PropTypes & {
  DYNAMICS: number;
  DYNAMICS_STATE: number;
};

export class DynamicKey {
  static STRUCT: string;

  key: string;
  min: number;
  max: number;
  exp: number;
  mode: number;
  penkey: number;

  constructor(
    key: string,
    min: number,
    max: number,
    exp: number,
    mode = DynamicModes.MULTIPLY,
    penkey = PenKeys.PRESSURE
  ) {
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
  static STRUCT: string;

  keys: DynamicKey[];
  keymap: Record<string, DynamicKey>;

  constructor() {
    this.keys = [];
    this.keymap = {};
  }

  static makeDefault() {
    const ret = new Dynamics();
    const DK = DynamicKey;

    // BUG FIX: these previously called `addKey(new DK("brushSize"), 0.05, 1.0, ...)`,
    // which (a) constructed a DynamicKey with only its `key` arg (min/max/exp undefined)
    // and (b) passed the remaining numbers to addKey, which ignores extra args. The
    // intent was a single fully-specified key per channel.
    ret.addKey(new DK("brushSize", 0.05, 1.0, 0.5, DynamicModes.MULTIPLY));
    ret.addKey(new DK("opacity", 0.005, 1.0, 2.0, DynamicModes.MULTIPLY));

    return ret;
  }

  addKey(key: DynamicKey) {
    this.keys.push(key);
    this.keymap[key.key] = key;
    return this;
  }

  clear() {
    this.keys = [];
    this.keymap = {};

    return this;
  }

  apply(key: string, value: number, dynamic_state: DynamicsState) {
    if (!(key in this.keymap)) {
      return value;
    }

    const channel = this.keymap[key];

    const ds = dynamic_state;
    let data: number;

    switch (channel.penkey) {
      case PenKeys.PRESSURE:
        data = ds.pressure;
        break;
      case PenKeys.TILTX:
        data = ds.tilt[0];
        break;
      case PenKeys.TILTY:
        // BUG FIX: was `ds.tile[1]` (typo); the field is `tilt`.
        data = ds.tilt[1];
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

  load(b: Dynamics | undefined) {
    if (!b)
      return this;

    this.clear();

    for (const key of b.keys) {
      this.addKey(key.copy());
    }
    return this;
  }

  loadSTRUCT(reader: (obj: this) => void) {
    reader(this);

    for (const key of this.keys) {
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
  static STRUCT: string;

  pressure: number;
  tilt: Vector2;

  constructor(pressure = 1.0, tiltx = 0.0, tilty = 0.0) {
    this.pressure = pressure;
    this.tilt = new Vector2([tiltx, tilty]);
  }

  interp(b: DynamicsState, t: number) {
    this.pressure += (b.pressure - this.pressure)*t;
    this.tilt.interp(b.tilt, t);
    return this;
  }

  load(b: DynamicsState | undefined) {
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
const i = 21;
while (i < 45) {
  let ok = true;
  const bit = 1<<i;
  for (const k in PropTypes) {
    if ((PropTypes as Record<string, number>)[k] === bit) {
      ok = false;
      break;
    }
  }

  if (ok) {
    PropTypesExt.DYNAMICS = (1<<i);
    PropTypesExt.DYNAMICS_STATE = (1<<(i+1));
    break;
  }
}

export class DynamicsProperty extends ToolProperty<Dynamics> {
  constructor(value = Dynamics.makeDefault()) {
    super(PropTypesExt.DYNAMICS);

    // BUG FIX: was `new Dynamics(value)`, but Dynamics' constructor takes no args, so
    // the supplied value was discarded. Load the value into a fresh Dynamics instead.
    this.data = new Dynamics().load(value);
  }

  getValue() {
    return this.data;
  }

  setValue(val: Dynamics) {
    this.data.load(val);
    super.setValue(val);

    return this;
  }

  copyTo(b: this) {
    super.copyTo(b);

    b.data.load(this.data);
  }
}


export class DynamicsStateProperty extends ToolProperty<DynamicsState> {
  constructor(value?: DynamicsState) {
    super(PropTypesExt.DYNAMICS);

    this.data = new DynamicsState();

    if (value) {
      this.data.load(value);
    }
  }

  getValue() {
    return this.data;
  }

  setValue(val: DynamicsState) {
    this.data.load(val);
    super.setValue(val);

    return this;
  }

  copyTo(b: this) {
    super.copyTo(b);

    b.data.load(this.data);
  }
}
