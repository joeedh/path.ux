/*
useful classes for wrangling important base classes
*/

import {nstructjs, util} from '../../scripts/pathux.js';

export const BlockFlag = {
  NO_SAVE : 1
};

export const BlockClasses = [];

class DataBlock {
  constructor() {
    this.lib_id = -1;
    this.lib_users = 0;
    this.name = "";
  }

  static blockDefine() {
    return {
      uiName     : "",
      typeName   : "",
      defaultName: "",
      flag       : 0, //see BlockFlags
      icon       : -1,
    }
  }

  static defineAPI(api) {
    let st = api.mapStruct(this, true);
    return st;
  }

  lib_addUser(user) {
    this.lib_users++;
  }

  lib_remUser(user) {
    this.lib_users--;
  }

  loadSTRUCT(reader) {
    reader(this);
  }

  dataLink(getblock, getblock_addUser) {

  }

  copy() {
    throw new Error("implement me!");
  }

  static register(cls) {
    if (cls.prototype.copy === DataBlock.prototype.copy) {
      throw new Error("must implement copy method");
    }

    if (!nstructjs.isRegistered(cls)) {
      throw new Error("You forgot to register " + cls.name + " with nstructjs");
    }

    for (let cls2 of BlockClasses) {
      if (cls2.blockDefine().typeName === cls.blockDefine().typeName) {
        throw new Error("typeName " + cls.blockDefine().typeName + " is already taken by " + cls2.name);
      }
    }

    BlockClasses.push(cls);
  }
}
DataBlock.STRUCT = `
DataBlock {
  name       : string;
  lib_id     : int;
  lib_users  : int;
}
`

export class DataRef {
  constructor() {
    this.lib_id = -1;
    this.name = "";
  }

  static fromBlock(block) {
    if (!block) {
      this.lib_id = -1;
      return;
    }

    this.lib_id = block.lib_id;
    this.name = block.name;
  }
}

window.DataRef = DataRef; //need global ref to use DataRef.fromBlock in struct scripts
DataRef.STRUCT = `
DataRef {
  lib_id : int;
  name   : string;
}`;

nstructjs.register(DataRef);

export class BlockSet extends Array {
  constructor(datalib, typeName) {
    super();

    this.typeName = typeName;

    this.blockIdMap = new Map();
    this.blockNameMap = new Map();
    this.datalib = datalib;

    this.active = undefined;
    this._blocks = undefined; //used by struct
  }

  push(block) {
    if (block.lib_id < 0) {
      block.lib_id = this.datalib.idgen.next();
    }

    if (this.blockIdMap.has(block.lib_id)) {
      console.warn("Tried to add same block twice", block);
      return;
    }

    super.push(block);

    this.blockIdMap.set(block.lib_id, block);
    this.blockNameMap.set(block.name, block);

    if (this.active === undefined) {
      this.active = block;
    }
  }

  remove(block) {
    if (!this.blockIdMap.has(block)) {
      console.warn("Block is not in blockset", block);
      return;
    }

    this.blockIdMap.delete(block);
    super.remove(block);

    if (!this.blockNameMap.delete(block.name)) {
      //regenerate blockNameMap
      this.regenBlockNameMap();
    }

    if (this.active === block) {
      this.active = this.length > 0 ? this[0] : undefined;
    }
  }

  uniqueName(name) {
    let basename = name, i = 2;

    while (this.blockNameMap.has(name)) {
      name = basename + i;
      i++;
    }

    return name;
  }

  get(f) {
    if (f === undefined || f === null) {
      return undefined;
    }

    if (typeof f === "string") {
      return this.blockNameMap.get(f);
    }

    if (typeof f === "number") {
      return this.blockIdMap.get(f);
    }

    if (f instanceof DataRef) {
      return this.blockIdMap.get(f.lib_id);
    }

    return undefined;
  }

  has(f) {
    return this.get(f) !== undefined;
  }

  regenBlockNameMap() {
    this.blockNameMap = new Map();

    for (let block of this) {
      this.blockNameMap.set(block.name, block);
    }
  }

