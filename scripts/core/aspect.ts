let exclude = new Set<string | symbol>([
  "toString",
  "constructor",
  "prototype",
  "__proto__",
  "toLocaleString",
  "hasOwnProperty",
  "shadow",
]);

type AspectOwner = Record<string, unknown> & { __aspect_methods?: Set<string>; constructor: Function };

let UIBase: Function | undefined = undefined;

//deal with circular module refrence
export function _setUIBase(uibase: Function): void {
  UIBase = uibase;
}

let AspectKeys = Symbol("aspect-keys");

export function initAspectClass(object: AspectOwner, blacklist = new Set<string | symbol>()): void {
  let cls = object.constructor as Function & { [k: symbol]: (string | symbol)[] };

  if (!cls[AspectKeys]) {
    cls[AspectKeys] = [];
    let keys: (string | symbol)[] = [];

    let p = Object.getPrototypeOf(object);
    while (p) {
      keys = keys.concat(Reflect.ownKeys(p));
      p = Object.getPrototypeOf(p);
    }
    let keySet = new Set(keys);

    function validProperty(obj: AspectOwner, key: string | symbol): boolean {
      let descr = Object.getOwnPropertyDescriptor(obj, key);

      if (descr && (descr.get || descr.set)) {
        return false;
      }

      let p: Function | null = obj.constructor;
      do {
        if ((p as Function & { prototype?: object }).prototype) {
          let descr = Object.getOwnPropertyDescriptor((p as Function & { prototype: object }).prototype, key);

          if (descr && (descr.set || descr.get)) {
            return false;
          }
        }

        p = Object.getPrototypeOf(p);
      } while (p && p !== Object.getPrototypeOf(p));

      return true;
    }

    for (let k of keySet) {
      let v: unknown;

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
        v = object[k as string];
      } catch (error) {
        continue;
      }

      if (typeof v !== "function") {
        continue;
      }

      cls[AspectKeys].push(k);
    }
  }

  object.__aspect_methods = new Set<string>();

  for (let k of cls[AspectKeys]) {
    AfterAspect.bind(object, k as string);
  }
}

export function clearAspectCallbacks(obj: AspectOwner): void {
  for (let key of obj.__aspect_methods!) {
    (obj[key] as AspectMethod).clear();
  }
}

type ChainEntry = [Function | undefined, (Node & { isDead?: () => boolean }) | undefined, boolean?];

interface AspectMethod {
  (...args: unknown[]): unknown;
  value?: unknown;
  after: (cb: Function, node?: Node, once?: boolean) => unknown;
  once: (cb: Function, node?: Node) => unknown;
  remove: (cb: Function) => boolean;
  clear: () => AfterAspect;
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
  owner: AspectOwner;
  key: string;
  chain: ChainEntry[];
  chain2: ChainEntry[];
  root: ChainEntry[];
  _method: AspectMethod;
  _method_bound: boolean;

  constructor(owner: AspectOwner, key: string) {
    this.owner = owner;
    this.key = key;

    this.chain = [[owner[key] as Function, undefined]];
    this.chain2 = [[owner[key] as Function, undefined]];

    this.root = [[owner[key] as Function, undefined]];

    let this2 = this;

    let method: AspectMethod = (this._method = function (this: unknown) {
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

          if (UIBase && node instanceof (UIBase as unknown as { new (): Node })) {
            isDead = isDead || !!(node as Node & { isDead?: () => boolean }).isDead?.();
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
    } as AspectMethod);

    this._method_bound = false;

    method.after = this.after.bind(this);
    method.once = this.once.bind(this);
    method.remove = this.remove.bind(this);

    (owner[key] as AspectMethod).after = this.after.bind(this);
    (owner[key] as AspectMethod).once = this.once.bind(this);
    (owner[key] as AspectMethod).remove = this.remove.bind(this);
  }

  static bind(owner: AspectOwner, key: string): AfterAspect {
    owner.__aspect_methods!.add(key);

    return new AfterAspect(owner, key);
  }

  remove(cb: Function): boolean {
    for (let item of this.chain) {
      if (item[0] === cb) {
        this.chain.remove(item);
        return true;
      }
    }

    return false;
  }

  once(cb: Function, node?: Node): unknown {
    return this.after(cb, node, true);
  }

  _checkbind(): void {
    if (!this._method_bound) {
      this.owner[this.key] = this._method;
    }
  }

  clear(): this {
    this._checkbind();
    this.chain = [[this.root[0][0], this.root[0][1]]];
    this.chain2 = [[this.root[0][0], this.root[0][1]]];

    return this;
  }

  before(cb: Function | undefined, node?: Node, once?: boolean): unknown {
    this._checkbind();

    if (cb === undefined) {
      console.warn("invalid call to .after(); cb was undefined");
      return this.owner;
    }
    this.chain = ([[cb, node, once]] as ChainEntry[]).concat(this.chain);
    return this.owner;
  }

  after(cb: Function | undefined, node?: Node, once?: boolean): unknown {
    this._checkbind();

    if (cb === undefined) {
      console.warn("invalid call to .after(); cb was undefined");
      return this.owner;
    }
    this.chain.push([cb, node, once]);
    return this.owner;
  }
}
