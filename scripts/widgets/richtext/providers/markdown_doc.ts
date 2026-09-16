import { Icons } from "../../../icon_enum";
import { ATOM_CHAR } from "../provider";
import type { BlockId, DocPos, DocRange, MarkInfo } from "../provider";
import { clipMarks } from "./marks";
import { normalizeMdMarks } from "./markdown_inline";
import { mdBlock } from "./markdown_model";
import type { MdAtom, MdBlock, MdDoc, MdKind, MdMark } from "./markdown_model";

// What the provider's modules share about an `MdDoc`: block lookup, ordered ranges, the
// atom and mark arithmetic behind an edit, and a block's kind as a value.

/** A range in document order, with the indices of its end blocks. */
export interface OrderedRange {
  start: DocPos;
  end: DocPos;
  startIndex: number;
  endIndex: number;
}

/** What a delete reports: where the range collapsed to and what changed. */
export interface Cut {
  start: DocPos;
  dirty: BlockId[];
  removed: BlockId[];
}

// Glyphs rather than sprites: the icon sheet is the consumer's, and has no code glyph
export const MD_MARKS: readonly MarkInfo[] = [
  { name: "bold", label: "Bold (Ctrl+B)", icon: Icons.BOLD, glyph: "<b>B</b>" },
  { name: "italic", label: "Italic (Ctrl+I)", icon: Icons.ITALIC, glyph: "<i>I</i>" },
  { name: "underline", label: "Underline (Ctrl+U)", icon: Icons.UNDERLINE, glyph: "<u>U</u>" },
  {
    name : "strikethrough",
    label: "Strikethrough (Ctrl+Shift+S)",
    icon : Icons.STRIKETHRU,
    glyph: "<s>S</s>",
  },
  { name: "code", label: "Code", icon: Icons.FILE, glyph: "<code>&lt;/&gt;</code>" },
];

export const TOGGLE_NAMES: ReadonlySet<string> = new Set(MD_MARKS.map((m) => m.name));

export const OPAQUE_KINDS: ReadonlySet<MdBlock["kind"]> = new Set([
  "hr",
  "table",
  "raw",
  "frontmatter",
]);

export const isOpaque = (b: MdBlock) => OPAQUE_KINDS.has(b.kind);

export const collapsed = (block: BlockId, offset: number): DocRange => ({
  anchor: { block, offset },
  head  : { block, offset },
});

export const unique = (ids: readonly BlockId[]) => [...new Set(ids)];

export const cloneBlock = (b: MdBlock): MdBlock => structuredClone(b);

export function indexOf(doc: MdDoc, id: BlockId): number {
  const index = doc.blocks.findIndex((b) => b.id === id);
  if (index < 0) {
    throw new Error(`unknown block ${id}`);
  }

  return index;
}

export function blockOf(doc: MdDoc, id: BlockId): MdBlock {
  return doc.blocks[indexOf(doc, id)];
}

/** The block's text as the editor sees it; an opaque block answers one `ATOM_CHAR`, so its offsets run 0 to 1. */
export function textOf(doc: MdDoc, id: BlockId): string {
  const b = blockOf(doc, id);
  return isOpaque(b) ? ATOM_CHAR : b.text;
}

/** The range in document order, offsets clamped to their block's text. */
export function orderRange(doc: MdDoc, range: DocRange): OrderedRange {
  const ai = indexOf(doc, range.anchor.block);
  const hi = indexOf(doc, range.head.block);
  const clamp = (pos: DocPos, i: number): DocPos => ({
    block : pos.block,
    offset: Math.max(0, Math.min(pos.offset, textOf(doc, doc.blocks[i].id).length)),
  });
  const anchor = clamp(range.anchor, ai);
  const head = clamp(range.head, hi);

  if (ai < hi || (ai === hi && anchor.offset <= head.offset)) {
    return { start: anchor, end: head, startIndex: ai, endIndex: hi };
  }

  return { start: head, end: anchor, startIndex: hi, endIndex: ai };
}

/** The ids of the blocks a range covers, in document order. */
export function rangeBlocks(doc: MdDoc, range: DocRange): BlockId[] {
  const r = orderRange(doc, range);
  return doc.blocks.slice(r.startIndex, r.endIndex + 1).map((b) => b.id);
}