  loadSTRUCT(reader) {
    reader(this);

    for (let block of this._blocks) {
      this.push(block);
    }

    this._blocks = undefined;
    this.active = this.get(this.active);
  }
}
BlockSet.STRUCT = `
BlockSet {
  _blocks : array(abstract(DataBlock)) | this;
  active  : DataRef.fromBlock(this.active);
}
`;
nstructjs.register(BlockSet);

export class DataLib {
  constructor() {
    this.blocksets = [];
    this._blocksetKeys = [];

    this.blockIdMap = new Map();
    this.blockNameMap = new Map();
    this.idgen = new util.IDGen();

    for (let cls of BlockClasses) {
      let def = cls.blockDefine();
      let key = def.typeName;

      this._blocksetKeys.push(key);

      let bset = new BlockSet(this, def.typeName);

      this[key] = bset;
      this.blocksets.push(bset);
    }
  }

  add(block) {
    let def = block.constructor().blockDefine();

    if (block.lib_id < 0) {
      block.lib_id = this.idgen.next();
    }

    if (this.blockIdMap.has(block.lib_id)) {
      console.warn("Tried to add same block to datalib twice", block);
      return this;
    }

    let bset = this.getBlockSet(def.typeName);

    block.name = bset.uniqueName(block.name);

    bset.push(block);
    this.blockIdMap.set(block.lib_id, block);
    this.blockNameMap.set(block.name, block);

    return this;
  }

  remove(block) {
    if (block.lib_id < 0) {
      console.error("Block is not in datalib", block);
      return;
    }

    if (!this.blockIdMap.has(block.lib_id)) {
      console.error("Block is not in datalib", block);
      return;
    }

    let def = block.constructor.blockDefine();
    let bset = this.getBlockSet(def.typeName);

    this.blockIdMap.delete(block.lib_id);
    this.blockNameMap.delete(block.name);

    bset.remove(block);

    return this;
  }

  has(f) {
    if (f === undefined || f === null) {
      return false;
    }

    if (f instanceof DataBlock) {
      return this.get(f.lib_id);
    }

    return this.get(f) !== undefined;
  }

  get(f) {
    if (f === undefined || f === null) {
      return undefined;
    }

    if (typeof f === "number") {
      return this.blockIdMap.get(f);
    }

    if (typeof f === "string") {
      return this.blockNameMap.get(f);
    }

    if (f instanceof DataRef) {
      return this.blockIdMap.get(f.lib_id);
    }

    return undefined;
  }

  getBlockSet(typeName) {
    for (let bset of this.blocksets) {
      if (bset.typeName === typeName) {
        return bset;
      }
    }
  }

  loadSTRUCT(reader) {
    reader(this);

    for (let key of this._blocksetKeys) {
      this[key] = undefined;
    }

    this._blocksetKeys = [];

    for (let bset of this.blocksets) {
      let key = bset.typeName;
      this[key] = bset;
      this._blocksetKeys.push(key);
    }

    for (let cls of BlockClasses) {
      let def = cls.blockDefine();
      let key = def.typeName;

      if (!this[key]) {
        let bset = new BlockSet(this, def.typeName);
        this[key] = bset;
        this._blocksetKeys.push(key);
        this.blocksets.push(bset);
      }
    }

    this.blockIdMap = new Map();
    this.blockNameMap = new Map();

    for (let bset of this.blocksets) {
      for (let block of bset) {
        this.blockIdMap.set(block.lib_id, block);
        this.blockNameMap.set(block.name, block);
      }
    }
  }
}
DataLib.STRUCT = `
DataLib {
  blocksets : array(BlockSet);
  idgen     : IDGen;
}
`;
nstructjs.register(DataLib);

export function buildAPI(api) {
  let st = api.mapStruct(DataLib, true);

  for (let cls of BlockClasses) {
    cls.defineAPI(api);

    let st = api.mapStruct(cls, false);
    let def = cls.blockDefine();
    let key = def.typeName;

    st.list(def.typeName, type.typeName, {
      getStruct(api, list, key) {
        return st;
      },
      get(api, list, key) {
        return list.blockIdMap.get(key);
      },
      getActive(api, list) {
        return list.active;
      },
      getIter() {
        return list[Symbol.iterator]();
      },
      setActive(api, list, key, val) {
        list.active = list.blockIdMap.get(key);
      },
      getKey(api, list, obj) {
        return obj.lib_id;
      }
    });
  }
}

