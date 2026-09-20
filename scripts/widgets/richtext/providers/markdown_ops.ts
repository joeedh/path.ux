import type { BlockId, DocPos, DocRange, EditOp, JsonValue } from "../provider";
import { moveAtomOp } from "./markdown_image";
import type { MdDoc, MdImage } from "./markdown_model";
import { markdownTableChange } from "./markdown_table";

// The provider's custom ops as a consumer builds them: each is a `custom` EditOp whose JSON
// `data` the provider reads back in `markdown_custom.ts`.

export type JsonRecord = Record<string, JsonValue>;

/** The kind a `setKind` op sets; depth is kept or starts at 0, and the ids for a split fence come in `ids`. */
export type MdKindTarget =
  | { kind: "paragraph" }
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { kind: "listItem"; ordered: boolean; task?: boolean }
  | { kind: "quote" }
  | { kind: "code"; lang?: string };

/** Builders for the provider's custom ops, so a toolbar or a test never writes the JSON by hand. */
export const markdownOps = {
  /** Changes a table against its complete expected source. */
  table: markdownTableChange,
  /** Sets the kind over `blocks`; `ids` supplies one unused id per line beyond the first when a fence splits. */
  setKind(
    blocks: readonly BlockId[],
    kind: MdKindTarget,
    extra: { ids?: readonly BlockId[]; selection?: DocRange } = {}
  ): EditOp {
    const data: JsonRecord = { ...kind };
    if (extra.ids !== undefined) {
      data.ids = [...extra.ids];
    }
    if (extra.selection !== undefined) {
      data.selection = { anchor: { ...extra.selection.anchor }, head: { ...extra.selection.head } };
    }
    return { type: "custom", name: "setKind", blocks: [...blocks], data };
  },

  /** Sets or shifts the depth of the items and quotes among `blocks`. */
  setDepth(
    blocks: readonly BlockId[],
    change: { depth?: number; delta?: number; selection?: DocRange }
  ): EditOp {
    const data: JsonRecord = {};
    if (change.depth !== undefined) {
      data.depth = change.depth;
    }
    if (change.delta !== undefined) {
      data.delta = change.delta;
    }
    if (change.selection !== undefined) {
      data.selection = {
        anchor: { ...change.selection.anchor },
        head  : { ...change.selection.head },
      };
    }
    return { type: "custom", name: "setDepth", blocks: [...blocks], data };
  },

  /** `checked` sets the box's state (and makes the item a task); `task: false` removes the box. */
  setTask(blocks: readonly BlockId[], change: { task?: boolean; checked?: boolean }): EditOp {
    const data: JsonRecord = {};
    if (change.task !== undefined) {
      data.task = change.task;
    }
    if (change.checked !== undefined) {
      data.checked = change.checked;
    }
    return { type: "custom", name: "setTask", blocks: [...blocks], data };
  },

  /** Links `[from, to)` of `block` to `target`; an empty target removes the link. */
  setLink(
    block: BlockId,
    from: number,
    to: number,
    link: { kind?: string; target: string; title?: string }
  ): EditOp {
    const data: JsonRecord = { from, to, target: link.target };
    if (link.kind !== undefined) {
      data.kind = link.kind;
    }
    if (link.title !== undefined) {
      data.title = link.title;
    }
    return { type: "custom", name: "setLink", blocks: [block], data };
  },

  /** Replaces `[from, to)` of `block` (the typed `[[` and whatever followed) with a wikilink to `target`, shown as `text` or the target. */
  insertWikilink(block: BlockId, from: number, to: number, target: string, text?: string): EditOp {
    const shown = text === undefined || text === "" ? target : text;
    const data: JsonRecord = { from, to, target };
    if (text !== undefined) {
      data.text = text;
    }
    return {
      type  : "custom",
      name  : "insertWikilink",
      blocks: [block],
      data,
      shifts: [{ block, at: from, delta: shown.length - (to - from) }],
    };
  },

  /** Inserts an image atom at `offset` of `block`, before whatever is there; the caret lands after it. */
  insertImage(block: BlockId, offset: number, image: MdImage): EditOp {
    const written: JsonRecord = { src: image.src, alt: image.alt };
    if (image.title !== undefined) {
      written.title = image.title;
    }
    if (image.width !== undefined) {
      written.width = image.width;
    }
    const data: JsonRecord = { offset, image: written };
    return {
      type  : "custom",
      name  : "insertImage",
      blocks: [block],
      data,
      shifts: [{ block, at: offset, delta: 1 }],
    };
  },

  /** Patches the image at `offset`; `width: null` removes the width. */
  setImage(
    block: BlockId,
    offset: number,
    patch: { width?: number | null; alt?: string; src?: string; title?: string }
  ): EditOp {
    const data: JsonRecord = { offset };
    for (const key of ["width", "alt", "src", "title"] as const) {
      const value = patch[key];
      if (value !== undefined) {
        data[key] = value;
      }
    }
    return { type: "custom", name: "setImage", blocks: [block], data };
  },

  /** Moves the atom at `from` to `to`; `blocks` is the span between them in document order. */
  moveAtom(doc: MdDoc, from: DocPos, to: DocPos): EditOp {
    return moveAtomOp(
      doc.blocks.map((b) => b.id),
      from,
      to
    );
  },

  /** A hard line break replacing `range`, which lies within one block. */
  insertBreak(range: DocRange): EditOp {
    const { anchor, head } = range;
    const start = Math.min(anchor.offset, head.offset);
    const end = Math.max(anchor.offset, head.offset);

    return {
      type  : "custom",
      name  : "insertBreak",
      blocks: [anchor.block],
      data  : { range: { anchor: { ...anchor }, head: { ...head } } },
      shifts: [{ block: anchor.block, at: start, delta: 1 - (end - start) }],
    };
  },
};
