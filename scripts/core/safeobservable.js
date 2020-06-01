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
let idgen = 0;

//you needn't subclass this directly,
//simply implementing its interface is enough
export class AbstractObservable {
  //note that child classes inherit event types from their parents
  static observeDefine() {return {
    events : {
      "mousedown" : MouseEvent,
      "some_integer" : IntProperty
    }
  }}

  stillAlive() {
    //returns if we're still alive, note that listeners can implement this too
    throw new Error("implement me");
  }
}

function _valid(obj) {
  return obj && (typeof obj === "object" || typeof obj === "function");
}

export class ObserveManger {
  constructor() {
    this.subscriberMap = new Map();
    this.subscribeeMap = new Map();
    this.idmap = new WeakMap();
  }

  getId(obj) {
    if (!this.idmap.has(obj)) {
      this.idmap.set(obj, idgen++);
    }

    return this.idmap.get(obj);
  }

  _getEvents(owner) {
    let keys = new Set();

    let p = owner;
    while (p) {
      if (p.observeDefine) {
        let def = p.observeDefine();

        for (let item of def.events) {
          keys.add(item);
        }
      }
      p = p.prototype;
    }

    return keys;
  }

  dispatch(owner, type, data) {
    if (!_valid(owner)) {
      throw new Error("invalid argument to ObserveManger.dispathc");
    }

    let oid = this.getId(owner);
    let list = this.subscribeeMap.get(oid);

    for (let i=0; i<list.length; i++) {
      let item = list[i];
      let cid = item.id, cb = item.callback, isValid = item.isValid;

      if (isValid && !isValid()) {
        if (this._unsubscribe(oid, type, cid, cb)) {
          i--;
        }

        continue;
      }

      try {
        cb(data);
      } catch (error) {
        util.print_stack(error);
        console.log("event dispatch error for " + type);
      }
    }
  }

  update() {
    for (let cid of this.subscriberMap.keys()) {
      let list = this.subscriberMap.get(cid);

      for (let item of list) {
        let bad = false;
        let oid = item.id;

        try {
          bad = item.isValid && !item.isValid();
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

      for (let item of list) {
        let bad = false;
        let cid = item.id;

        try {
          bad = item.isValid && !item.isValid();
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

  subscribe(owner, type, child, callback, customIsValid=undefined) {
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
    let cbid = thi.getId(callback);

    if (!(cid in this.subscriberMap)) {
      this.subscriberMap.set(cid, []);
    }
    if (!(oid in this.subscribeeMap)) {
      this.subscribeeMap.set(oid, []);
    }

    let ref;
    if (typeof child.isValid === "function") {
      ref = child.isValid;
      if (ref === child.prototype.isValid) {
        ref = ref.bind(child);
      }
    }

    if (customIsValid && ref) {
      let ref2 = ref;
      ref = () => {
        return ref2 && customIsValid();
      }
    } else if (customIsValid) {
      ref = customIsValid;
    }

    this.subscriberMap.get(cid).push({
      id : oid,
      type : type,
      isValid : ref,
      callback : callback});


    ref = undefined;
    if (owner.isValid) {
      ref = owner.isValid;

      if (ref === owner.prototype.isValid) {
        ref = ref.bind(owner);
      }
    }

    this.subscribeeMap.get(oid).push({
      id       : cid,
      type     : type,
      callback : callback,
      isValid  : ref
    });


  } has(owner, type, child, callback) {
    if (!_valid(owner) || !_valid(child)) {
      throw new Error("invalid arguments to ObserveManager.has");
    }

  }

  //if callback is undefined, all callbacks owned by child will be unsubscribed
  unsubscribe(owner, type, child, callback) {
    if (!_valid(owner) || !_valid(child)) {
      throw new Error("invalid arguments to ObserveManager.unsubscribe");
    }
    let oid = this.getId(owner);
    let cid = this.getId(child);

    return this._unsubscribe(oid, type, cid, callback);
  }

  _unsubscribe(oid, type, cid, callback) {
    let cbid = this.getId(callback);

    if (!this.subscribeeMap.has(oid) || !this.subscriberMap.has(cid)) {
      console.warn("Warning, bad call to ObserveManager.unsubscribe");
    }

    let list = this.subscriberMap.get(cid);
    let found = false;

    for (let item of list.concat([])) {
      if (item.type === type && item.id === oid && (!callback || item.callback === callback)) {
        list.remove(item);
        found = true;
      }
    }

    list = this.subscribeeMap.get(oid);
    for (let item of list.concat([])) {
      if (item.type === type && item.id === cid && (!callback || item.callback === callback)) {
        list.remove(item);
        found = true;
      }
    }

    return found;
  }
}

export default manager = new ObserveManger();

//Utility class that hides details of ObserveManage

export class Observable extends AbstractObservable {
  static observeDefine() {
    throw new Error("implement me; see AbstractObservable");
  }

  isValid() {
    return true;
  }

  on(type, child, callback) {
    manager.subscribe(this, type, child, callback);
    return this;
  }

  /**if callback is undefined, then all callbacks associated with child will be
  removed*/
  off(type, child, callback) {
    manager.subscribe(this, type, child, callback);
    return this;
  }

  once(type, child, callback) {
    let i = 0;

    manager.subscribe(this, type, child, callback, () => {
      return i++ > 0;
    });

    return this;
  }

  static mixin(cls) {
    function set(p, key, val) {
      if (p[key] === undefined) {
        p[key] = val;
      }
    }

    set(cls,prototype, "on", this.prototype.on);
    set(cls,prototype, "off", this.prototype.off);
    set(cls,prototype, "once", this.prototype.once);
    set(cls,prototype, "isValid", this.prototype.isValid);
    set(cls, "observeDefine", this.observeDefine);
  }
}

