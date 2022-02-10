let _ScreenArea = undefined;

import * as util from '../path-controller/util/util.js';
import * as vectormath from '../path-controller/util/vectormath.js';
import * as ui_base from '../core/ui_base.js';
import * as ui from '../core/ui.js';
import * as ui_noteframe from '../widgets/ui_noteframe.js';
//import * as nstructjs from './struct.js';
import {haveModal, _setModalAreaClass} from '../path-controller/util/simple_events.js';

import '../path-controller/util/struct.js';

let UIBase = ui_base.UIBase;
let Vector2 = vectormath.Vector2;
let ScreenClass = undefined;

import {ClassIdSymbol} from '../core/ui_base.js';
import {snap, snapi} from './FrameManager_mesh.js';


export function setScreenClass(cls) {
  ScreenClass = cls;
}

export function getAreaIntName(name) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    let c = name.charCodeAt(i);

    if (i%2 === 0) {
      hash += c<<8;
      hash *= 13;
      hash = hash & ((1<<15) - 1);
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
  TEST_CANVAS_EDITOR: 0
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

/*hackish! store ref an active wrangler so simple_event's modal
* system can lock it!*/
let theWrangler = undefined;

export class AreaWrangler {
  constructor() {
    this.stacks = new Map();
    this.lasts = new Map();
    this.lastArea = undefined;
    this.stack = [];
    this.idgen = 0;
    this.locked = 0;
    this._last_screen_id = undefined;
    theWrangler = this;
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
    theWrangler = this;
    this.stacks = new Map();
    this.lasts = new Map();
    this.lastArea = undefined;
    this.stack = [];
    this.locked = 0;
    this._last_screen_id = undefined;

    return this;
  }

  static findInstance() {
    return theWrangler;
  }

  static lock() {
    return this.findInstance().lock();
  }

  static unlock() {
    return this.findInstance().unlock();
  }

  lock() {
    this.locked++;
    return this;
  }

  unlock() {
    this.locked = Math.max(this.locked - 1, 0);
    return this;
  }

  push(type, area, pushLastRef = true) {
    theWrangler = this;

    if (haveModal() || this.locked) {
      pushLastRef = false;
    }

    if (pushLastRef || !this.lasts.has(type[ClassIdSymbol])) {
      this.lasts.set(type[ClassIdSymbol], area);
      this.lastArea = area;
    }

    let stack = this.stacks.get(type[ClassIdSymbol]);
    if (stack === undefined) {
      stack = [];
      this.stacks.set(type[ClassIdSymbol], stack);
    }

    let last = this.lasts.get(type[ClassIdSymbol]);

    if (this.locked) {
      //to ensure stack semantics don't get messed up,
      //we push the active area on top of the stack

      area = last;
    }

    stack.push(last);
    stack.push(area);

    this.stack.push(area);
  }

  updateLastRef(type, area) {
    theWrangler = this;

    if ((this.locked || haveModal()) && this.lasts.has(type[ClassIdSymbol])) {
      return;
    }

    this.lasts.set(type[ClassIdSymbol], area);
    this.lastArea = area;
  }

  pop(type, area) {
    let stack = this.stacks.get(type[ClassIdSymbol]);

    if (stack === undefined) {
      console.warn("pop_ctx_area called in error");
      //throw new Error("pop_ctx_area called in error");
      return;
    }

    if (stack.length > 0) {
      stack.pop();
      let last = stack.pop();

      /* paranoia isConnected check to ensure stale elements don't
       * pollute the lasts stack */
      if (!this.locked && last && last.isConnected) {
        this.lasts.set(type[ClassIdSymbol], last);
      }
    } else {
      console.error("pop_ctx_area called in error");
    }

    if (this.stack.length > 0) {
      this.stack.pop();
    }
  }

  getLastArea(type) {
    //if (Math.random() > 0.9995) {
      //console.warn("getLastArea!", type, this.lasts.get(type[ClassIdSymbol]));
    //}

    if (type === undefined) {
      if (this.stack.length > 0) {
        return this.stack[this.stack.length - 1];
      } else {
        return this.lastArea;
      }
    } else {
      if (this.locked) {
        if (this.lastArea && this.lastArea instanceof type) {
          return this.lastArea;
        }

        let area = this.lasts.get(type[ClassIdSymbol]);

        if (area) {
          return area;
        }
      }

      if (this.stacks.has(type[ClassIdSymbol])) {
        let stack = this.stacks.get(type[ClassIdSymbol]);

        if (stack.length > 0) {
          return stack[stack.length - 1];
        }
      }

      return this.lasts.get(type[ClassIdSymbol]);
    }
  }
}
_setModalAreaClass(AreaWrangler);
