/*
 *
 * Kind of wish JS had weak references.
 *
 * This little library tries to do something similar.
 *
 * The safe way to do this is probably to pass event messges through the object tree,
 * instead of having objects store direct messages (or the weird analog I'm doing here)
 * to each other directly.
 *
 * Though in that case most event "callbacks" would do nothing more then pass the event along to their children.
 *
 * */
import * as util from "../path-controller/util/util.js";

let idgen = 0;

interface ObservableConstructor {
  observeDefine?(): { events: Record<string, unknown> };
  prototype?: ObservableInstance;
}

interface ObservableInstance {
  constructor: ObservableConstructor;
  isValid?(): boolean;
  prototype?: ObservableInstance;
  observeDefine?(): { events: Record<string, unknown> };
}

interface SubscriptionEntry {
  id: number;
  type: string;
  isValid: (() => boolean) | undefined;
  callback: Function;
}

//you needn't subclass this directly,
//simply implementing its interface is enough
export class AbstractObservable {
  //note that child classes inherit event types from their parents
  static observeDefine(): { events: Record<string, unknown> } {
    return {
      events: {
        "mousedown"   : MouseEvent,
        "some_integer": Number,
      },
    };
  }

  stillAlive(): boolean {
    //returns if we're still alive, note that listeners can implement this too
    throw new Error("implement me");
  }
}

function _valid(obj: unknown): obj is object {
  return !!obj && (typeof obj === "object" || typeof obj === "function");
}

export class ObserveManger {
  subscriberMap: Map<number, SubscriptionEntry[]>;
  subscribeeMap: Map<number, SubscriptionEntry[]>;
  idmap: WeakMap<object, number>;

  constructor() {
    this.subscriberMap = new Map();
    this.subscribeeMap = new Map();
    this.idmap = new WeakMap();
  }

  getId(obj: object): number {
    if (!this.idmap.has(obj)) {
      this.idmap.set(obj, idgen++);
    }

    return this.idmap.get(obj)!;
  }

  _getEvents(owner: ObservableInstance): Set<string> {
    let keys = new Set<string>();

    let p: ObservableInstance | undefined = owner;
    while (p) {
      if (p.observeDefine) {
        let def = p.observeDefine();

        for (let item in def.events) {
          keys.add(item);
        }
      }
      p = p.prototype;
    }

    return keys;
  }

  dispatch(owner: ObservableInstance, type: string, data: unknown): void {
    if (!_valid(owner)) {
      throw new Error("invalid argument to ObserveManger.dispathc");
    }

    let oid = this.getId(owner);
    let list = this.subscribeeMap.get(oid);

    if (!list) return;

    for (let i = 0; i < list.length; i++) {
      let item = list[i];
      let cid = item.id,
        cb = item.callback,
        isValid = item.isValid;

      if (isValid && !isValid()) {
        if (this._unsubscribe(oid, type, cid, cb)) {
          i--;
        }

        continue;
      }

      try {
        cb(data);
      } catch (error) {
        util.print_stack(error as Error);
        console.log("event dispatch error for " + type);
      }
    }
  }

  update(): void {
    for (let cid of this.subscriberMap.keys()) {
      let list = this.subscriberMap.get(cid)!;

      for (let item of list) {
        let bad = false;
        let oid = item.id;

        try {
          bad = !!item.isValid && !item.isValid();
        } catch (error) {
          bad = true;
          console.log("error in event callback");
        }

        if (bad) {
          this._unsubscribe(oid, item.type, cid, item.callback);
        }
      }
    }

    for (let oid of this.subscribeeMap.keys()) {
      let list = this.subscriberMap.get(oid);

      if (!list) continue;

      for (let item of list) {
        let bad = false;
        let cid = item.id;

        try {
          bad = !!item.isValid && !item.isValid();
        } catch (error) {
          bad = true;
          console.log("error in event callback");
        }

        if (bad) {
          this._unsubscribe(oid, item.type, cid, item.callback);
        }
      }
    }
  }

