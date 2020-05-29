import * as util from '../util/util.js';

import cconst from '../config/const.js';
import * as ui_noteframe from "../widgets/ui_noteframe.js";

/*
see doc_src/context.md
*/
window.ccosnt = cconst;

export const ContextFlags = {
  IS_VIEW : 1
};

class InheritFlag {
  constructor(data) {
    this.data = data;
  }
}

let __idgen = 1;

if (Symbol.ContextID === undefined) {
  Symbol.ContextID = Symbol("ContextID");
}

if (Symbol.CachedDef === undefined) {
  Symbol.CachedDef = Symbol("CachedDef");
}

const _ret_tmp = [undefined];

export const OverlayClasses = [];

export class ContextOverlay {
  constructor(appstate) {
    this.ctx = undefined; //owning context
    this._state = appstate;
  }

  get state() {
    return this._state;
  }

  onRemove(have_new_file=false) {
  }

  copy() {
    return new this.constructor(this._state);
  }

  validate() {
    throw new Error("Implement me!");
  }


  //base classes override this
  static contextDefine() {
    throw new Error("implement me!");
    return {
      name   :   "",
      flag   :   0
    }
  }

  //don't override this
  static resolveDef() {
    if (this.hasOwnProperty(Symbol.CachedDef)) {
      return this[Symbol.CachedDef];
    }

    let def2 = Symbol.CachedDef = {};

    let def = this.contextDefine();

    if (def === undefined) {
      def = {};
    }

    for (let k in def) {
      def2[k] = def[k];
    }

    if (!("flag") in def) {
      def2.flag = Context.inherit(0);
    }

    let parents = [];
    let p = util.getClassParent(this);

    while (p && p !== ContextOverlay) {
      parents.push(p);
      p = util.getClassParent(p);
    }

    if (def2.flag instanceof InheritFlag) {
      let flag = def2.flag.data;
      for (let p of parents) {
        let def = p.contextDefine();

        if (!def.flag) {
          continue;
        }else if (def.flag instanceof InheritFlag) {
          flag |= def.flag.data;
        } else {
          flag |= def.flag;
          //don't go past non-inheritable parents
          break;
        }
      }

      def2.flag = flag;
    }

    return def2;
  }
}

export const excludedKeys = new Set(["onRemove", "reset", "toString", "_fix",
  "valueOf", "copy", "next", "save", "load", "clear", "hasOwnProperty",
  "toLocaleString", "constructor", "propertyIsEnumerable", "isPrototypeOf",
  "state", "saveProperty", "loadProperty", "getOwningOverlay", "_props"]);

export class LockedContext {
  constructor(ctx) {
    this.props = {};

    this.state = ctx.state;
    this.api = ctx.api;
    this.toolstack = ctx.toolstack;

    this.load(ctx);
  }

  toLocked() {
    //just return itself
    return this;
  }

  error() {
    return this.ctx.error(...arguments);
  }
  warning() {
    return this.ctx.warning(...arguments);
  }
  message() {
    return this.ctx.message(...arguments);
  }
  progbar() {
    return this.ctx.progbar(...arguments);
  }

  load(ctx) {
    //let keys = util.getAllKeys(ctx);
    let keys = ctx._props;

    function wrapget(name) {
      return function(ctx2, data) {
        return ctx.loadProperty(ctx2, name, data);
      }
    }

    for (let k of keys) {
      let v;
      if (k === "state" || k === "toolstack" || k === "api") {
        continue;
      }

      if (typeof k === "string" && (k.endsWith("_save") || k.endsWith("_load"))) {
        continue;
      }

      try {
        v = ctx[k];
      } catch (error) {
        if (cconst.DEBUG.contextSystem) {
          console.warn("failed to look up property in context: ", k);
        }
        continue;
      }

      let data, getter;
      let overlay = ctx.getOwningOverlay(k);

      if (overlay === undefined) {
        //property must no longer be used?
        continue;
      }

      try {
        if (typeof k === "string" && (overlay[k + "_save"] && overlay[k + "_load"])) {
          data = overlay[k + "_save"]();
          getter = overlay[k + "_load"];
        } else {
          data = ctx.saveProperty(k);
          getter = wrapget(k);
        }
      } catch (error) {
        //util.print_stack(error);
        console.warn("Failed to save context property", k);
        continue;
      }

      this.props[k] = {
        data : data,
        get  : getter
      };
    }

    let defineProp = (name) => {
      Object.defineProperty(this, name, {
        get : function() {
          let def = this.props[name];
          return def.get(this.ctx, def.data)
        }
      })
    };

    for (let k in this.props) {
      defineProp(k);
    }

    this.ctx = ctx;
  }