/** The non-empty runs of the range's editable, non-fence blocks. */
export function segments(doc: MdDoc, r: OrderedRange) {
  const out: { block: MdBlock; from: number; to: number }[] = [];

  for (let i = r.startIndex; i <= r.endIndex; i++) {
    const block = doc.blocks[i];
    if (isOpaque(block) || block.kind === "code") {
      continue;
    }
    const from = i === r.startIndex ? r.start.offset : 0;
    const to = i === r.endIndex ? r.end.offset : block.text.length;
    if (from < to) {
      out.push({ block, from, to });
    }
  }

  return out;
}

export const atomsAfterInsert = (atoms: readonly MdAtom[], pos: number, len: number) =>
  atoms.map((a) => (a.offset >= pos ? { ...a, offset: a.offset + len } : a));

export const atomsAfterDelete = (atoms: readonly MdAtom[], from: number, to: number) =>
  atoms
    .filter((a) => a.offset < from || a.offset >= to)
    .map((a) => (a.offset >= to ? { ...a, offset: a.offset - (to - from) } : a));

export const clipAtoms = (atoms: readonly MdAtom[], from: number, to: number, base: number) =>
  atoms
    .filter((a) => a.offset >= from && a.offset < to)
    .map((a) => ({ ...a, offset: a.offset - from + base }));

/** The block's marks normalized, every `break` mark pinned to the one newline it covers. */
export function fixMarks(block: MdBlock): MdMark[] {
  return normalizeMdMarks(
    block.marks.flatMap((m) => {
      if (m.name !== "break") {
        return [m];
      }

      return block.text[m.from] === "\n" ? [{ ...m, to: m.from + 1 }] : [];
    })
  );
}

/** Same block, `kind` swapped in: a fence keeps no marks or atoms, and the source's wrapper goes with the old kind. */
export function withKind(block: MdBlock, kind: MdKind): MdBlock {
  const next: MdBlock = {
    ...kind,
    id   : block.id,
    text : block.text,
    marks: block.marks,
    atoms: block.atoms,
  };

  if (kind.kind === "code") {
    next.text = next.text.split(ATOM_CHAR).join("");
    next.marks = [];
    next.atoms = [];
  } else if (OPAQUE_KINDS.has(kind.kind)) {
    next.text = "";
    next.marks = [];
    next.atoms = [];
  } else {
    next.marks = fixMarks(next);
  }

  return next;
}

/** The kind a block's tail takes when it splits: an item or quote like its own, else a paragraph. */
export function tailKind(block: MdBlock): MdKind {
  switch (block.kind) {
    case "listItem": {
      const kind: MdKind = { kind: "listItem", ordered: block.ordered, depth: block.depth };
      if (block.task) {
        kind.task = true;
        kind.checked = false;
      }
      return kind;
    }
    case "quote":
      return { kind: "quote", depth: block.depth };
    case "code":
      return { kind: "code", lang: block.lang };
    default:
      return { kind: "paragraph" };
  }
}

/** The kind alone, without the block's id and content. */
export function kindOf(b: MdBlock): MdKind {
  switch (b.kind) {
    case "paragraph":
      return { kind: "paragraph" };
    case "heading":
      return { kind: "heading", level: b.level };
    case "listItem": {
      const kind: MdKind = { kind: "listItem", ordered: b.ordered, depth: b.depth };
      if (b.task) {
        kind.task = true;
        kind.checked = b.checked === true;
      }
      return kind;
    }
    case "quote":
      return { kind: "quote", depth: b.depth };
    case "code":
      return { kind: "code", lang: b.lang };
    case "hr":
      return { kind: "hr" };
    default:
      return { kind: b.kind, source: b.source };
  }
}

/** A block holding `[from, to)` of `b` under `kind`, re-based to 0. */
export function slice(b: MdBlock, from: number, to: number, kind: MdKind): MdBlock {
  const out = withKind(
    {
      ...b,
      text : b.text.slice(from, to),
      marks: clipMarks(b.marks, from, to, 0, normalizeMdMarks),
      atoms: clipAtoms(b.atoms, from, to, 0),
    },
    kind
  );
  out.marks = fixMarks(out);
  return out;
}

/** Replaces the block at `index` with its paragraph form, empty. */
export function blank(doc: MdDoc, index: number): MdBlock {
  const b = doc.blocks[index];
  const next = mdBlock(b.id, { kind: "paragraph" });
  doc.blocks[index] = next;
  return next;
}