  subscribe(
    owner: ObservableInstance,
    type: string,
    child: ObservableInstance,
    callback: Function,
    customIsValid?: () => boolean
  ): void {
    if (!_valid(owner) || !_valid(child)) {
      throw new Error("invalid arguments to ObserveManager.subscribe");
    }

    if (!owner.constructor.observeDefine) {
      throw new Error("owner is not an observable; no observeDefine");
    }

    let validkeys = this._getEvents(owner);
    if (!validkeys.has(type)) {
      throw new Error("unknown event type " + type);
    }

    let oid = this.getId(owner);
    let cid = this.getId(child);
    let cbid = this.getId(callback as unknown as object);

    if (!this.subscriberMap.has(cid)) {
      this.subscriberMap.set(cid, []);
    }
    if (!this.subscribeeMap.has(oid)) {
      this.subscribeeMap.set(oid, []);
    }

    let ref: (() => boolean) | undefined;
    if (typeof child.isValid === "function") {
      ref = child.isValid;
      if (child.prototype && ref === child.prototype.isValid) {
        ref = ref.bind(child);
      }
    }

    if (customIsValid && ref) {
      let ref2 = ref;
      ref = () => {
        return ref2() && customIsValid();
      };
    } else if (customIsValid) {
      ref = customIsValid;
    }

    this.subscriberMap.get(cid)!.push({
      id      : oid,
      type    : type,
      isValid : ref,
      callback: callback,
    });

    ref = undefined;
    if (owner.isValid) {
      ref = owner.isValid;

      if (owner.prototype && ref === owner.prototype.isValid) {
        ref = ref.bind(owner);
      }
    }

    this.subscribeeMap.get(oid)!.push({
      id      : cid,
      type    : type,
      callback: callback,
      isValid : ref,
    });
  }

  has(owner: ObservableInstance, type: string, child: ObservableInstance, callback: Function): void {
    if (!_valid(owner) || !_valid(child)) {
      throw new Error("invalid arguments to ObserveManager.has");
    }
  }

  //if callback is undefined, all callbacks owned by child will be unsubscribed
  unsubscribe(owner: ObservableInstance, type: string, child: ObservableInstance, callback?: Function): boolean {
    if (!_valid(owner) || !_valid(child)) {
      throw new Error("invalid arguments to ObserveManager.unsubscribe");
    }
    let oid = this.getId(owner);
    let cid = this.getId(child);

    return this._unsubscribe(oid, type, cid, callback);
  }

  _unsubscribe(oid: number, type: string, cid: number, callback?: Function): boolean {
    let cbid = callback ? this.getId(callback as unknown as object) : undefined;

    if (!this.subscribeeMap.has(oid) || !this.subscriberMap.has(cid)) {
      console.warn("Warning, bad call to ObserveManager.unsubscribe");
    }

    let list = this.subscriberMap.get(cid);
    let found = false;

    if (list) {
      for (let item of list.concat([])) {
        if (item.type === type && item.id === oid && (!callback || item.callback === callback)) {
          list.remove(item);
          found = true;
        }
      }
    }

    let list2 = this.subscribeeMap.get(oid);
    if (list2) {
      for (let item of list2.concat([])) {
        if (item.type === type && item.id === cid && (!callback || item.callback === callback)) {
          list2.remove(item);
          found = true;
        }
      }
    }

    return found;
  }
}

const observeManager = new ObserveManger();
export default observeManager;

//Utility class that hides details of ObserveManage

export class Observable extends AbstractObservable {
  static observeDefine(): { events: Record<string, unknown> } {
    throw new Error("implement me; see AbstractObservable");
  }

  isValid(): boolean {
    return true;
  }

  on(type: string, child: ObservableInstance, callback: Function): this {
    observeManager.subscribe(this, type, child, callback);
    return this;
  }

  /**if callback is undefined, then all callbacks associated with child will be
  removed*/
  off(type: string, child: ObservableInstance, callback: Function): this {
    observeManager.subscribe(this, type, child, callback);
    return this;
  }

  once(type: string, child: ObservableInstance, callback: Function): this {
    let i = 0;

    observeManager.subscribe(this, type, child, callback, () => {
      return i++ > 0;
    });

    return this;
  }

  static mixin(cls: { prototype: Record<string, unknown>; observeDefine?: typeof Observable.observeDefine }): void {
    function set(p: Record<string, unknown>, key: string, val: unknown): void {
      if (p[key] === undefined) {
        p[key] = val;
      }
    }

    set(cls.prototype, "on", Observable.prototype.on);
    set(cls.prototype, "off", Observable.prototype.off);
    set(cls.prototype, "once", Observable.prototype.once);
    set(cls.prototype, "isValid", Observable.prototype.isValid);
    if (!cls.observeDefine) {
      cls.observeDefine = Observable.observeDefine;
    }
  }
}