  setContext(ctx) {
    this.ctx = ctx;

    this.state = ctx.state;
    this.api = ctx.api;
    this.toolstack = ctx.toolstack;
  }
}

let next_key = {};
let idgen = 1;

export class Context {
  constructor(appstate) {
    this.state = appstate;

    this._props = new Set();
    this._stack = [];
    this._inside_map = {};
  }

  //chrome's debug console is weirdly messing with this
  _fix() {
    this._inside_map = {};
  }

  error(message, timeout=1500) {
    let state = this.state;

    console.warn(message);

    if (state && state.screen) {
      return ui_noteframe.error(state.screen, message, timeout);
    }
  }

  warning(message, timeout=1500) {
    let state = this.state;

    console.warn(message);

    if (state && state.screen) {
      return ui_noteframe.warning(state.screen, message, timeout);
    }
  }

  message(msg, timeout=1500) {
    let state = this.state;

    console.warn(msg);

    if (state && state.screen) {
      return ui_noteframe.message(state.screen, msg, timeout);
    }
  }

  progbar(msg, perc=0.0, timeout=1500, id=msg) {
    let state = this.state;

    if (state && state.screen) {
      //progbarNote(screen, msg, percent, color, timeout) {
      return ui_noteframe.progbarNote(state.screen, msg, perc, "green", timeout, id);
    }
  }

  validateOverlays() {
    let stack = this._stack;
    let stack2 = [];

    for (let i=0; i<stack.length; i++) {
      if (stack[i].validate()) {
        stack2.push(stack[i]);
      }
    }

    this._stack = stack2;
  }

  hasOverlay(cls) {
    return this.getOverlay(cls) !== undefined;
  }

  getOverlay(cls) {
    for (let overlay of this._stack) {
      if (overlay.constructor === cls) {
        return overlay;
      }
    }
  }

  clear(have_new_file=false) {
    for (let overlay of this._stack) {
      overlay.onRemove(have_new_file);
    }

    this._stack = [];
  }

  //this is implemented by child classes
  //it should load the same default overlays as in constructor
  reset(have_new_file=false) {
    this.clear(have_new_file);
  }

  //returns a new context with overriden properties
  //unlike pushOverlay, overrides can be a simple object
  override(overrides) {
    if (overrides.copy === undefined) {
      overrides.copy = function() {
        return Object.assign({}, this);
      }
    }

    let ctx = this.copy();
    ctx.pushOverlay(overrides);
    return ctx;
  }

  copy() {
    let ret = new this.constructor(this.state);

    for (let item of this._stack) {
      ret.pushOverlay(item.copy());
    }

    return ret;
  }

  /**
   Used by overlay property getters.  If returned,
   the next overlay in the struct will have its getter used.

   Example:

   class overlay {
      get scene() {
        if (some_reason) {
          return Context.super();
        }

        return something_else;
      }
    }
   */
  static super() {
    return next_key;
  }

  /**
   *
   * saves a property into some kind of non-object-reference form
   *
   * */
  saveProperty(key) {
    console.warn("Missing saveProperty implementation in Context; passing through values...")
    return this[key];
  }

  /**
   *
   * lookup property based on saved data
   *
   * */
  loadProperty(ctx, key, data) {
    console.warn("Missing loadProperty implementation in Context; passing through values...")
    return data;
  }

