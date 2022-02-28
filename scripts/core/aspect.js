let exclude = new Set([
  "toString", "constructor", "prototype", "__proto__", "toLocaleString",
  "hasOwnProperty", "shadow"
]);

let UIBase = undefined;

//deal with circular module refrence
export function _setUIBase(uibase) {
  UIBase = uibase;
}

let AspectKeys = Symbol("aspect-keys");

export function initAspectClass(object, blacklist = new Set()) {
  let cls = object.constructor;

  if (!cls[AspectKeys]) {
    cls[AspectKeys] = [];
    let keys = [];

    let p = object.__proto__;
    while (p) {
      keys = keys.concat(Reflect.ownKeys(p));
      p = p.__proto__;
    }
    keys = new Set(keys);

    function validProperty(obj, key) {
      let descr = Object.getOwnPropertyDescriptor(obj, key);

      if (descr && (descr.get || descr.set)) {
        return false;
      }

      let p = obj.constructor;
      do {
        if (p.prototype) {
          let descr = Object.getOwnPropertyDescriptor(p.prototype, key);

          if (descr && (descr.set || descr.get)) {
            return false;
          }
        }

        p = p.__proto__;
      } while (p && p !== p.__proto__);

      return true;
    }

    for (let k of keys) {
      let v;

      if (typeof k === "string" && k.startsWith("_")) {
        continue;
      }

      if (k === "constructor") {
        continue;
      }

      if (blacklist.has(k) || exclude.has(k)) {
        continue;
      }

      if (!validProperty(object, k)) {
        continue;
      }

      try {
        v = object[k];
      } catch (error) {
        continue;
      }

      if (typeof v !== "function") {
        continue;
      }

      cls[AspectKeys].push(k);
    }
  }

  object.__aspect_methods = new Set();

  for (let k of cls[AspectKeys]) {
    AfterAspect.bind(object, k);
  }
}

export function clearAspectCallbacks(obj) {
  for (let key of obj.__aspect_methods) {
    obj[key].clear();
  }
}

/**
 *
 * example:
 *
 * someobject.update.after(() => {
 *   do_something();
 *   return someobject.update.value;
 * }
 *
 * */
export class AfterAspect {
  constructor(owner, key) {
    this.owner = owner;
    this.key = key;

    this.chain = [[owner[key], false]];
    this.chain2 = [[owner[key], false]];

    this.root = [[owner[key], false]];

    let this2 = this;

    let method = this._method = function () {
      let chain = this2.chain;
      let chain2 = this2.chain2;

      chain2.length = chain.length;

      for (let i = 0; i < chain.length; i++) {
        chain2[i] = chain[i];
      }

      for (let i = 0; i < chain2.length; i++) {
        let [cb, node, once] = chain2[i];

        if (node) {
          let isDead = !node.isConnected;

          if (node instanceof UIBase) {
            isDead = isDead || node.isDead();
          }

          if (isDead) {
            console.warn("pruning dead AfterAspect callback", node);
            chain.remove(chain2[i]);
            continue;
          }
        }


        if (once && chain.indexOf(chain2[i]) >= 0) {
          chain.remove(chain2[i]);
        }

        if (cb && cb.apply) {
          method.value = cb.apply(this, arguments);
          //method.value = Reflect.apply(cb, this, arguments);
          //cb.apply(this, args);
        }
      }

      let ret = method.value;
      method.value = undefined;

      return ret;
    };

    this._method_bound = false;

    method.after = this.after.bind(this);
    method.once = this.once.bind(this);
    method.remove = this.remove.bind(this);

    owner[key].after = this.after.bind(this);
    owner[key].once = this.once.bind(this);
    owner[key].remove = this.remove.bind(this);
  }

  static bind(owner, key) {
    owner.__aspect_methods.add(key);

    return new AfterAspect(owner, key);
  }

  remove(cb) {
    for (let item of this.chain) {
      if (item[0] === cb) {
        this.chain.remove(item);
        return true;
      }
    }

    return false;
  }

  once(cb, node) {
    return this.after(cb, node, true);
  }

  _checkbind() {
    if (!this._method_bound) {
      this.owner[this.key] = this._method;
    }
  }

  clear() {
    this._checkbind();
    this.chain = [[this.root[0][0], this.root[0][1]]];
    this.chain2 = [[this.root[0][0], this.root[0][1]]];

    return this;
  }

  before(cb, node, once) {
    this._checkbind();

    if (cb === undefined) {
      console.warn("invalid call to .after(); cb was undefined");
      return;
    }
    this.chain = [[cb, node, once]].concat(this.chain);
  }

  after(cb, node, once) {
    this._checkbind();

    if (cb === undefined) {
      console.warn("invalid call to .after(); cb was undefined");
      return;
    }
    this.chain.push([cb, node, once]);
  }
}
