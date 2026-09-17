// The markdown document: a flat block list with flat marks, as the editor requires. Nesting
// is a depth on list items and quotes; the parser flattens and the serializer regroups.

import type { BlockId } from "../provider";
import type { Mark } from "./marks";

export type MdKind =
  | { kind: "paragraph" }
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { kind: "listItem"; ordered: boolean; depth: number; task?: boolean; checked?: boolean }
  | { kind: "quote"; depth: number }
  | { kind: "code"; lang: string }
  | { kind: "hr" }
  | { kind: "table"; source: string }
  | { kind: "widget"; source: string }
  | { kind: "raw"; source: string }
  | { kind: "frontmatter"; source: string };

export type MdMarkName =
  "bold" | "italic" | "underline" | "strikethrough" | "code" | "link" | "style" | "break";

/**
 * A mark over `[from, to)` of a block's text. A `style` mark exists only to carry a tag, an
 * inline style or attributes from the source; a `break` mark covers one `\n` and makes it a
 * hard line break, where a bare `\n` is a soft one.
 */
export interface MdMark extends Mark {
  name: MdMarkName;
  /** `link` only: `url`, `wiki`, or whatever else the source named. */
  kind?: string;
  /** `link` only. */
  target?: string;
  title?: string;
  /** `style` only: the element the source used, when it is not a plain `span`. */
  tag?: string;
  /** Inline CSS from the source, on any mark. */
  style?: Record<string, string>;
  attrs?: Record<string, string>;
}

export interface MdImage {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  /** The sanitized attributes of an `<img>` HTML form, for a consumer's own metadata. */
  attrs?: Record<string, string>;
}

/** An image, sitting at `offset` in the block's text as one `ATOM_CHAR`. */
export interface MdAtom {
  /** Stable within the runtime document and its history; omitted from Markdown source. */
  id?: string;
  offset: number;
  image: MdImage;
}

/** What a block remembers of the HTML it came from, when the kind alone does not reproduce it. */
export interface MdHtml {
  /** The element to emit and render when it is not the kind's own; `span` for an inline paragraph. */
  tag?: string;
  style?: Record<string, string>;
  attrs?: Record<string, string>;
}

export type MdBlock = MdKind & {
  id: BlockId;
  text: string;
  marks: MdMark[];
  atoms: MdAtom[];
  html?: MdHtml;
};

export interface MdDoc {
  blocks: MdBlock[];
}

/** A block of `kind` with empty marks and atoms. */
export function mdBlock(id: BlockId, kind: MdKind, text = ""): MdBlock {
  return { ...kind, id, text, marks: [], atoms: [] };
}

/** The wikilink form of a target and its display text: `[[target]]`, or `[[target|text]]`. */
export function wikilinkSource(target: string, text: string): string {
  return text === target ? `[[${target}]]` : `[[${target}|${text}]]`;
}

/** Whether emitting `block` as markdown syntax would lose something the source carried. */
export function blockNeedsHtml(block: MdBlock): boolean {
  if (block.html !== undefined) {
    return true;
  }

  return block.marks.some((m) => m.style !== undefined || m.attrs !== undefined);
}
