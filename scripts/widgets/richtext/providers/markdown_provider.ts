import { Icons } from "../../../icon_enum";
import type { RowFrame } from "../../../core/ui_containers";
import { EnumProperty } from "../../../path-controller/toolsys/toolprop";
import { openLinkPopup } from "../link_popup";
import { ATOM_CHAR, newBlockId } from "../provider";
import type {
  BlockId,
  BlockSnapshot,
  ClipboardContent,
  DocChange,
  DocPos,
  DocRange,
  DocumentProvider,
  EditOp,
  EditResult,
  HeadingInfo,
  JsonValue,
  MarkInfo,
  ProviderContext,
  ToolbarSync,
} from "../provider";
import { clipMarks, cutMark, hasMark, marksAfterDelete, marksAfterTyping } from "./marks";
import { moveAtomOp } from "./markdown_image";
import { htmlForBlock } from "./markdown_html";
import { normalizeMdMarks } from "./markdown_inline";
import { mdBlock } from "./markdown_model";
import type { MdAtom, MdBlock, MdDoc, MdImage, MdKind, MdMark, MdMarkName } from "./markdown_model";
import { markdownDocFromText } from "./markdown_parse";
import { renderMarkdownBlock, markdownStyles } from "./markdown_render";
import type { MarkdownRenderOptions } from "./markdown_render";
import { markdownText } from "./markdown_serialize";
import { addMarkButtons, addSeparator, addToolButton } from "./toolbar";

// The provider over `MdDoc`: the standard ops interpreted by block kind, the custom ops a
// markdown toolbar needs, and the clipboard as markdown source. Reached through
// `richtext/markdown.ts`, never the barrel.

/** What the app is told as a `[[` is typed, before the second `[` lands: `offset` is where the caret will then be. */
export interface WikilinkStart {
  block: BlockId;
  offset: number;
  event: KeyboardEvent;
}

export interface MarkdownProviderOptions extends MarkdownRenderOptions {
  /** Whether a marker typed at the start of a paragraph (`# `, `- `, `1. `, `> `, three backticks) changes its kind; on by default. */
  shortcuts?: boolean;
  /**
   * Called from `handleKey` as the second `[` of a `[[` is typed, so the app can open its own
   * wikilink completion; the key still inserts. A pick lands through `markdownOps.insertWikilink`.
   */
  onWikilinkStart?: (start: WikilinkStart) => void;
}

