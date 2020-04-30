import * as util from './util.js';

/*
see doc_src/context.md
*/

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

export const excludedKeys = new Set(["onRemove", "reset", "toString",
  "valueOf", "copy", "next", "save", "load", "clear", "hasOwnProperty",
  "toLocaleString", "constructor", "propertyIsEnumerable", "isPrototypeOf"]);

export class LockedContext {
  constructor(ctx) {
    this.props = {};

    this.load(ctx);
  }

  load(ctx) {
    let keys = util.getAllKeys(ctx);

    for (let k of keys) {
      let v;

      try {
        v = ctx[k];
      } catch (error) {
        console.warn("failed to look up property in context: ", k);
        continue;
      }


    }
  }
}

let next_key = {};
let idgen = 1;

export class Context {
  constructor() {
    this._stack = [];
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
    let ret = new this.constructor();

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

  ensureProperty(name) {
    if (this.hasOwnProperty(name)) {
      return;
    }

    let inside_map = {};

    Object.defineProperty(this, name, {
      get : function() {
        let stack = this._stack;

        if (DEBUG.contextSystem) {
          console.log(name, inside_map);
        }

        for (let i=stack.length-1; i >= 0; i--) {
          let overlay = stack[i];
          let ret = next_key;

          if (DEBUG.contextSystem) {
            console.log(overlay[Symbol.ContextID], overlay);
          }

          if (inside_map[overlay[Symbol.ContextID]]) {
            continue;
          }

          if (overlay.__allKeys.has(name)) {
            if (DEBUG.contextSystem) {
              console.log("getting value");
            }

            inside_map[overlay[Symbol.ContextID]] = 1;

            try {
              ret = overlay[name];
            } catch (error) {
              inside_map[overlay[Symbol.ContextID]] = 0;
              throw error;
            }

            inside_map[overlay[Symbol.ContextID]] = 0;
          }

          if (ret !== next_key) {
            return ret;
          }
        }
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
