import { ATOM_CHAR } from "../provider";
import type { BlockId, DocPos, DocRange, EditOp, EditResult, JsonValue } from "../provider";
import { cutMark, marksAfterDelete, marksAfterTyping } from "./marks";
import { normalizeMdMarks } from "./markdown_inline";
import type { MdBlock, MdDoc, MdImage, MdKind, MdMark } from "./markdown_model";
import { insertText } from "./markdown_edits";
import {
  atomsAfterDelete,
  atomsAfterInsert,
  blockOf,
  collapsed,
  fixMarks,
  indexOf,
  isOpaque,
  orderRange,
  textOf,
  unique,
  withKind,
} from "./markdown_doc";
import type { JsonRecord } from "./markdown_ops";

// The provider's side of its custom ops: the JSON `data` a `markdownOps` builder wrote, read
// back and applied to the document.

/** `v` when it is a JSON object; `Array.isArray` alone does not narrow a readonly array out of the union. */
function objectOf(v: JsonValue | undefined): JsonRecord | undefined {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as JsonRecord) : undefined;
}

/** `data` as an object, or an error naming the op. */
export function customData(op: EditOp & { type: "custom" }): JsonRecord {
  const data = objectOf(op.data);
  if (data === undefined) {
    throw new Error(`MarkdownProvider: ${op.name} needs an object as data`);
  }

  return data;
}

/** `v` as a position when it has the shape of one. */
function posOf(v: JsonValue | undefined): DocPos | undefined {
  const o = objectOf(v);
  if (o === undefined) {
    return undefined;
  }

  const { block, offset } = o;
  return typeof block === "string" && typeof offset === "number" ? { block, offset } : undefined;
}

/** `v` as a range when it has the shape of one. */
function rangeOf(v: JsonValue | undefined): DocRange | undefined {
  const o = objectOf(v);
  if (o === undefined) {
    return undefined;
  }

  const anchor = posOf(o.anchor);
  const head = posOf(o.head);
  return anchor !== undefined && head !== undefined ? { anchor, head } : undefined;
}

/** The selection a custom op's data names, clamped, or the caret at the end of `fallback`. */
function customSelection(doc: MdDoc, data: JsonRecord, fallback: BlockId): DocRange {
  const wanted = rangeOf(data.selection);
  if (
    wanted !== undefined &&
    doc.blocks.some((b) => b.id === wanted.anchor.block) &&
    doc.blocks.some((b) => b.id === wanted.head.block)
  ) {
    const r = orderRange(doc, wanted);
    return { anchor: r.start, head: r.end };
  }

  return collapsed(fallback, textOf(doc, fallback).length);
}

/** Applies a `custom` op; `shortcuts` is passed on to the text inserts some of them make. */
export function applyCustom(
  doc: MdDoc,
  op: EditOp & { type: "custom" },
  shortcuts: boolean
): EditResult {
  const data = customData(op);
  const span = op.blocks.map((id) => blockOf(doc, id));
  const first = span[0];
  if (first === undefined) {
    throw new Error(`MarkdownProvider: ${op.name} names no block`);
  }

  switch (op.name) {
    case "setKind":
      return setKind(doc, span, data);
    case "setDepth": {
      const dirty: BlockId[] = [];
      for (const b of span) {
        if (b.kind !== "listItem" && b.kind !== "quote") {
          continue;
        }
        const depth = Math.max(
          0,
          typeof data.depth === "number"
            ? data.depth
            : b.depth + (typeof data.delta === "number" ? data.delta : 0)
        );
        if (depth !== b.depth) {
          b.depth = depth;
          dirty.push(b.id);
        }
      }
      return {
        dirtyBlocks  : dirty,
        removedBlocks: [],
        selection    : customSelection(doc, data, first.id),
      };
    }
    case "setTask": {
      const dirty: BlockId[] = [];
      for (const b of span) {
        if (b.kind !== "listItem") {
          continue;
        }
        if (typeof data.checked === "boolean") {
          b.task = true;
          b.checked = data.checked;
        } else if (data.task === true) {
          b.task = true;
          b.checked = b.checked === true;
        } else if (data.task === false) {
          delete b.task;
          delete b.checked;
        }
        dirty.push(b.id);
      }
      return {
        dirtyBlocks  : dirty,
        removedBlocks: [],
        selection    : customSelection(doc, data, first.id),
      };
    }
    case "setLink":
      return setLink(doc, first, data);
    case "insertWikilink":
      return insertWikilink(doc, first, data, shortcuts);
    case "setImage":
      return setImage(doc, first, data);
    case "moveAtom":
      return moveAtom(doc, data);
    case "insertBreak": {
      const range = rangeOf(data.range);
      if (range === undefined) {
        throw new Error("MarkdownProvider: insertBreak needs a range");
      }
      return insertText(doc, range, "\n", true, shortcuts);
    }
    default:
      throw new Error(`MarkdownProvider: unknown custom op ${op.name}`);
  }
}

