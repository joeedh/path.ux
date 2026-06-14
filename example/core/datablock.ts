/*
useful classes for wrangling important base classes
*/

import {nstructjs, util, DataAPI, DataStruct} from '../pathux.js';

export const BlockFlag = {
  NO_SAVE : 1
};

export interface IBlockDef {
  uiName: string;
  typeName: string;
  defaultName: string;
  flag?: number;
  icon?: number;
}

export const BlockClasses: (typeof DataBlock)[] = [];

export class DataBlock {
  static STRUCT: string;

  lib_id: number;
  lib_users: number;
  name: string;

  constructor() {
    this.lib_id = -1;
    this.lib_users = 0;
    this.name = "";
  }

  static blockDefine(): IBlockDef {
    return {
      uiName     : "",
      typeName   : "",
      defaultName: "",
      flag       : 0, //see BlockFlags
      icon       : -1,
    }
  }

  static defineAPI(api: DataAPI): DataStruct {
    const st = api.mapStruct(this, true);
    return st;
  }

  lib_addUser(user: DataBlock) {
    this.lib_users++;
  }

  lib_remUser(user: DataBlock) {
    this.lib_users--;
  }

  loadSTRUCT(reader: (obj: this) => void) {
    reader(this);
  }

  dataLink(getblock: (ref: DataRef) => DataBlock | undefined,
           getblock_addUser: (ref: DataRef) => DataBlock | undefined) {

  }

  copy(): DataBlock {
    throw new Error("implement me!");
  }