/** A marker typed at the start of a paragraph and the kind it turns the paragraph into. */
const SHORTCUTS: { marker: RegExp; kind: (match: RegExpMatchArray) => MdKind }[] = [
  {
    marker: /^(#{1,6}) $/,
    kind  : (m) => ({ kind: "heading", level: m[1].length as 1 | 2 | 3 | 4 | 5 | 6 }),
  },
  { marker: /^[-*+] $/, kind: () => ({ kind: "listItem", ordered: false, depth: 0 }) },
  { marker: /^\d+\. $/, kind: () => ({ kind: "listItem", ordered: true, depth: 0 }) },
  { marker: /^> $/, kind: () => ({ kind: "quote", depth: 0 }) },
  { marker: /^```$/, kind: () => ({ kind: "code", lang: "" }) },
];

/** Marks the HTML the provider writes to the clipboard, so a paste of its own copy reads the markdown entries instead. */
const OWN_HTML_MARK = "data-richtext-markdown";

/** The kind a `setKind` op sets; depth is kept or starts at 0, and the ids for a split fence come in `ids`. */
export type MdKindTarget =
  | { kind: "paragraph" }
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { kind: "listItem"; ordered: boolean; task?: boolean }
  | { kind: "quote" }
  | { kind: "code"; lang?: string };

interface OrderedRange {
  start: DocPos;
  end: DocPos;
  startIndex: number;
  endIndex: number;
}

// Glyphs rather than sprites: the icon sheet is the consumer's, and has no code glyph
const MD_MARKS: readonly MarkInfo[] = [
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

/** The kinds the toolbar's dropdown offers, in its order. */
const KIND_CHOICES: readonly { key: string; label: string; kind: MdKindTarget }[] = [
  { key: "paragraph", label: "Paragraph", kind: { kind: "paragraph" } },
  { key: "heading1", label: "Heading 1", kind: { kind: "heading", level: 1 } },
  { key: "heading2", label: "Heading 2", kind: { kind: "heading", level: 2 } },
  { key: "heading3", label: "Heading 3", kind: { kind: "heading", level: 3 } },
  { key: "heading4", label: "Heading 4", kind: { kind: "heading", level: 4 } },
  { key: "heading5", label: "Heading 5", kind: { kind: "heading", level: 5 } },
  { key: "heading6", label: "Heading 6", kind: { kind: "heading", level: 6 } },
  { key: "quote", label: "Quote", kind: { kind: "quote" } },
  { key: "code", label: "Code block", kind: { kind: "code" } },
];

/** The dropdown key that shows a block's kind; a list item shows as the paragraph it holds. */
function kindKey(b: MdBlock): string {
  switch (b.kind) {
    case "heading":
      return `heading${b.level}`;
    case "quote":
    case "code":
      return b.kind;
    default:
      return "paragraph";
  }
}

const TOGGLE_NAMES: ReadonlySet<string> = new Set(MD_MARKS.map((m) => m.name));

const OPAQUE_KINDS: ReadonlySet<MdBlock["kind"]> = new Set(["hr", "table", "raw", "frontmatter"]);

const isOpaque = (b: MdBlock) => OPAQUE_KINDS.has(b.kind);

const collapsed = (block: BlockId, offset: number): DocRange => ({
  anchor: { block, offset },
  head  : { block, offset },
});

const unique = (ids: readonly BlockId[]) => [...new Set(ids)];

const cloneBlock = (b: MdBlock): MdBlock => structuredClone(b);

type JsonRecord = Record<string, JsonValue>;

/** `v` when it is a JSON object; `Array.isArray` alone does not narrow a readonly array out of the union. */
function objectOf(v: JsonValue | undefined): JsonRecord | undefined {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as JsonRecord) : undefined;
}

/** `data` as an object, or an error naming the op. */
function record(op: EditOp & { type: "custom" }): JsonRecord {
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

/** What `deleteRangeImpl` reports: where the range collapsed to and what changed. */
interface Cut {
  start: DocPos;
  dirty: BlockId[];
  removed: BlockId[];
}

const atomsAfterInsert = (atoms: readonly MdAtom[], pos: number, len: number) =>
  atoms.map((a) => (a.offset >= pos ? { ...a, offset: a.offset + len } : a));

const atomsAfterDelete = (atoms: readonly MdAtom[], from: number, to: number) =>
  atoms
    .filter((a) => a.offset < from || a.offset >= to)
    .map((a) => (a.offset >= to ? { ...a, offset: a.offset - (to - from) } : a));

const clipAtoms = (atoms: readonly MdAtom[], from: number, to: number, base: number) =>
  atoms
    .filter((a) => a.offset >= from && a.offset < to)
    .map((a) => ({ ...a, offset: a.offset - from + base }));

/** The block's marks normalized, every `break` mark pinned to the one newline it covers. */
function fixMarks(block: MdBlock): MdMark[] {
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
function withKind(block: MdBlock, kind: MdKind): MdBlock {
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
function tailKind(block: MdBlock): MdKind {
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
function kindOf(b: MdBlock): MdKind {
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

/** One clipboard entry: the block's markdown source, an item indented two spaces per depth. */
/**
 * Clipboard HTML made parseable as markdown: the head and comments go, and a blank line between
 * tags is closed up, since it would end the HTML block and split the element across two.
 */
function clipboardHtml(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s*\n(?:\s*\n)+\s*</g, ">\n<")
    .trim();
}

function entryOf(block: MdBlock): string {
  const source = markdownText({ blocks: [block] }).replace(/\n+$/, "");
  return block.kind === "listItem" ? "  ".repeat(block.depth) + source : source;
}

/**
 * The provider over `MdDoc`. Paragraphs, headings, list items, quotes and fences are edited in
 * place; rules, tables, raw HTML and front matter are opaque, one `ATOM_CHAR` long, deleted
 * as a unit and never typed into. `inverse` answers with a `replaceBlocks` snapshot of the
 * contiguous span an edit touches, as the reference provider does.
 */
export class MarkdownProvider implements DocumentProvider<MdDoc> {
  private listeners = new WeakMap<MdDoc, Set<(change: DocChange) => void>>();

  constructor(readonly options: MarkdownProviderOptions = {}) {}

  blocks(doc: MdDoc) {
    return doc.blocks.map((b) => b.id);
  }

  /** The block's text; an opaque block answers one `ATOM_CHAR`, so its offsets run 0 to 1. */
  blockText(doc: MdDoc, block: BlockId) {
    const b = this.block(doc, block);
    return isOpaque(b) ? ATOM_CHAR : b.text;
  }

  isOpaque(doc: MdDoc, block: BlockId) {
    return isOpaque(this.block(doc, block));
  }

  marks() {
    return MD_MARKS;
  }

  activeMarks(doc: MdDoc, range: DocRange): readonly string[] {
    const r = this.order(doc, range);
    const names = MD_MARKS.map((m) => m.name);

    if (r.startIndex === r.endIndex && r.start.offset === r.end.offset) {
      const { marks } = doc.blocks[r.startIndex];
      const pos = r.start.offset;
      return names.filter((name) =>
        marks.some((m) => m.name === name && m.from < pos && pos <= m.to)
      );
    }

    const segments = this.segments(doc, r);
    if (segments.length === 0) {
      return [];
    }

    return names.filter((name) =>
      segments.every(({ block, from, to }) => hasMark(block.marks, name, from, to))
    );
  }

  headings(doc: MdDoc): HeadingInfo[] {
    const out: HeadingInfo[] = [];
    for (const b of doc.blocks) {
      if (b.kind === "heading") {
        out.push({ block: b.id, level: b.level });
      }
    }

    return out;
  }

  renderBlock(doc: MdDoc, block: BlockId, ctx: ProviderContext): HTMLElement {
    return renderMarkdownBlock(this.block(doc, block), ctx, this.options);
  }

  styles() {
    return markdownStyles();
  }

  /**
   * The kind dropdown, the mark buttons, the three list toggles and the Link button. Each edit
   * goes over the blocks the selection spans; the sync keeps the last document and selection
   * so a press can find them after the button has taken the pointer.
   */
  buildToolbar(row: RowFrame<ProviderContext>, ctx: ProviderContext): ToolbarSync<MdDoc> {
    let lastDoc: MdDoc | undefined;
    let lastSelection: DocRange | undefined;

    const current = () => {
      const doc = lastDoc;
      const range = ctx.editor.selection() ?? lastSelection;
      if (doc === undefined || range === undefined) {
        return undefined;
      }
      const r = this.order(doc, range);
      const editable = doc.blocks.slice(r.startIndex, r.endIndex + 1).filter((b) => !isOpaque(b));
      return editable.length === 0 ? undefined : { doc, range, editable };
    };

    const setKind = (kind: MdKindTarget) => {
      const cur = current();
      if (cur === undefined) {
        return;
      }
      // a fence that splits needs one fresh id per line beyond its first
      const lines =
        kind.kind === "code"
          ? 0
          : cur.editable
              .filter((b) => b.kind === "code")
              .reduce((n, b) => n + b.text.split("\n").length - 1, 0);
      const ids = lines > 0 ? Array.from({ length: lines }, () => newBlockId()) : undefined;
      void ctx.editor.dispatch(
        markdownOps.setKind(
          cur.editable.map((b) => b.id),
          kind,
          { ids, selection: cur.range }
        )
      );
    };

    const kindProp = new EnumProperty(
      "paragraph",
      Object.fromEntries(KIND_CHOICES.map((c) => [c.key, c.key])),
      undefined,
      "Block"
    ).addUINames(Object.fromEntries(KIND_CHOICES.map((c) => [c.key, c.label])));
    const kinds = row.listenum(undefined, {
      enumDef : kindProp,
      callback: (id) => {
        const choice = KIND_CHOICES.find((c) => c.key === id);
        if (choice !== undefined) {
          setKind(choice.kind);
        }
      },
    });
    kinds.setAttribute("data-testid", "richtext-kind");
    kinds.setValue("paragraph");

    addSeparator(row);
    const syncMarks = addMarkButtons(row, ctx, this);
    addSeparator(row);

    // a list toggle lit for the whole span turns it back into paragraphs
    const listButton = (
      glyph: string,
      label: string,
      testid: string,
      lit: (b: MdBlock) => boolean,
      kind: MdKindTarget
    ) => {
      const btn = addToolButton(row, glyph, label, () => {
        const cur = current();
        if (cur === undefined) {
          return;
        }
        setKind(cur.editable.every(lit) ? { kind: "paragraph" } : kind);
      });
      btn.setAttribute("data-testid", testid);
      return { btn, lit };
    };
    const lists = [
      listButton(
        "&bull;",
        "Bulleted list",
        "richtext-list-bullet",
        (b) => b.kind === "listItem" && !b.ordered && !b.task,
        { kind: "listItem", ordered: false, task: false }
      ),
      listButton(
        "1.",
        "Numbered list",
        "richtext-list-numbered",
        (b) => b.kind === "listItem" && b.ordered && !b.task,
        { kind: "listItem", ordered: true, task: false }
      ),
      listButton(
        "&#9745;",
        "Task list",
        "richtext-list-task",
        (b) => b.kind === "listItem" && b.task === true,
        { kind: "listItem", ordered: false, task: true }
      ),
    ];

    addSeparator(row);
    const link = addToolButton(row, "Link", "Link the selection", () => {
      const cur = current();
      const range = cur?.range;
      if (cur === undefined || range === undefined || range.anchor.block !== range.head.block) {
        return;
      }
      if (range.anchor.offset === range.head.offset) {
        return;
      }
      const block = cur.editable[0];
      const from = Math.min(range.anchor.offset, range.head.offset);
      const existing = block.marks.find(
        (m): m is MdMark & { name: "link" } => m.name === "link" && m.from <= from && from < m.to
      );
      const rect = link.getBoundingClientRect();
      openLinkPopup(
        row,
        ctx.editor,
        {
          range,
          kind  : existing?.kind ?? "url",
          target: existing?.target ?? "",
          title : existing?.title,
        },
        rect.left,
        rect.bottom + 4
      );
    });
    link.setAttribute("data-testid", "richtext-link");

    return (doc, selection) => {
      lastDoc = doc;
      lastSelection = selection;
      syncMarks(doc, selection);

      const head = selection === undefined ? undefined : this.block(doc, selection.head.block);
      kinds.setValue(head === undefined ? "paragraph" : kindKey(head));
      for (const { btn, lit } of lists) {
        btn.active = head !== undefined && lit(head);
      }
      link.active =
        head !== undefined &&
        selection !== undefined &&
        head.marks.some(
          (m) =>
            m.name === "link" && m.from < selection.head.offset && selection.head.offset <= m.to
        );
    };
  }

  /**
   * Tab and Shift+Tab on a list item change its depth; Enter in a fence adds a line, or leaves
   * the fence from an empty last line; Shift+Enter is a hard line break in any editable block.
   */
  handleKey(doc: MdDoc, range: DocRange, e: KeyboardEvent): EditOp | undefined {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return undefined;
    }

    const r = this.order(doc, range);
    const b = doc.blocks[r.startIndex];
    const single = r.startIndex === r.endIndex;
    const isCollapsed = single && r.start.offset === r.end.offset;

    // the key falls through and inserts; the app hears about the [[ first
    if (
      e.key === "[" &&
      isCollapsed &&
      !isOpaque(b) &&
      b.kind !== "code" &&
      b.text[r.start.offset - 1] === "[" &&
      this.options.onWikilinkStart !== undefined
    ) {
      this.options.onWikilinkStart({ block: b.id, offset: r.start.offset + 1, event: e });
      return undefined;
    }

    if (e.key === "Tab") {
      if (b.kind !== "listItem") {
        return undefined;
      }

      const blocks = doc.blocks.slice(r.startIndex, r.endIndex + 1).map((x) => x.id);
      return markdownOps.setDepth(blocks, { delta: e.shiftKey ? -1 : 1, selection: range });
    }

    if (e.key !== "Enter" || isOpaque(b)) {
      return undefined;
    }

    if (b.kind === "code" && single) {
      const atEnd = isCollapsed && r.start.offset === b.text.length;
      if (atEnd && (b.text === "" || b.text.endsWith("\n"))) {
        return { type: "splitBlock", at: r.start, newBlock: newBlockId() };
      }

      return { type: "insertText", at: range, text: "\n" };
    }

    if (e.shiftKey) {
      return single
        ? markdownOps.insertBreak(range)
        : { type: "insertText", at: range, text: "\n" };
    }

    return undefined;
  }

  applyEdit(doc: MdDoc, op: EditOp): EditResult {
    switch (op.type) {
      case "insertText":
        return this.insertText(doc, op.at, op.text, false);
      case "deleteRange": {
        const cut = this.deleteRangeImpl(doc, op.range);
        return {
          dirtyBlocks  : cut.dirty,
          removedBlocks: cut.removed,
          selection    : collapsed(cut.start.block, cut.start.offset),
        };
      }
      case "splitBlock":
        return this.splitBlock(doc, op.at, op.newBlock);
      case "joinWithPrevious":
        return this.joinWithPrevious(doc, op.block);
      case "toggleMark":
        return this.toggleMark(doc, op.range, op.mark);
      case "insertContent":
        return this.insertContent(doc, op.at, op.content, op.newBlocks);
      case "replaceBlocks":
        return this.replaceBlocks(doc, op.after, op.blocks, op.remove);
      case "custom":
        return this.custom(doc, op);
    }
  }

  inverse(doc: MdDoc, op: EditOp): EditOp {
    let touched: BlockId[] = [];
    let created: readonly BlockId[] = [];
    let after: BlockId | null | undefined;

    switch (op.type) {
      case "insertText":
        touched = this.rangeBlocks(doc, op.at);
        break;
      case "deleteRange":
      case "toggleMark":
        touched = this.rangeBlocks(doc, op.range);
        break;
      case "insertContent":
        touched = this.rangeBlocks(doc, op.at);
        created = op.newBlocks;
        break;
      case "splitBlock":
        touched = [op.at.block];
        created = [op.newBlock];
        break;
      case "joinWithPrevious": {
        const index = this.index(doc, op.block);
        touched = index === 0 ? [op.block] : [doc.blocks[index - 1].id, op.block];
        break;
      }
      case "replaceBlocks": {
        const removing = new Set(op.remove);
        touched = doc.blocks.filter((b) => removing.has(b.id)).map((b) => b.id);
        created = op.blocks.map((b) => b.id);
        if (touched.length === 0) {
          after = op.after;
        }
        break;
      }
      case "custom": {
        // the span between the op's outermost blocks, whatever it listed in between
        const indices = op.blocks.map((id) => this.index(doc, id));
        const first = Math.min(...indices);
        const last = Math.max(...indices);
        touched = doc.blocks.slice(first, last + 1).map((b) => b.id);

        const ids = record(op).ids;
        if (Array.isArray(ids)) {
          created = ids.filter((id): id is string => typeof id === "string");
        }
        break;
      }
    }

    if (after === undefined) {
      const first = touched.length > 0 ? this.index(doc, touched[0]) : 0;
      after = first > 0 ? doc.blocks[first - 1].id : null;
    }

    return {
      type: "replaceBlocks",
      after,
      blocks: this.snapshots(doc, touched),
      remove: unique([...touched, ...created]),
    };
  }

  snapshots(doc: MdDoc, blocks: readonly BlockId[] = this.blocks(doc)): BlockSnapshot[] {
    return blocks.map((id) => ({ id, state: cloneBlock(this.block(doc, id)) }));
  }

  /**
   * One markdown source entry per covered block: a whole block as itself, a partial block as
   * inline content, a partial fence as its bare lines. `html` carries the same blocks.
   */
  toClipboard(doc: MdDoc, range: DocRange): ClipboardContent {
    const r = this.order(doc, range);
    const blocks: string[] = [];
    let html = "";

    for (let i = r.startIndex; i <= r.endIndex; i++) {
      const b = doc.blocks[i];
      const length = this.blockText(doc, b.id).length;
      const from = i === r.startIndex ? r.start.offset : 0;
      const to = i === r.endIndex ? r.end.offset : length;

      if (isOpaque(b)) {
        if (from === 0 && to === 1) {
          blocks.push(entryOf(b));
          html += htmlForBlock(b);
        }
        continue;
      }

      const whole = from === 0 && to === b.text.length;
      const sliced = whole ? b : this.slice(b, from, to, { kind: "paragraph" });
      if (whole) {
        blocks.push(entryOf(b));
      } else if (b.kind === "code") {
        blocks.push(b.text.slice(from, to));
      } else {
        blocks.push(entryOf(sliced));
      }
      html += htmlForBlock(sliced);
    }

    return { blocks, html: `<div ${OWN_HTML_MARK}>${html}</div>`, text: blocks.join("\n") };
  }

  /** The plain text parsed as markdown, one entry per block it holds; `text` keeps it verbatim for a fence. */
  fromClipboard(data: DataTransfer): ClipboardContent | undefined {
    const text = data.types.includes("text/plain")
      ? data.getData("text/plain").replace(/\r\n?/g, "\n")
      : undefined;

    // HTML from elsewhere becomes blocks through the parser's HTML rules; the provider's own
    // copy carries the exact markdown as text, which is better than its rendering
    const html = data.types.includes("text/html") ? data.getData("text/html") : "";
    if (html !== "" && !html.includes(OWN_HTML_MARK)) {
      const blocks = markdownDocFromText(clipboardHtml(html)).blocks.map(entryOf);
      if (blocks.length > 0) {
        return { blocks, text: text ?? blocks.join("\n") };
      }
    }

    if (text === undefined) {
      return undefined;
    }
    const blocks = markdownDocFromText(text).blocks.map(entryOf);

    return { blocks: blocks.length > 0 ? blocks : [""], text };
  }

  /** The document as markdown, as `text/markdown`. */
  emitDocFile(doc: MdDoc): Blob {
    return new Blob([markdownText(doc)], { type: "text/markdown" });
  }

  onExternalChange(doc: MdDoc, listener: (change: DocChange) => void) {
    let set = this.listeners.get(doc);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(doc, set);
    }
    set.add(listener);

    return () => {
      set.delete(listener);
    };
  }

  /** Reports a change made to `doc` outside `applyEdit` to every `onExternalChange` listener. */
  notifyChange(doc: MdDoc, change: DocChange) {
    const set = this.listeners.get(doc);
    if (set === undefined) {
      return;
    }

    for (const listener of [...set]) {
      listener(change);
    }
  }

  private block(doc: MdDoc, id: BlockId) {
    return doc.blocks[this.index(doc, id)];
  }

  private index(doc: MdDoc, id: BlockId) {
    const index = doc.blocks.findIndex((b) => b.id === id);
    if (index < 0) {
      throw new Error(`unknown block ${id}`);
    }

    return index;
  }

  /** The range in document order, offsets clamped to their block's text. */
  private order(doc: MdDoc, range: DocRange): OrderedRange {
    const ai = this.index(doc, range.anchor.block);
    const hi = this.index(doc, range.head.block);
    const clamp = (pos: DocPos, i: number): DocPos => ({
      block : pos.block,
      offset: Math.max(0, Math.min(pos.offset, this.blockText(doc, doc.blocks[i].id).length)),
    });
    const anchor = clamp(range.anchor, ai);
    const head = clamp(range.head, hi);

    if (ai < hi || (ai === hi && anchor.offset <= head.offset)) {
      return { start: anchor, end: head, startIndex: ai, endIndex: hi };
    }

    return { start: head, end: anchor, startIndex: hi, endIndex: ai };
  }

  private rangeBlocks(doc: MdDoc, range: DocRange) {
    const r = this.order(doc, range);
    return doc.blocks.slice(r.startIndex, r.endIndex + 1).map((b) => b.id);
  }

  /** The non-empty runs of the range's editable, non-fence blocks. */
  private segments(doc: MdDoc, r: OrderedRange) {
    const segments: { block: MdBlock; from: number; to: number }[] = [];

    for (let i = r.startIndex; i <= r.endIndex; i++) {
      const block = doc.blocks[i];
      if (isOpaque(block) || block.kind === "code") {
        continue;
      }
      const from = i === r.startIndex ? r.start.offset : 0;
      const to = i === r.endIndex ? r.end.offset : block.text.length;
      if (from < to) {
        segments.push({ block, from, to });
      }
    }

    return segments;
  }

  /** A block holding `[from, to)` of `b` under `kind`, re-based to 0. */
  private slice(b: MdBlock, from: number, to: number, kind: MdKind): MdBlock {
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
  private blank(doc: MdDoc, index: number): MdBlock {
    const b = doc.blocks[index];
    const next = mdBlock(b.id, { kind: "paragraph" });
    doc.blocks[index] = next;
    return next;
  }

  /**
   * Removes the range's text, joining its outer blocks. An opaque block is removed when the
   * range covers it and left alone when the range only touches its edge; one that was the
   * only thing removed becomes an empty paragraph, so its id survives. A range from the end
   * of one block to the start of another with only opaque blocks between, which is what a
   * browser reports for Backspace or Delete beside one, removes them without joining.
   */
  private deleteRangeImpl(doc: MdDoc, range: DocRange): Cut {
    const r = this.order(doc, range);
    const none: Cut = { start: r.start, dirty: [], removed: [] };

    if (r.startIndex === r.endIndex) {
      const b = doc.blocks[r.startIndex];
      if (r.start.offset === r.end.offset) {
        return none;
      }
      if (isOpaque(b)) {
        this.blank(doc, r.startIndex);
        return { start: { block: b.id, offset: 0 }, dirty: [b.id], removed: [] };
      }

      b.text = b.text.slice(0, r.start.offset) + b.text.slice(r.end.offset);
      b.marks = marksAfterDelete(b.marks, r.start.offset, r.end.offset, normalizeMdMarks);
      b.atoms = atomsAfterDelete(b.atoms, r.start.offset, r.end.offset);
      b.marks = fixMarks(b);

      return { start: r.start, dirty: [b.id], removed: [] };
    }

    let { startIndex, endIndex, start, end } = r;

    // a range that begins after an opaque block or ends before one leaves it alone
    if (isOpaque(doc.blocks[startIndex]) && start.offset >= 1) {
      startIndex++;
      start = { block: doc.blocks[startIndex].id, offset: 0 };
    }
    if (isOpaque(doc.blocks[endIndex]) && end.offset === 0) {
      endIndex--;
      end = {
        block : doc.blocks[endIndex].id,
        offset: this.blockText(doc, doc.blocks[endIndex].id).length,
      };
    }
    if (startIndex > endIndex) {
      return none;
    }
    if (startIndex === endIndex) {
      return this.deleteRangeImpl(doc, { anchor: start, head: end });
    }

    let first = doc.blocks[startIndex];
    let last = doc.blocks[endIndex];
    const between = doc.blocks.slice(startIndex + 1, endIndex);
    if (
      between.length > 0 &&
      between.every(isOpaque) &&
      !isOpaque(first) &&
      !isOpaque(last) &&
      start.offset >= first.text.length &&
      end.offset === 0
    ) {
      doc.blocks.splice(startIndex + 1, between.length);
      return { start, dirty: [], removed: between.map((b) => b.id) };
    }

    if (isOpaque(first)) {
      first = this.blank(doc, startIndex);
      start = { block: first.id, offset: 0 };
    }
    if (isOpaque(last)) {
      last = this.blank(doc, endIndex);
      end = { block: last.id, offset: 0 };
    }

    const removed = doc.blocks.slice(startIndex + 1, endIndex + 1).map((b) => b.id);
    const joined = withKind(
      {
        ...first,
        text : first.text.slice(0, start.offset) + last.text.slice(end.offset),
        marks: [
          ...clipMarks(first.marks, 0, start.offset, 0, normalizeMdMarks),
          ...clipMarks(last.marks, end.offset, last.text.length, start.offset, normalizeMdMarks),
        ],
        atoms: [
          ...clipAtoms(first.atoms, 0, start.offset, 0),
          ...clipAtoms(last.atoms, end.offset, last.text.length, start.offset),
        ],
      },
      kindOf(first)
    );
    joined.html = first.html;
    doc.blocks[startIndex] = joined;
    doc.blocks.splice(startIndex + 1, endIndex - startIndex);

    return { start: { block: joined.id, offset: start.offset }, dirty: [joined.id], removed };
  }

  /** Typing, or a hard break when `hardBreak` is set and the text is one newline. */
  private insertText(doc: MdDoc, at: DocRange, text: string, hardBreak: boolean): EditResult {
    const cut = this.deleteRangeImpl(doc, at);
    const b = this.block(doc, cut.start.block);
    const pos = cut.start.offset;

    if (isOpaque(b)) {
      return {
        dirtyBlocks  : cut.dirty,
        removedBlocks: cut.removed,
        selection    : collapsed(b.id, pos),
      };
    }

    const inserted = b.kind === "code" ? text.split(ATOM_CHAR).join("") : text;
    b.text = b.text.slice(0, pos) + inserted + b.text.slice(pos);
    b.atoms = atomsAfterInsert(b.atoms, pos, inserted.length);
    if (b.kind !== "code") {
      b.marks = marksAfterTyping(b.marks, pos, inserted.length, normalizeMdMarks);
      if (hardBreak && inserted === "\n") {
        b.marks.push({ from: pos, to: pos + 1, name: "break" });
      }
      b.marks = fixMarks(b);
    }

    const caret = pos + inserted.length;
    // one character at a time is typing; a longer insert is composed or dispatched text
    const shortcut = inserted.length === 1 ? this.shortcutAt(b, caret) : undefined;
    if (shortcut !== undefined) {
      // the marker goes and the rest of the paragraph becomes the block, under the same id
      doc.blocks[this.index(doc, b.id)] = this.slice(b, caret, b.text.length, shortcut);
      return {
        dirtyBlocks  : unique([b.id, ...cut.dirty]),
        removedBlocks: cut.removed,
        selection    : collapsed(b.id, 0),
      };
    }

    return {
      dirtyBlocks  : unique([b.id, ...cut.dirty]),
      removedBlocks: cut.removed,
      selection    : collapsed(b.id, caret),
    };
  }

  /** The kind a typing shortcut turns `b` into when the text before `caret` is exactly a marker. */
  private shortcutAt(b: MdBlock, caret: number): MdKind | undefined {
    if (this.options.shortcuts === false || b.kind !== "paragraph" || b.text.length === 0) {
      return undefined;
    }

    const head = b.text.slice(0, caret);
    for (const { marker, kind } of SHORTCUTS) {
      const match = marker.exec(head);
      if (match !== null) {
        return kind(match);
      }
    }
    return undefined;
  }

  private splitBlock(doc: MdDoc, at: DocPos, newBlock: BlockId): EditResult {
    if (doc.blocks.some((b) => b.id === newBlock)) {
      throw new Error(`splitBlock: block id ${newBlock} is already in use`);
    }

    const index = this.index(doc, at.block);
    const b = doc.blocks[index];
    const pos = Math.max(0, Math.min(at.offset, this.blockText(doc, b.id).length));
    const paragraph = () => mdBlock(newBlock, { kind: "paragraph" });

    if (isOpaque(b)) {
      // front matter stays first; elsewhere the paragraph goes on the side the caret was
      if (b.kind === "frontmatter" && pos === 0) {
        return { dirtyBlocks: [], removedBlocks: [], selection: collapsed(b.id, 0) };
      }

      const para = paragraph();
      doc.blocks.splice(pos === 0 ? index : index + 1, 0, para);
      return { dirtyBlocks: [para.id], removedBlocks: [], selection: collapsed(para.id, 0) };
    }

    // an empty item or quote exits its run; the paragraph takes the pre-allocated id
    if ((b.kind === "listItem" || b.kind === "quote") && b.text.length === 0) {
      const para = paragraph();
      doc.blocks[index] = para;
      return { dirtyBlocks: [para.id], removedBlocks: [b.id], selection: collapsed(para.id, 0) };
    }

    // an empty last line of a fence is where Enter leaves it
    if (b.kind === "code" && pos === b.text.length && (b.text === "" || b.text.endsWith("\n"))) {
      b.text = b.text.slice(0, b.text.endsWith("\n") ? -1 : undefined);
      const para = paragraph();
      doc.blocks.splice(index + 1, 0, para);
      return { dirtyBlocks: [b.id, para.id], removedBlocks: [], selection: collapsed(para.id, 0) };
    }

    // at the start of a block with text, the block's own kind moves down with its content
    const atStart = pos === 0 && b.text.length > 0;
    const headKind = atStart ? tailKind(b) : kindOf(b);
    const tail = this.slice(b, pos, b.text.length, atStart ? kindOf(b) : tailKind(b));
    tail.id = newBlock;
    if (atStart) {
      tail.html = b.html;
    }

    const head = this.slice(b, 0, pos, headKind);
    if (!atStart) {
      head.html = b.html;
    }
    doc.blocks[index] = head;
    doc.blocks.splice(index + 1, 0, tail);

    return { dirtyBlocks: [head.id, tail.id], removedBlocks: [], selection: collapsed(tail.id, 0) };
  }

  /**
   * At the start of an item, heading, quote or fence the block first sheds its kind (an item or
   * quote at depth drops one level); only a paragraph joins. A join that would take in an
   * opaque block, from either side, selects that block instead, so the next key deletes it.
   */
  private joinWithPrevious(doc: MdDoc, block: BlockId): EditResult {
    const index = this.index(doc, block);
    const b = doc.blocks[index];
    const stay = { dirtyBlocks: [], removedBlocks: [], selection: collapsed(block, 0) };
    const select = (id: BlockId): EditResult => ({
      dirtyBlocks  : [],
      removedBlocks: [],
      selection    : { anchor: { block: id, offset: 0 }, head: { block: id, offset: 1 } },
    });

    if (index === 0) {
      return stay;
    }
    if (isOpaque(b)) {
      return select(b.id);
    }

    if (b.kind !== "paragraph") {
      const own = kindOf(b);
      let kind: MdKind = { kind: "paragraph" };
      if ((own.kind === "listItem" || own.kind === "quote") && own.depth > 0) {
        own.depth -= 1;
        kind = own;
      }

      doc.blocks[index] = withKind(b, kind);
      return { dirtyBlocks: [block], removedBlocks: [], selection: collapsed(block, 0) };
    }

    const prev = doc.blocks[index - 1];
    if (isOpaque(prev)) {
      return select(prev.id);
    }

    const seam = prev.text.length;
    const joined = withKind(
      {
        ...prev,
        text : prev.text + b.text,
        marks: [
          ...prev.marks,
          ...b.marks.map((m) => ({ ...m, from: m.from + seam, to: m.to + seam })),
        ],
        atoms: [...prev.atoms, ...b.atoms.map((a) => ({ ...a, offset: a.offset + seam }))],
      },
      kindOf(prev)
    );
    joined.html = prev.html;
    doc.blocks[index - 1] = joined;
    doc.blocks.splice(index, 1);

    return { dirtyBlocks: [prev.id], removedBlocks: [b.id], selection: collapsed(prev.id, seam) };
  }

  /** Removes the mark when every covered run already has it, adds it otherwise; fences and opaque blocks are skipped. */
  private toggleMark(doc: MdDoc, range: DocRange, mark: string): EditResult {
    const none = { dirtyBlocks: [], removedBlocks: [], selection: range };
    if (!TOGGLE_NAMES.has(mark)) {
      return none;
    }

    const segments = this.segments(doc, this.order(doc, range));
    if (segments.length === 0) {
      return none;
    }

    const name = mark as MdMarkName;
    const covered = segments.every(({ block, from, to }) => hasMark(block.marks, name, from, to));

    for (const { block, from, to } of segments) {
      block.marks = covered
        ? cutMark(block.marks, name, from, to, normalizeMdMarks)
        : normalizeMdMarks([...block.marks, { from, to, name }]);
    }

    return { dirtyBlocks: segments.map((s) => s.block.id), removedBlocks: [], selection: range };
  }

  /** One entry of clipboard content as a block with `id`; several parsed blocks fold into the first. */
  private parseEntry(entry: string, id: BlockId): MdBlock {
    const indent = /^( +)(?:[-*+]|\d+[.)])\s/.exec(entry);
    const depth = indent === null ? 0 : Math.floor(indent[1].length / 2);
    const parsed = markdownDocFromText(
      indent === null ? entry : entry.slice(indent[1].length)
    ).blocks;
    const first = parsed[0];
    if (first === undefined) {
      return mdBlock(id, { kind: "paragraph" });
    }

    const out = first;
    out.id = id;
    for (const b of parsed.slice(1)) {
      if (isOpaque(out) || isOpaque(b)) {
        break;
      }
      const seam = out.text.length + 1;
      out.text += `\n${b.text}`;
      out.marks.push(...b.marks.map((m) => ({ ...m, from: m.from + seam, to: m.to + seam })));
      out.atoms.push(...b.atoms.map((a) => ({ ...a, offset: a.offset + seam })));
    }
    if (out.kind === "listItem") {
      out.depth = depth;
    }
    out.marks = fixMarks(out);

    return out;
  }

  /**
   * The first entry goes in at the caret as inline content (an empty paragraph takes its kind),
   * the rest become blocks, the last one taking the text after the caret. Into a fence the
   * content goes verbatim as lines, so no new block is made and the ids go unused.
   */
  private insertContent(
    doc: MdDoc,
    at: DocRange,
    content: ClipboardContent,
    newBlocks: readonly BlockId[]
  ): EditResult {
    const entries = content.blocks;
    if (entries.length === 0 || newBlocks.length !== entries.length - 1) {
      throw new Error(
        `insertContent: ${entries.length} entries need ${entries.length - 1} new ids`
      );
    }
    for (const id of newBlocks) {
      if (doc.blocks.some((b) => b.id === id)) {
        throw new Error(`insertContent: block id ${id} is already in use`);
      }
    }

    const cut = this.deleteRangeImpl(doc, at);
    const index = this.index(doc, cut.start.block);
    const target = doc.blocks[index];
    const pos = cut.start.offset;

    if (isOpaque(target)) {
      return {
        dirtyBlocks  : cut.dirty,
        removedBlocks: cut.removed,
        selection    : collapsed(target.id, pos),
      };
    }
    if (target.kind === "code") {
      const text = content.text ?? entries.join("\n");
      return this.insertText(doc, collapsed(target.id, pos), text, false);
    }

    const parsed = entries.map((entry, i) =>
      this.parseEntry(entry, i === 0 ? target.id : newBlocks[i - 1])
    );
    const first = parsed[0];
    const adopt = target.kind === "paragraph" && target.text.length === 0;

    if (entries.length === 1) {
      const kind = adopt ? kindOf(first) : kindOf(target);
      const merged = withKind(this.spliced(target, pos, pos, first), kind);
      merged.html = adopt ? first.html : target.html;
      doc.blocks[index] = merged;

      return {
        dirtyBlocks  : unique([merged.id, ...cut.dirty]),
        removedBlocks: cut.removed,
        selection    : collapsed(merged.id, pos + first.text.length),
      };
    }

    const prefix = this.slice(target, 0, pos, kindOf(target));
    const head = withKind(
      this.spliced(prefix, pos, pos, first),
      adopt ? kindOf(first) : kindOf(target)
    );
    head.html = adopt ? first.html : target.html;
    doc.blocks[index] = head;
    doc.blocks.splice(index + 1, 0, ...parsed.slice(1));

    // the text after the caret follows the last entry, or the last editable one before an opaque end
    const suffix = this.slice(target, pos, target.text.length, { kind: "paragraph" });
    const last = parsed[parsed.length - 1];
    const carrier =
      parsed
        .slice(1)
        .reverse()
        .find((b) => !isOpaque(b)) ?? head;
    const carrierIndex = this.index(doc, carrier.id);
    doc.blocks[carrierIndex] = this.spliced(
      carrier,
      carrier.text.length,
      carrier.text.length,
      suffix
    );

    return {
      dirtyBlocks  : unique([head.id, ...newBlocks, ...cut.dirty]),
      removedBlocks: cut.removed,
      selection    : collapsed(last.id, isOpaque(last) ? 1 : last.text.length),
    };
  }

  /** `block` with `[from, to)` replaced by `insert`'s inline content, marks and atoms carried over. */
  private spliced(block: MdBlock, from: number, to: number, insert: MdBlock): MdBlock {
    const len = insert.text.length;
    const marks = [
      ...clipMarks(block.marks, 0, from, 0, normalizeMdMarks),
      ...insert.marks.map((m) => ({ ...m, from: m.from + from, to: m.to + from })),
      ...clipMarks(block.marks, to, block.text.length, from + len, normalizeMdMarks),
    ];
    const atoms = [
      ...clipAtoms(block.atoms, 0, from, 0),
      ...insert.atoms.map((a) => ({ ...a, offset: a.offset + from })),
      ...clipAtoms(block.atoms, to, block.text.length, from + len),
    ];
    const out: MdBlock = {
      ...block,
      text: block.text.slice(0, from) + insert.text + block.text.slice(to),
      marks,
      atoms,
    };
    out.marks = fixMarks(out);

    return out;
  }

  private replaceBlocks(
    doc: MdDoc,
    after: BlockId | null,
    snapshots: readonly BlockSnapshot[],
    remove: readonly BlockId[]
  ): EditResult {
    const removing = new Set(remove);
    const removed = doc.blocks.filter((b) => removing.has(b.id)).map((b) => b.id);
    doc.blocks = doc.blocks.filter((b) => !removing.has(b.id));

    const restored = snapshots.map((s) => this.fromSnapshot(s));
    const index = after === null ? 0 : this.index(doc, after) + 1;
    doc.blocks.splice(index, 0, ...restored);

    const inserted = new Set(restored.map((b) => b.id));
    const last = restored[restored.length - 1];
    let selection: DocRange;

    if (last !== undefined) {
      selection = collapsed(last.id, this.blockText(doc, last.id).length);
    } else if (index < doc.blocks.length) {
      selection = collapsed(doc.blocks[index].id, 0);
    } else if (index > 0) {
      const prev = doc.blocks[index - 1];
      selection = collapsed(prev.id, this.blockText(doc, prev.id).length);
    } else {
      selection = collapsed("", 0);
    }

    return {
      dirtyBlocks  : restored.map((b) => b.id),
      removedBlocks: removed.filter((id) => !inserted.has(id)),
      selection,
    };
  }

  private fromSnapshot(snapshot: BlockSnapshot): MdBlock {
    const state = snapshot.state as Partial<MdBlock> | undefined;
    if (
      typeof state?.kind !== "string" ||
      typeof state.text !== "string" ||
      !Array.isArray(state.marks) ||
      !Array.isArray(state.atoms)
    ) {
      throw new Error(`replaceBlocks: snapshot of ${snapshot.id} is not an MdBlock`);
    }

    return cloneBlock({ ...(state as MdBlock), id: snapshot.id });
  }

  /** The selection a custom op's data names, clamped, or the caret at the end of `fallback`. */
  private customSelection(doc: MdDoc, data: JsonRecord, fallback: BlockId): DocRange {
    const wanted = rangeOf(data.selection);
    if (
      wanted !== undefined &&
      doc.blocks.some((b) => b.id === wanted.anchor.block) &&
      doc.blocks.some((b) => b.id === wanted.head.block)
    ) {
      const r = this.order(doc, wanted);
      return { anchor: r.start, head: r.end };
    }

    return collapsed(fallback, this.blockText(doc, fallback).length);
  }

  private custom(doc: MdDoc, op: EditOp & { type: "custom" }): EditResult {
    const data = record(op);
    const span = op.blocks.map((id) => this.block(doc, id));
    const first = span[0];
    if (first === undefined) {
      throw new Error(`MarkdownProvider: ${op.name} names no block`);
    }

    switch (op.name) {
      case "setKind":
        return this.setKind(doc, span, data);
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
          selection    : this.customSelection(doc, data, first.id),
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
          selection    : this.customSelection(doc, data, first.id),
        };
      }
      case "setLink":
        return this.setLink(doc, first, data);
      case "insertWikilink":
        return this.insertWikilink(doc, first, data);
      case "setImage":
        return this.setImage(doc, first, data);
      case "moveAtom":
        return this.moveAtom(doc, data);
      case "insertBreak": {
        const range = rangeOf(data.range);
        if (range === undefined) {
          throw new Error("MarkdownProvider: insertBreak needs a range");
        }
        return this.insertText(doc, range, "\n", true);
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
  private setKind(doc: MdDoc, span: readonly MdBlock[], data: JsonRecord): EditResult {
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
        selection    : this.customSelection(doc, data, span[0].id),
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
        doc.blocks[this.index(doc, head.id)] = fence;
        for (const b of editable.slice(1)) {
          doc.blocks.splice(this.index(doc, b.id), 1);
          removed.push(b.id);
        }
        dirty.push(fence.id);
      }

      return {
        dirtyBlocks  : dirty,
        removedBlocks: removed,
        selection    : this.customSelection(doc, data, dirty[dirty.length - 1]),
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
      const index = this.index(doc, b.id);
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
      selection    : this.customSelection(doc, data, dirty[dirty.length - 1]),
    };
  }

  /** Sets the link over `[from, to)` of the block, or removes links there when `target` is empty. */
  private insertWikilink(doc: MdDoc, b: MdBlock, data: JsonRecord): EditResult {
    const from = typeof data.from === "number" ? data.from : 0;
    const to = typeof data.to === "number" ? data.to : from;
    const target = typeof data.target === "string" ? data.target : "";
    const text = typeof data.text === "string" && data.text !== "" ? data.text : target;

    if (isOpaque(b) || b.kind === "code" || from > to || to > b.text.length || target === "") {
      return { dirtyBlocks: [], removedBlocks: [], selection: collapsed(b.id, to) };
    }

    const result = this.insertText(
      doc,
      { anchor: { block: b.id, offset: from }, head: { block: b.id, offset: to } },
      text,
      false
    );
    const mark: MdMark = { from, to: from + text.length, name: "link", kind: "wiki", target };
    b.marks = normalizeMdMarks([
      ...cutMark(b.marks, "link", mark.from, mark.to, normalizeMdMarks),
      mark,
    ]);
    return result;
  }

  private setLink(doc: MdDoc, b: MdBlock, data: JsonRecord): EditResult {
    const from = typeof data.from === "number" ? data.from : 0;
    const to = typeof data.to === "number" ? data.to : from;
    const target = typeof data.target === "string" ? data.target : "";
    const none = {
      dirtyBlocks  : [],
      removedBlocks: [],
      selection    : this.customSelection(doc, data, b.id),
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
      selection    : data.selection === undefined ? range : this.customSelection(doc, data, b.id),
    };
  }

  /** Patches the image at `data.offset`: `width` (null removes it), `alt`, `src`, `title`. */
  private setImage(doc: MdDoc, b: MdBlock, data: JsonRecord): EditResult {
    const atom = b.atoms.find((a) => a.offset === data.offset);
    if (atom === undefined) {
      return {
        dirtyBlocks  : [],
        removedBlocks: [],
        selection    : this.customSelection(doc, data, b.id),
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
  private moveAtom(doc: MdDoc, data: JsonRecord): EditResult {
    const from = posOf(data.from);
    const target = posOf(data.to);
    if (from === undefined || target === undefined) {
      throw new Error("MarkdownProvider: moveAtom needs from and to positions");
    }

    const source = this.block(doc, from.block);
    const dest = this.block(doc, target.block);
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
}

/** Builders for the provider's custom ops, so a toolbar or a test never writes the JSON by hand. */
export const markdownOps = {
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
