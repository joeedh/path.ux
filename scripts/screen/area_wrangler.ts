//import * as nstructjs from './struct.js';
import { haveModal, _setModalAreaClass } from "../path-controller/util/simple_events.js";
import * as util from "../path-controller/util/util.js";

import "../path-controller/util/struct.js";

import { ClassIdSymbol } from "../core/ui_consts.js";
import type { Area, AreaConstructor } from "./ScreenArea.js";
import { IContextBase } from "../core/context_base.js";

export function getAreaIntName(name: string) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);

    if (i % 2 === 0) {
      hash += c << 8;
      hash *= 13;
      hash = hash & ((1 << 15) - 1);
    } else {
      hash += c;
    }
  }

  return hash;
}

//XXX get rid of me
type AreaTypes = { [key: string]: number };
export const AreaTypes: AreaTypes = {};

export function setAreaTypes(def: AreaTypes) {
  for (const k in AreaTypes) {
    delete AreaTypes[k];
  }

  for (const k in def) {
    AreaTypes[k] = def[k];
  }
}

export const areaclasses: { [key: string]: typeof Area } = {};

/*hackish! store ref to an active wrangler so simple_event's modal
 * system can lock it!*/
let theWrangler: AreaWrangler | undefined = undefined;
type AreaID = string

export class AreaWrangler<CTX extends IContextBase = IContextBase> {
  stacks = new Map<AreaID, Area[]>();
  lasts = new Map<AreaID, Area>();
  lastArea?: Area
  stack: Area[] = [];
  idgen = 0;
  locked = 0;
  _last_screen_id: unknown = undefined;

  constructor() {
    theWrangler = this;
  }

  /*Yeek this is particularly evil, it creates a context
   * that can be used by popups with the original context
   * area stack intact of the elements that spawned them.*/
  makeSafeContext(ctx: CTX) {
    const wrangler = this.copy();

    return new Proxy(ctx, {
      get(target: any, key: string, rec) {
        wrangler.copyTo(contextWrangler);
        return target[key];
      },
    }) as CTX;
  }

  copyTo(ret: this) {
    for (const [key, stack1] of this.stacks) {
      ret.stacks.set(key, Array.from(stack1));
    }

    for (const [key, val] of this.lasts) {
      ret.lasts.set(key, val);
    }

    ret.stack = Array.from(this.stack);
    ret.lastArea = this.lastArea;
  }

  copy() {
    const ret = new AreaWrangler();
    this.copyTo(ret as this);
    return ret;
  }

  _checkWrangler(ctx?: CTX) {
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
    return this.findInstance()?.lock();
  }

  static unlock() {
    return this.findInstance()?.unlock();
  }

  lock() {
    this.locked++;
    return this;
  }

  unlock() {
    this.locked = Math.max(this.locked - 1, 0);
    return this;
  }

  push(type: AreaConstructor, area: Area, pushLastRef = true) {
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

    const last = this.lasts.get(type[ClassIdSymbol])!;

    stack.push(last);
    stack.push(area);

    this.stack.push(area);
  }

  updateLastRef(type: AreaConstructor, area: Area) {
    theWrangler = this;

    if ((this.locked || haveModal()) && this.lasts.has(type[ClassIdSymbol])) {
      return;
    }

    this.lasts.set(type[ClassIdSymbol], area);
    this.lastArea = area;
  }

  pop(type: AreaConstructor, area?: Area) {
    const stack = this.stacks.get(type[ClassIdSymbol]);

    if (stack === undefined) {
      console.warn("pop_ctx_area called in error");
      //throw new Error("pop_ctx_area called in error");
      return;
    }

    if (stack.length > 0) {
      stack.pop();
      const last = stack.pop();

      /* paranoia isConnected check to ensure stale elements don't
       * pollute the lasts stack */
      if (!this.locked && last?.isConnected) {
        this.lasts.set(type[ClassIdSymbol], last);
      }
    } else {
      console.error("pop_ctx_area called in error");
    }

    if (this.stack.length > 0) {
      this.stack.pop();
    }
  }

  getLastArea(type?: AreaConstructor) {
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
      if (this.stacks.has(type[ClassIdSymbol])) {
        const stack = this.stacks.get(type[ClassIdSymbol])!;

        if (stack.length > 0) {
          return stack[stack.length - 1];
        }
      }

      return this.lasts.get(type[ClassIdSymbol]);
    }
  }
}
_setModalAreaClass(AreaWrangler);

export const contextWrangler = new AreaWrangler();
