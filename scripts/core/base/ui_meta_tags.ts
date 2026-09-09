/*
// ==== example usage ====

// helper type union for all UX tool metas 
// to allow type inference keyed on 'type'
type MyUXTools = MyUXToolMeta;

const widget: UIBase;
widget.setMeta(
  StdUXMeta,
  new StdUXMeta<MyUXTools>({
    tools: [
      new MyUXToolMeta({
        toolPath: "some/path",
        requirements: "some/requirements",
        supplies: ["text"],
      }),
    ],
  }),
);

// builders (toolImpl, prop, tool-path menu rows, HotKey) would write toolPath/valuePath as they
// build, so the values are trustworthy rather than hand-declared

// one widget
ipc.sendMessage({ type: "uxmeta", data: nstructjs.writeJSON(widget.getMeta(StdUXMeta)) });

// a whole screen: every tag on every widget, each named by widgetPath
const sweep = (root: UIBase) => {
  const out: unknown[] = [];
  for (const w of walkWidgets(root)) {
    for (const meta of allMeta(w)) {
      if (meta instanceof StdUXMeta) meta.widgetPath = widgetPathOf(w);
      out.push(nstructjs.writeJSON(meta));
    }
  }
  return out;
};

// on the other end we can either call nstructjs.validateJSON and deserialize directly,
// or write an nstructjs script to zod converter

const meta = widget.getMeta<StdUXMeta<MyUXTools>>(StdUXMeta)!;
for (const tool of meta.tools) {
  switch (tool.type) {
    case "mytype":
      // tool now has inferred MyUXToolMeta
      break;
  }
}

// headless: no owner, so the setters buffer and the same class is the derived-tier record
const derived = new StdUXMeta<MyUXTools>({ description: "Approve the gate", valuePath: "ui.gate" });
*/

import type { Refusal } from "../../path-controller/toolsys/toolop";
import * as nstructjs from "../../path-controller/util/nstructjs";

// Scratch sketch of a widget metadata system. Tags attach to a UIBase, are keyed by a stable
// type name rather than a constructor, and serialize with nstructjs so they can cross IPC. They
// are not part of the frame-mesh save file and hold no ephemeral state (that is saveData/loadData).

/**
 * What a tag may read off the thing it is attached to. Every member is optional because a
 * control is not always a `UIBase`: path.ux's own menu rows are raw `HTMLLIElement`s, and an
 * app drawing into an `appendSurface` root uses plain elements. A tag buffers whatever its
 * owner cannot hold.
 */
export interface MetaOwner {
  description?: string;
  disabled?: boolean;
  refusalReason?: Refusal | (() => Refusal | undefined);
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
  removeAttribute?(name: string): void;
}

/** Whether the owner can hold `valuePath` itself, in the `datapath` attribute. */
const holdsAttributes = (
  owner: MetaOwner | undefined
): owner is MetaOwner &
  Required<Pick<MetaOwner, "getAttribute" | "setAttribute" | "removeAttribute">> =>
  typeof owner?.getAttribute === "function" &&
  typeof owner.setAttribute === "function" &&
  typeof owner.removeAttribute === "function";

/**
 * Whether the owner declares `key`, so writing it lands somewhere another reader will find it.
 * Assigning a property an owner never declared would make an expando that nothing else reads.
 */
const holdsProperty = (owner: MetaOwner | undefined, key: keyof MetaOwner): owner is MetaOwner =>
  owner !== undefined && key in owner;

export interface IUXMetaDef {
  /** Stable key for the tag set and the wire; a constructor identity does not survive IPC. */
  typeName: string;
  /** Whether getMeta walks parentWidget on a miss. The meta class decides, not the caller. */
  inherits?: boolean;
}

export abstract class UXMetaTag<O = unknown> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    pathux.UXMetaTag {
    }`
  );

  abstract copyTo(b: this): void;
  abstract copy(): this;
  // set by the api; never serialized
  owner: O | undefined;
  // called when attaching to an owner, this.owner will exist
  onAttach?: () => void;
}

export interface IUXMetaConstructor<T extends UXMetaTag> {
  metaDefine(): IUXMetaDef;
  // remember nstructjs needs to be able to construct with no constructor arguments
  new (): T;
  STRUCT: string;
}

const metaTag: unique symbol = Symbol("uxMeta");

// keyed by metaDefine().typeName so the whole set serializes as one array(abstract(...))
export type TagSet = Map<string, UXMetaTag>;
type Owner<T = unknown> = T & { [metaTag]?: TagSet };

// pure: a miss allocates nothing, ensureMeta owns creation
export const getMeta = <T extends UXMetaTag>(
  obj: T["owner"],
  ctor: IUXMetaConstructor<T>
): T | undefined => {
  const map = (obj as Owner)[metaTag];
  return map?.get(ctor.metaDefine().typeName) as T | undefined;
};

export const setMeta = <T extends UXMetaTag, O extends T["owner"]>(
  obj: O,
  ctor: IUXMetaConstructor<T>,
  meta: T
): void => {
  const owner = obj as Owner;
  let map = owner[metaTag];
  if (map === undefined) {
    map = new Map();
    owner[metaTag] = map;
  }

  const key = ctor.metaDefine().typeName;
  if (map.has(key)) {
    console.warn("Meta already exists for", key, meta, map.get(key));
  }
  meta.owner = obj;
  meta.onAttach?.();
  map.set(key, meta);
};

export const ensureMeta = <T extends UXMetaTag>(
  obj: T["owner"],
  ctor: IUXMetaConstructor<T>
): T => {
  let existing = getMeta(obj, ctor);
  if (!existing) {
    existing = new ctor();
    setMeta(obj, ctor, existing);
  }
  return existing;
};

export const allMeta = (obj: unknown): UXMetaTag[] => [
  ...((obj as Owner)[metaTag]?.values() ?? []),
];

export class MetaTagSet<O = unknown> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    pathux.MetaTagSet {
      tags: array(abstract(pathux.UXMetaTag));
    }`
  );

  onAttach() {
    // this.owner is set by calling code
    for (const tag of this.tags) {
      tag.owner = this.owner;
      tag.onAttach?.();
    }
  }

  tags = [] as UXMetaTag<O>[];
  declare owner: O;
}

