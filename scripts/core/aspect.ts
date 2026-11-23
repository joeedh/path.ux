type AspectOwner = { __aspect_methods?: Set<string>; constructor: Function } & Record<
  string,
  unknown
>;

let UIBase: Function | undefined = undefined;

//deal with circular module refrence
export function _setUIBase(uibase: Function): void {
  UIBase = uibase;
}

/**
 * The methods every widget can hook as `widget.method.after(cb)`, the form apps use. Other
 * methods are hooked with `AfterAspect.get(widget, key)`, which installs their wrapper on
 * that widget alone.
 */
export const EagerAspectKeys: readonly string[] = ["update", "setCSS"];

/**
 * Installs per-instance hook wrappers for the given methods (by default
 * {@link EagerAspectKeys}). Each wrapper is an own property of `objectIn`, so
 * `objectIn.update.after(cb)` attaches `cb` to this object and no other.
 */
export function initAspectClass(
  objectIn: object,
  blacklist = new Set<string | symbol>(),
  keys: readonly string[] = EagerAspectKeys
): void {
  const object = objectIn as AspectOwner;
  object.__aspect_methods ??= new Set<string>();

  for (const k of keys) {
    if (!blacklist.has(k) && typeof object[k] === "function") {
      AfterAspect.get(object, k);
    }
  }
}

/** Removes every callback hooked on `obj`'s methods, keeping the methods themselves. */
export function clearAspectCallbacks(obj: object): void {
  const owner = obj as AspectOwner;
  for (const key of owner.__aspect_methods ?? []) {
    (owner[key] as AspectMethod).clear();
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
  __aspect: AfterAspect;
}

/**
 * A method of one object that runs callbacks after itself.
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

  constructor(owner: AspectOwner, key: string) {
    this.owner = owner;
    this.key = key;

    this.chain = [[owner[key] as Function, undefined]];
    this.chain2 = [[owner[key] as Function, undefined]];

    this.root = [[owner[key] as Function, undefined]];

    const this2 = this;

    const method: AspectMethod = (this._method = function (this: unknown, ...args: unknown[]) {
      const chain = this2.chain;

      //nothing hooked: just the method itself
      if (chain.length === 1) {
        return chain[0]![0]!.apply(this, args);
      }

      const chain2 = this2.chain2;

      chain2.length = chain.length;

      for (let i = 0; i < chain.length; i++) {
        chain2[i] = chain[i]!;
      }

      for (let i = 0; i < chain2.length; i++) {
        const [cb, node, once] = chain2[i]!;

        if (node) {
          let isDead = !node.isConnected;

          if (UIBase && node instanceof (UIBase as unknown as { new (): Node })) {
            isDead = isDead || !!(node as Node & { isDead?: () => boolean }).isDead?.();
          }

          if (isDead) {
            //console.warn("pruning dead AfterAspect callback", node);
            chain.remove(chain2[i]!);
            continue;
          }
        }

        if (once && chain.includes(chain2[i]!)) {
          chain.remove(chain2[i]!);
        }

        if (cb?.apply) {
          method.value = cb.apply(this, args);
        }
      }

      const ret = method.value;
      method.value = undefined;

      return ret;
    } as AspectMethod);

    method.after = this.after.bind(this);
    method.once = this.once.bind(this);
    method.remove = this.remove.bind(this);
    method.clear = this.clear.bind(this);
    method.__aspect = this;

    //an own property, so hooks on this object never reach another one
    owner[key] = method;
    owner.__aspect_methods ??= new Set<string>();
    owner.__aspect_methods.add(key);
  }

  /** The hook wrapper of `owner[key]`, installed on `owner` if it doesn't have one yet. */
  static get(owner: object, key: string): AfterAspect {
    const o = owner as AspectOwner;
    const existing = (o[key] as Partial<AspectMethod> | undefined)?.__aspect;
    if (existing !== undefined && existing.owner === o) {
      return existing;
    }

    return new AfterAspect(o, key);
  }

  /** @deprecated Use {@link AfterAspect.get}, which doesn't wrap a method twice. */
  static bind(owner: AspectOwner, key: string): AfterAspect {
    return AfterAspect.get(owner, key);
  }

  remove(cb: Function): boolean {
    for (const item of this.chain) {
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

  clear(): this {
    this.chain = [[this.root[0]![0], this.root[0]![1]]];
    this.chain2 = [[this.root[0]![0], this.root[0]![1]]];

    return this;
  }

  before(cb: Function | undefined, node?: Node, once?: boolean): unknown {
    if (cb === undefined) {
      console.warn("invalid call to .after(); cb was undefined");
      return this.owner;
    }
    this.chain = ([[cb, node, once]] as ChainEntry[]).concat(this.chain);
    return this.owner;
  }

  after(cb: Function | undefined, node?: Node, once?: boolean): unknown {
    if (cb === undefined) {
      console.warn("invalid call to .after(); cb was undefined");
      return this.owner;
    }
    this.chain.push([cb, node, once]);
    return this.owner;
  }
}
