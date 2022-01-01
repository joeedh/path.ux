let _ScreenArea = undefined;

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ui from '../core/ui.js';
import * as ui_noteframe from '../widgets/ui_noteframe.js';
//import * as nstructjs from './struct.js';
import {haveModal} from '../path-controller/util/simple_events.js';

import '../path-controller/util/struct.js';

let UIBase = ui_base.UIBase;
let Vector2 = vectormath.Vector2;
let ScreenClass = undefined;

import {snap, snapi} from './FrameManager_mesh.js';


export function setScreenClass(cls) {
  ScreenClass = cls;
}

export function getAreaIntName(name) {
  let hash = 0;

  for (let i=0; i<name.length; i++) {
    let c = name.charCodeAt(i);

    if (i % 2 === 0) {
      hash += c<<8;
      hash *= 13;
      hash = hash & ((1<<15)-1);
    } else {
      hash += c;
    }
  }

  return hash;
}
//XXX get rid of me
window.getAreaIntName = getAreaIntName;

//XXX get rid of me
export var AreaTypes = {
  TEST_CANVAS_EDITOR : 0
};

export function setAreaTypes(def) {
  for (let k in AreaTypes) {
    delete AreaTypes[k];
  }

  for (let k in def) {
    AreaTypes[k] = def[k];
  }
}

export let areaclasses = {};
export class AreaWrangler {
  constructor() {
    this.stacks = {};
    this.lasts = {};
    this.lastArea = undefined;
    this.stack = [];
    this.idgen = 0;
    this._last_screen_id = undefined;
  }

  _checkWrangler(ctx) {
    if (ctx === undefined) {
      return true;
    }

    if (this._last_screen_id === undefined) {
      this._last_screen_id = ctx.screen._id;
      return true;
    }

    if (ctx.screen._id !== this._last_screen_id) {
      this.reset();

      this._last_screen_id = ctx.screen._id;
      console.warn("contextWrangler detected a new screen; new file?");
      return false;
    }

    return true;
  }

  reset() {
    this.stacks = {};
    this.lasts = {};
    this.lastArea = undefined;
    this.stack = [];
    this._last_screen_id = undefined;

    return this;
  }

  push(type, area, pushLastRef=true) {
    if (!(type.name in this.stacks)) {
      this.stacks[type.name] = [];
    }

    this.stacks[type.name].push(this.lasts[type.name]);

    if (pushLastRef || this.lasts[type.name] === undefined) {
      this.lasts[type.name] = area;
      this.lastArea = area;
    }

    this.stacks[type.name].push(area);
    this.stack.push(area);
  }

  updateLastRef(type, area) {
    this.lasts[type.name] = area;
    this.lastArea = area;
  }

  pop(type, area) {
    if (!(type.name in this.stacks)) {
      console.warn("pop_ctx_area called in error");
      //throw new Error("pop_ctx_area called in error");
      return;
    }

    if (this.stacks[type.name].length > 0) {
      this.stacks[type.name].pop();

      let last = this.stacks[type.name].pop();
      
      if (last) {
        this.lasts[type.name] = last;
      }
    }

    if (this.stack.length > 0) {
      this.stack.pop();
    }
  }

  getLastArea(type) {
    if (type === undefined) {
      if (this.stack.length > 0) {
        return this.stack[this.stack.length-1];
      } else {
        return this.lastArea;
      }
    } else {
      if (type.name in this.stacks) {
        let stack = this.stacks[type.name];

        if (stack.length > 0) {
          return stack[stack.length-1];
        }
      }

      return this.lasts[type.name];
    }
  }
}