// ==== tool meta ====

// A base class rather than an interface so abstract(UXToolMeta) names a registered struct and
// nstructjs validates each entry against it. Narrowing on `type` comes from the union the
// StdUXMeta generic is given (see MyUXTools below), not from this class.
export abstract class UXToolMeta<TYPE extends string = string> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    pathux.UXToolMeta {
      type: string;
      toolPath: string;
      requirements?: string;
    }`
  );

  abstract readonly type: TYPE;
  toolPath = "";
  /** Why the control refuses right now, or the precondition that would produce that sentence. */
  requirements?: string;

  copyTo(b: this): this {
    b.toolPath = this.toolPath;
    b.requirements = this.requirements;
    return b;
  }

  abstract copy(): this;
}

/* example
export class MyUXToolMetaExample extends UXToolMeta<"mytype"> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    pathux.MyUXToolMeta {
      supplies: array(string);
    }`
  );

  readonly type = "mytype" as const;
  // Prop names whose values are read from the widget when the tool runs.
  supplies: string[];

  constructor({
    toolPath,
    requirements,
    supplies,
  }: { toolPath?: string; requirements?: string; supplies?: string[] } = {}) {
    super();
    this.toolPath = toolPath ?? "";
    this.requirements = requirements;
    this.supplies = supplies ?? [];
  }

  copyTo(b: this): this {
    super.copyTo(b);
    b.supplies = [...this.supplies];
    return b;
  }

  copy(): this {
    return this.copyTo(new MyUXToolMetaExample() as this);
  }
}*/

/*
Note: presumably the meta tags are not meant to be permanently serialized along with model
data.  They may however be serialized to transmit data over IPC.
*/

export class StdUXMeta<
  UXToolTypes extends UXToolMeta = UXToolMeta,
  Elem extends MetaOwner = MetaOwner,
> extends UXMetaTag<Elem> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    pathux.StdUXMeta {
      widgetPath?: string;
      description?: string;
      valuePath?: string;
      tools: array(abstract(pathux.UXToolMeta));
    }`
  );
  static metaDefine() {
    return {
      typeName: "meta",
      inherits: false,
    } satisfies IUXMetaDef;
  }

  // holds values until an owner exists; also the storage when there is no owner at all,
  // which lets a rules module build a record headlessly
  private deserialHelper: {
    description?: string;
    valuePath?: string;
  } = {};

  /**
   * Names the widget on the wire. Filled at serialize time from the same DOM-path scheme
   * saveUIData uses for naming, without its ephemeral-data role.
   */
  widgetPath?: string;

  // not a base UIBase property
  tools: UXToolTypes[];

  get valuePath(): string | undefined {
    const owner = this.owner;
    if (holdsAttributes(owner)) {
      return owner.getAttribute("datapath") ?? undefined;
    }
    return this.deserialHelper.valuePath;
  }
  set valuePath(s: string | undefined) {
    const owner = this.owner;
    if (!holdsAttributes(owner)) {
      this.deserialHelper.valuePath = s;
      return;
    }
    if (s === undefined) {
      owner.removeAttribute("datapath");
    } else {
      owner.setAttribute("datapath", s);
    }
  }
  // tooltip
  get description(): string | undefined {
    const owner = this.owner;
    return holdsProperty(owner, "description")
      ? owner.description
      : this.deserialHelper.description;
  }
  set description(s: string | undefined) {
    const owner = this.owner;
    if (holdsProperty(owner, "description")) {
      owner.description = s;
    } else {
      this.deserialHelper.description = s;
    }
  }

  constructor(initialize?: { description?: string; valuePath?: string; tools?: UXToolTypes[] }) {
    super();
    this.deserialHelper.description = initialize?.description;
    this.deserialHelper.valuePath = initialize?.valuePath;
    this.tools = initialize?.tools ?? [];
  }

  copyTo(b: this): this {
    b.widgetPath = this.widgetPath;
    b.description = this.description;
    b.valuePath = this.valuePath;
    b.tools = this.tools.map((t) => t.copy());
    return b;
  }

  copy(): this {
    return this.copyTo(new StdUXMeta() as this);
  }

  onAttach = () => {
    // Flush only into properties the owner can hold; the rest stays buffered rather than dropped
    const buffered = this.deserialHelper;
    if (buffered.description !== undefined && holdsProperty(this.owner, "description")) {
      this.description = buffered.description;
      buffered.description = undefined;
    }
    if (buffered.valuePath !== undefined && holdsAttributes(this.owner)) {
      this.valuePath = buffered.valuePath;
      buffered.valuePath = undefined;
    }
  };
}