/**
 * Sets every editable block of the span to the target kind. To `code`, the span's blocks
 * merge into one fence; from `code`, a fence splits into one block per line, the ids for the
 * lines after the first taken from `data.ids`.
 */
function setKind(doc: MdDoc, span: readonly MdBlock[], data: JsonRecord): EditResult {
  const target = data.kind;
  const editable = span.filter((b) => !isOpaque(b));
  const dirty: BlockId[] = [];
  const removed: BlockId[] = [];
  const ids = Array.isArray(data.ids)
    ? data.ids.filter((id): id is string => typeof id === "string")
    : [];
  let idsUsed = 0;
  const nextId = () => {
    const id = ids[idsUsed++];
    if (id === undefined || doc.blocks.some((b) => b.id === id)) {
      throw new Error("setKind: a fence split needs one unused id per line in data.ids");
    }
    return id;
  };

  if (editable.length === 0) {
    return {
      dirtyBlocks  : [],
      removedBlocks: [],
      selection    : customSelection(doc, data, span[0].id),
    };
  }

  if (target === "code") {
    const lang = typeof data.lang === "string" ? data.lang : "";
    if (editable.every((b) => b.kind === "code")) {
      for (const b of editable) {
        if (b.kind === "code") {
          b.lang = lang;
          dirty.push(b.id);
        }
      }
    } else {
      const head = editable[0];
      const text = editable.map((b) => b.text).join("\n");
      const fence = withKind({ ...head, text }, { kind: "code", lang });
      doc.blocks[indexOf(doc, head.id)] = fence;
      for (const b of editable.slice(1)) {
        doc.blocks.splice(indexOf(doc, b.id), 1);
        removed.push(b.id);
      }
      dirty.push(fence.id);
    }

    return {
      dirtyBlocks  : dirty,
      removedBlocks: removed,
      selection    : customSelection(doc, data, dirty[dirty.length - 1]),
    };
  }

  const kindFor = (b: MdBlock): MdKind => {
    switch (target) {
      case "heading": {
        const level =
          typeof data.level === "number" ? Math.max(1, Math.min(6, Math.round(data.level))) : 1;
        return { kind: "heading", level: level as 1 | 2 | 3 | 4 | 5 | 6 };
      }
      case "listItem": {
        const kind: MdKind = {
          kind   : "listItem",
          ordered: data.ordered === true,
          depth  : b.kind === "listItem" ? b.depth : 0,
        };
        if (data.task === true || (data.task === undefined && b.kind === "listItem" && b.task)) {
          kind.task = true;
          kind.checked = b.kind === "listItem" && b.checked === true;
        }
        return kind;
      }
      case "quote":
        return { kind: "quote", depth: b.kind === "quote" ? b.depth : 0 };
      case "paragraph":
        return { kind: "paragraph" };
      default:
        throw new Error(`setKind: unknown kind ${String(target)}`);
    }
  };

  for (const b of editable) {
    const index = indexOf(doc, b.id);
    if (b.kind !== "code") {
      doc.blocks[index] = withKind(b, kindFor(b));
      dirty.push(b.id);
      continue;
    }

    const lines = b.text.split("\n");
    const blocks = lines.map((line, i) =>
      withKind(
        { ...b, id: i === 0 ? b.id : nextId(), text: line, marks: [], atoms: [] },
        kindFor(b)
      )
    );
    doc.blocks.splice(index, 1, ...blocks);
    dirty.push(...blocks.map((x) => x.id));
  }

  return {
    dirtyBlocks  : dirty,
    removedBlocks: removed,
    selection    : customSelection(doc, data, dirty[dirty.length - 1]),
  };
}

/** Replaces `[from, to)` of the block with a wiki link to `target`, shown as `text` or the target; refused without a target. */
function insertWikilink(doc: MdDoc, b: MdBlock, data: JsonRecord, shortcuts: boolean): EditResult {
  const from = typeof data.from === "number" ? data.from : 0;
  const to = typeof data.to === "number" ? data.to : from;
  const target = typeof data.target === "string" ? data.target : "";
  const text = typeof data.text === "string" && data.text !== "" ? data.text : target;

  if (isOpaque(b) || b.kind === "code" || from > to || to > b.text.length || target === "") {
    return { dirtyBlocks: [], removedBlocks: [], selection: collapsed(b.id, to) };
  }

  const result = insertText(
    doc,
    { anchor: { block: b.id, offset: from }, head: { block: b.id, offset: to } },
    text,
    false,
    shortcuts
  );
  const mark: MdMark = { from, to: from + text.length, name: "link", kind: "wiki", target };
  b.marks = normalizeMdMarks([
    ...cutMark(b.marks, "link", mark.from, mark.to, normalizeMdMarks),
    mark,
  ]);
  return result;
}