  static register(cls: typeof DataBlock) {
    if (cls.prototype.copy === DataBlock.prototype.copy) {
      throw new Error("must implement copy method");
    }

    if (!nstructjs.isRegistered(cls)) {
      throw new Error("You forgot to register " + cls.name + " with nstructjs");
    }

    for (const cls2 of BlockClasses) {
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
nstructjs.register(DataBlock);

export class DataRef {
  static STRUCT: string;

  lib_id: number;
  name: string;

  constructor() {
    this.lib_id = -1;
    this.name = "";
  }

  static fromBlock(block: DataBlock | undefined | null) {
    const ref = new DataRef();

    if (!block) {
      ref.lib_id = -1;
      return ref;
    }

    ref.lib_id = block.lib_id;
    ref.name = block.name;

    return ref;
  }
}

window.DataRef = DataRef; //need global ref to use DataRef.fromBlock in struct scripts
DataRef.STRUCT = `
DataRef {
  lib_id : int;
  name   : string;
}`;

nstructjs.register(DataRef);

export class BlockSet extends Array<DataBlock> {
  static STRUCT: string;

  typeName: string;
  blockIdMap: Map<number, DataBlock>;
  blockNameMap: Map<string, DataBlock>;
  datalib: DataLib;
  active: DataBlock | undefined;
  _blocks: DataBlock[] | undefined; //used by struct

  constructor(datalib: DataLib, typeName: string) {
    super();

    this.typeName = typeName;

    this.blockIdMap = new Map();
    this.blockNameMap = new Map();
    this.datalib = datalib;

    this.active = undefined;
    this._blocks = undefined; //used by struct
  }

  push(block: DataBlock): number {
    if (block.lib_id < 0) {
      block.lib_id = this.datalib.idgen.next();
    }

    if (this.blockIdMap.has(block.lib_id)) {
      console.warn("Tried to add same block twice", block);
      return this.length;
    }

    super.push(block);

    this.blockIdMap.set(block.lib_id, block);
    this.blockNameMap.set(block.name, block);

    if (this.active === undefined) {
      this.active = block;
    }

    return this.length;
  }

  remove(block: DataBlock) {
    if (!this.blockIdMap.has(block.lib_id)) {
      console.warn("Block is not in blockset", block);
      return;
    }

    this.blockIdMap.delete(block.lib_id);
    super.remove(block);

    if (!this.blockNameMap.delete(block.name)) {
      //regenerate blockNameMap
      this.regenBlockNameMap();
    }

    if (this.active === block) {
      this.active = this.length > 0 ? this[0] : undefined;
    }
  }

  uniqueName(name: string) {
    const basename = name; let i = 2;

    while (this.blockNameMap.has(name)) {
      name = basename + i;
      i++;
    }

    return name;
  }

  get(f: DataRef | string | number | undefined | null): DataBlock | undefined {
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

  has(f: DataRef | string | number | undefined | null) {
    return this.get(f) !== undefined;
  }

  regenBlockNameMap() {
    this.blockNameMap = new Map();

    for (const block of this) {
      this.blockNameMap.set(block.name, block);
    }
  }

  loadSTRUCT(reader: (obj: this) => void) {
    reader(this);

    for (const block of this._blocks!) {
      this.push(block);
    }

    this._blocks = undefined;
    this.active = this.get(this.active as unknown as DataRef);
  }
}
BlockSet.STRUCT = `
BlockSet {
  _blocks  : array(abstract(DataBlock)) | this;
  active   : DataRef | DataRef.fromBlock(this.active);
  typeName : string;
}
`;
nstructjs.register(BlockSet);

export class DataLib {
  static STRUCT: string;

  blocksets: BlockSet[];
  _blocksetKeys: string[];
  blockIdMap: Map<number, DataBlock>;
  blockNameMap: Map<string, DataBlock>;
  idgen: util.IDGen;

  constructor() {
    this.blocksets = [];
    this._blocksetKeys = [];

    this.blockIdMap = new Map();
    this.blockNameMap = new Map();
    this.idgen = new util.IDGen();

    for (const cls of BlockClasses) {
      const def = cls.blockDefine();
      const key = def.typeName;

      this._blocksetKeys.push(key);

      const bset = new BlockSet(this, def.typeName);

      this.setBlockSet(key, bset);
      this.blocksets.push(bset);
    }
  }

  // DataLib stores each block set as a dynamically named property keyed by
  // typeName so both JS code and the data-path API can read e.g. datalib.model_data.
  private setBlockSet(key: string, bset: BlockSet | undefined) {
    (this as unknown as Record<string, BlockSet | undefined>)[key] = bset;
  }

  getBlockSet(typeName: string): BlockSet | undefined {
    for (const bset of this.blocksets) {
      if (bset.typeName === typeName) {
        return bset;
      }
    }
  }

  get allblocks() {
    const this2 = this;
    return (function*() {
      for (const bset of this2.blocksets) {
        for (const block of bset) {
          yield block;
        }
      }
    })();
  }

  add(block: DataBlock) {
    const def = (block.constructor as typeof DataBlock).blockDefine();

    if (block.lib_id < 0) {
      block.lib_id = this.idgen.next();
    }

    if (this.blockIdMap.has(block.lib_id)) {
      console.warn("Tried to add same block to datalib twice", block);
      return this;
    }

    const bset = this.getBlockSet(def.typeName)!;

    block.name = bset.uniqueName(block.name);

    bset.push(block);
    this.blockIdMap.set(block.lib_id, block);
    this.blockNameMap.set(block.name, block);

    return this;
  }

  remove(block: DataBlock) {
    if (block.lib_id < 0) {
      console.error("Block is not in datalib", block);
      return;
    }

    if (!this.blockIdMap.has(block.lib_id)) {
      console.error("Block is not in datalib", block);
      return;
    }

    const def = (block.constructor as typeof DataBlock).blockDefine();
    const bset = this.getBlockSet(def.typeName)!;

    this.blockIdMap.delete(block.lib_id);
    this.blockNameMap.delete(block.name);

    bset.remove(block);

    return this;
  }

  has(f: DataRef | DataBlock | string | number | undefined | null) {
    if (f === undefined || f === null) {
      return false;
    }

    if (f instanceof DataBlock) {
      return this.get(f.lib_id) !== undefined;
    }

    return this.get(f) !== undefined;
  }

  get(f: DataRef | string | number | undefined | null): DataBlock | undefined {
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

  loadSTRUCT(reader: (obj: this) => void) {
    for (const key of this._blocksetKeys) {
      this.setBlockSet(key, undefined);
    }

    reader(this);

    this._blocksetKeys = [];

    for (const bset of this.blocksets) {
      const key = bset.typeName;
      this.setBlockSet(key, bset);
      this._blocksetKeys.push(key);
    }

    for (const cls of BlockClasses) {
      const def = cls.blockDefine();
      const key = def.typeName;

      if (!this.getBlockSet(key)) {
        const bset = new BlockSet(this, def.typeName);
        this.setBlockSet(key, bset);
        this._blocksetKeys.push(key);
        this.blocksets.push(bset);
      }
    }

    this.blockIdMap = new Map();
    this.blockNameMap = new Map();

    for (const bset of this.blocksets) {
      for (const block of bset) {
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

export function buildAPI(api: DataAPI) {
  api.mapStruct(DataLib, true);

  for (const cls of BlockClasses) {
    cls.defineAPI(api);

    const st = api.mapStruct(cls, false);
    const def = cls.blockDefine();

    st.list<BlockSet, number, DataBlock | undefined>(def.typeName, def.typeName, {
      getStruct(api, list, key) {
        return st;
      },
      get(api, list, key) {
        return list.blockIdMap.get(key);
      },
      getActive(api, list) {
        return list.active;
      },
      getIter(api, list) {
        return list[Symbol.iterator]();
      },
      setActive(api, list, val) {
        list.active = val;
      },
      getKey(api, list, obj) {
        return obj!.lib_id;
      },
      getLength(api, list) {
        return list.length;
      }
    });
  }
}