  getOwningOverlay(name, _val_out) {
    let inside_map = this._inside_map;
    let stack = this._stack;

    if (cconst.DEBUG.contextSystem) {
      console.log(name, inside_map);
    }

    for (let i=stack.length-1; i >= 0; i--) {
      let overlay = stack[i];
      let ret = next_key;
      
      if (overlay[Symbol.ContextID] === undefined) {
        throw new Error("context corruption");
      }
      
      let ikey = overlay[Symbol.ContextID];
      
      if (cconst.DEBUG.contextSystem) {
        console.log(ikey, overlay);
      }

      //prevent infinite recursion
      if (inside_map[ikey]) {
        continue;
      }

      if (overlay.__allKeys.has(name)) {
        if (cconst.DEBUG.contextSystem) {
          console.log("getting value");
        }

        //Chrome's console messes this up

        inside_map[ikey] = 1;

        try {
          ret = overlay[name];
        } catch (error) {

          inside_map[ikey] = 0;
          throw error;
        }

        inside_map[ikey] = 0;
      }

      if (ret !== next_key) {
        if (_val_out !== undefined) {
          _val_out[0] = ret;
        }
        return overlay;
      }
    }

    if (_val_out !== undefined) {
      _val_out[0] = undefined;
    }

    return undefined;
  }

  ensureProperty(name) {
    if (this.hasOwnProperty(name)) {
      return;
    }

    this._props.add(name);

    Object.defineProperty(this, name, {
      get : function() {
        let ret = _ret_tmp;
        _ret_tmp[0] = undefined;

        this.getOwningOverlay(name, ret);
        return ret[0];
      }, set : function() {
        throw new Error("Cannot set ctx properties")
      }
    })
  }

  /**
   * Returns a new context that doesn't
   * contain any direct object references
   * except for .state .datalib and .api, but
   * instead uses those three to look up references
   * on property access.
   * */
  toLocked() {
    return new LockedContext(this);
  }

  pushOverlay(overlay) {
    if (!overlay.hasOwnProperty(Symbol.ContextID)) {
      overlay[Symbol.ContextID] = idgen++;
    }

    let keys = new Set();
    for (let key of util.getAllKeys(overlay)) {
      if (!excludedKeys.has(key) && !(typeof key === "string" && key[0] === "_")) {
        keys.add(key);
      }
    }

    overlay.ctx = this;

    if (overlay.__allKeys === undefined) {
      overlay.__allKeys = keys;
    }

    for (let k of keys) {
      let bad = typeof k === "symbol" || excludedKeys.has(k);
      bad = bad || (typeof k === "string" && k[0] === "_");
      bad = bad || (typeof k === "string" && k.endsWith("_save"));
      bad = bad || (typeof k === "string" && k.endsWith("_load"));

      if (bad) {
        continue;
      }

      this.ensureProperty(k);
    }

    if (this._stack.indexOf(overlay) >= 0) {
      console.warn("Overlay already added once");
      if (this._stack[this._stack.length-1] === overlay) {
        console.warn("  Definitely an error, overlay is already at top of stack");
        return;
      }
    }

    this._stack.push(overlay);
  }

  popOverlay(overlay) {
    if (overlay !== this._stack[this._stack.length-1]) {
      console.warn("Context.popOverlay called in error", overlay);
      return;
    }

    overlay.onRemove();
    this._stack.pop();
  }

  removeOverlay(overlay) {
    if (this._stack.indexOf(overlay) < 0) {
      console.warn("Context.removeOverlay called in error", overlay);
      return;
    }

    overlay.onRemove();
    this._stack.remove(overlay);
  }

  static inherit(data) {
    return new InheritFlag(data);
  }

  static register(cls) {
    if (cls[Symbol.ContextID]) {
      console.warn("Tried to register same class twice:", cls);
      return;
    }

    cls[Symbol.ContextID] = __idgen++;
    OverlayClasses.push(cls);
  }
}

export function test() {
  function testInheritance() {
    class Test0 extends ContextOverlay {
      static contextDefine() {
        return {
          flag: 1
        }
      }
    }

    class Test1 extends Test0 {
      static contextDefine() {
        return {
          flag: 2
        }
      }
    }

    class Test2 extends Test1 {
      static contextDefine() {
        return {
          flag: Context.inherit(4)
        }
      }
    }

    class Test3 extends Test2 {
      static contextDefine() {
        return {
          flag: Context.inherit(8)
        }
      }
    }

    class Test4 extends Test3 {
      static contextDefine() {
        return {
          flag: Context.inherit(16)
        }
      }
    }

    return Test4.resolveDef().flag === 30;
  }

  return testInheritance();
}

if (!test()) {
  throw new Error("Context test failed");
}
