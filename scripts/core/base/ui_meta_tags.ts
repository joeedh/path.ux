import type { Refusal } from "../../path-controller/toolsys/toolop";
import * as nstructjs from "../../path-controller/util/nstructjs";

// Tags attach to a control, are keyed by a stable type name rather than a constructor, and
// serialize with nstructjs so they can cross IPC. They are not part of the frame-mesh save file
// and hold no ephemeral state, which is saveData/loadData. See documentation/meta_tags.md.

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
// StdUXMeta generic is given, not from this class.
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

  /**
   * What tells this tool apart from another on a different control. Override it when the
   * subclass carries anything two otherwise identical controls would differ in; the default
   * reads `type` and `toolPath` alone. `widgetSegment` hashes the result, so changing what it
   * reads rewrites every committed `widgetPath` underneath it.
   */
  identity(): string {
    return `${this.type}\0${this.toolPath}`;
  }
}

/**
 * A control that runs one registered tool path. The default `identity()` is enough here, since
 * a tool path already names the tool and the class carries nothing else.
 */
export class PathToolMeta extends UXToolMeta<"path"> {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    pathux.PathToolMeta {
    }`
  );

  readonly type = "path" as const;

  constructor(toolPath = "", requirements?: string) {
    super();
    this.toolPath = toolPath;
    this.requirements = requirements;
  }

  copy(): this {
    return this.copyTo(new PathToolMeta() as this);
  }
}

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
      enabled: bool;
      refusal?: toolsys.Refusal;
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
    enabled?: boolean;
    refusal?: Refusal;
  } = {};

  /**
   * Names the widget on the wire, as `<scope>/<segment>`. Filled by the writer from
   * `widgetPathOf`, which supplies the scope and computes the segment with `widgetSegment`.
   * Deliberately not saveUIData's positional walk, which a single inserted widget rewrites.
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

  /**
   * Whether the control accepts a press. Buffered when the owner carries no `disabled`, and a
   * tag nothing has written reads as enabled.
   */
  get enabled(): boolean {
    const owner = this.owner;
    return holdsProperty(owner, "disabled")
      ? !owner.disabled
      : (this.deserialHelper.enabled ?? true);
  }
  set enabled(v: boolean) {
    const owner = this.owner;
    if (holdsProperty(owner, "disabled")) {
      owner.disabled = !v;
    } else {
      this.deserialHelper.enabled = v;
    }
  }

  /**
   * The refusal the control carries, whether or not it is disabled. Deliberately ungated, so
   * `resolveRefusal` is the wrong helper here: it answers undefined for an enabled control,
   * which erases the case a record exists to catch — a rule that computes a refusal for a
   * control the editor draws enabled. A display value is `enabled ? undefined : refusal`.
   */
  get refusal(): Refusal | undefined {
    const owner = this.owner;
    if (!holdsProperty(owner, "refusalReason")) {
      return this.deserialHelper.refusal;
    }
    const held = owner.refusalReason;
    return typeof held === "function" ? held() : held;
  }
  set refusal(r: Refusal | undefined) {
    const owner = this.owner;
    if (holdsProperty(owner, "refusalReason")) {
      owner.refusalReason = r;
    } else {
      this.deserialHelper.refusal = r;
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
    b.enabled = this.enabled;
    b.refusal = this.refusal;
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
    if (buffered.enabled !== undefined && holdsProperty(this.owner, "disabled")) {
      this.enabled = buffered.enabled;
      buffered.enabled = undefined;
    }
    if (buffered.refusal !== undefined && holdsProperty(this.owner, "refusalReason")) {
      this.refusal = buffered.refusal;
      buffered.refusal = undefined;
    }
  };
}

// ==== widgetPath ====

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const STEM_LIMIT = 24;

/**
 * Eight lowercase hex digits of FNV-1a over the UTF-16 bytes of `s`. Written here rather than
 * taken from `util.strhash`, whose module imports `mobile-detect` and touches the DOM; this one
 * has to run in a node process with no window.
 */
const digest = (s: string): string => {
  let h = FNV_OFFSET_BASIS;

  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = Math.imul(h ^ (c & 0xff), FNV_PRIME);
    h = Math.imul(h ^ (c >>> 8), FNV_PRIME);
  }

  return (h >>> 0).toString(16).padStart(8, "0");
};

/**
 * A data path with its list indices flattened, so `foo[3].bar` and `foo[7].bar` read the same.
 * Inserting a row would otherwise rewrite the path of every row after it.
 */
const flattenIndices = (path: string): string => path.replace(/\[\d+\]/g, "[]");

/** A readable stub of `source` for a person reading a diff. Carries no identity of its own. */
const stemOf = (source: string | undefined): string => {
  const slug = (source ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, STEM_LIMIT)
    .replace(/-+$/, "");

  return slug.length > 0 ? slug : "w";
};

/**
 * Names a control within a scope, as `<stem>~<hash>`. The hash reads an allow-list — the tag's
 * flattened `valuePath` and each tool's `identity()`, in order — so a field added to the tag
 * later cannot enter it by being forgotten, and `description`, `enabled` and `refusal` stay out
 * of it. Two controls in one scope that produce the same segment are a duplicate for the caller
 * to report; nothing here disambiguates them.
 */
export const widgetSegment = (tag: StdUXMeta): string => {
  const valuePath = flattenIndices(tag.valuePath ?? "");
  const identity = [valuePath, ...tag.tools.map((tool) => tool.identity())].join("\0");

  return `${stemOf(tag.tools[0]?.toolPath || valuePath)}~${digest(identity)}`;
};

// ==== deserialize ====

/**
 * Reads a tag back off the wire, refusing malformed json rather than constructing something
 * half-built. `validateJSON` runs first with a collecting logger, so a failure arrives as one
 * thrown Error naming the struct instead of the default logger's stack and the whole STRUCT
 * script on a console the caller is about to throw past anyway.
 */
export function readMetaJSON<T>(json: unknown, cls: nstructjs.StructableClass<T>): T {
  const complaints: string[] = [];
  const collect = (...args: unknown[]): void => {
    complaints.push(args.map((arg) => String(arg)).join(" "));
  };

  const name = cls.structName ?? cls.name ?? "(unnamed struct)";

  if (!nstructjs.validateJSON(json, cls as nstructjs.StructableClass, true, false, collect)) {
    throw new Error(`${name}: malformed json\n${complaints.join("\n")}`);
  }

  return nstructjs.readJSON<T>(json, cls);
}