/** Sets the link over `[from, to)` of the block, or removes links there when `target` is empty. */
function setLink(doc: MdDoc, b: MdBlock, data: JsonRecord): EditResult {
  const from = typeof data.from === "number" ? data.from : 0;
  const to = typeof data.to === "number" ? data.to : from;
  const target = typeof data.target === "string" ? data.target : "";
  const none = {
    dirtyBlocks  : [],
    removedBlocks: [],
    selection    : customSelection(doc, data, b.id),
  };

  if (isOpaque(b) || b.kind === "code" || from >= to || to > b.text.length) {
    return none;
  }

  let marks = cutMark(b.marks, "link", from, to, normalizeMdMarks);
  if (target !== "") {
    const mark: MdMark = {
      from,
      to,
      name: "link",
      kind: typeof data.kind === "string" ? data.kind : "url",
      target,
    };
    if (typeof data.title === "string" && data.title !== "") {
      mark.title = data.title;
    }
    marks = normalizeMdMarks([...marks, mark]);
  }
  b.marks = marks;

  const range: DocRange = {
    anchor: { block: b.id, offset: from },
    head  : { block: b.id, offset: to },
  };
  return {
    dirtyBlocks  : [b.id],
    removedBlocks: [],
    selection    : data.selection === undefined ? range : customSelection(doc, data, b.id),
  };
}

/** Patches the image at `data.offset`: `width` (null removes it), `alt`, `src`, `title`. */
function setImage(doc: MdDoc, b: MdBlock, data: JsonRecord): EditResult {
  const atom = b.atoms.find((a) => a.offset === data.offset);
  if (atom === undefined) {
    return {
      dirtyBlocks  : [],
      removedBlocks: [],
      selection    : customSelection(doc, data, b.id),
    };
  }

  const image: MdImage = { ...atom.image };
  if (data.width === null) {
    delete image.width;
  } else if (typeof data.width === "number") {
    image.width = Math.max(1, Math.round(data.width));
  }
  for (const key of ["alt", "src", "title"] as const) {
    const value = data[key];
    if (typeof value === "string") {
      image[key] = value;
    }
  }
  atom.image = image;

  return { dirtyBlocks: [b.id], removedBlocks: [], selection: collapsed(b.id, atom.offset + 1) };
}

/** Moves the atom at `data.from` to `data.to`; refused into a fence or an opaque block. */
function moveAtom(doc: MdDoc, data: JsonRecord): EditResult {
  const from = posOf(data.from);
  const target = posOf(data.to);
  if (from === undefined || target === undefined) {
    throw new Error("MarkdownProvider: moveAtom needs from and to positions");
  }

  const source = blockOf(doc, from.block);
  const dest = blockOf(doc, target.block);
  const atom = source.atoms.find((a) => a.offset === from.offset);
  const none = {
    dirtyBlocks  : [],
    removedBlocks: [],
    selection    : collapsed(source.id, from.offset + 1),
  };

  if (atom === undefined || isOpaque(dest) || dest.kind === "code") {
    return none;
  }

  let to = Math.max(0, Math.min(target.offset, dest.text.length));
  const at = atom.offset;
  source.text = source.text.slice(0, at) + source.text.slice(at + 1);
  source.marks = marksAfterDelete(source.marks, at, at + 1, normalizeMdMarks);
  source.atoms = atomsAfterDelete(source.atoms, at, at + 1);
  if (dest === source && to > at) {
    to -= 1;
  }

  dest.text = dest.text.slice(0, to) + ATOM_CHAR + dest.text.slice(to);
  dest.marks = marksAfterTyping(dest.marks, to, 1, normalizeMdMarks);
  dest.atoms = [...atomsAfterInsert(dest.atoms, to, 1), { offset: to, image: atom.image }].sort(
    (a, b) => a.offset - b.offset
  );
  source.marks = fixMarks(source);
  dest.marks = fixMarks(dest);

  return {
    dirtyBlocks  : unique([source.id, dest.id]),
    removedBlocks: [],
    selection    : collapsed(dest.id, to + 1),
  };
}
