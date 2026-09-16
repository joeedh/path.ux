import type { BlockId, ClipboardContent, DocRange } from "../provider";
import { htmlForBlock } from "./markdown_html";
import { mdBlock } from "./markdown_model";
import type { MdBlock, MdDoc } from "./markdown_model";
import { markdownDocFromText } from "./markdown_parse";
import { markdownText } from "./markdown_serialize";
import { fixMarks, isOpaque, orderRange, slice, textOf } from "./markdown_doc";

// The clipboard as markdown source: one entry per block on the way out, and on the way in
// each entry parsed back to a block, or foreign HTML parsed through the HTML rules.

/** Marks the HTML the provider writes to the clipboard, so a paste of its own copy reads the markdown entries instead. */
const OWN_HTML_MARK = "data-richtext-markdown";

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

/** One clipboard entry: the block's markdown source, an item indented two spaces per depth. */
export function entryOf(block: MdBlock): string {
  const source = markdownText({ blocks: [block] }).replace(/\n+$/, "");
  return block.kind === "listItem" ? "  ".repeat(block.depth) + source : source;
}

/** One entry of clipboard content as a block with `id`; several parsed blocks fold into the first. */
export function parseEntry(entry: string, id: BlockId): MdBlock {
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
 * One markdown source entry per covered block: a whole block as itself, a partial block as
 * inline content, a partial fence as its bare lines. `html` carries the same blocks.
 */
export function toClipboard(doc: MdDoc, range: DocRange): ClipboardContent {
  const r = orderRange(doc, range);
  const blocks: string[] = [];
  let html = "";

  for (let i = r.startIndex; i <= r.endIndex; i++) {
    const b = doc.blocks[i];
    const length = textOf(doc, b.id).length;
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
    const sliced = whole ? b : slice(b, from, to, { kind: "paragraph" });
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

/** Reserves prose carriers around table edges so insertion never merges a table into text. */
function pasteEntries(blocks: readonly MdBlock[]): string[] {
  const entries = blocks.map(entryOf);
  if (blocks[0]?.kind === "table") entries.unshift("");
  if (blocks.at(-1)?.kind === "table") entries.push("");
  return entries;
}

/** Parses clipboard blocks with table boundary carriers; `text` stays verbatim for a fence. */
export function fromClipboard(data: DataTransfer): ClipboardContent | undefined {
  const text = data.types.includes("text/plain")
    ? data.getData("text/plain").replace(/\r\n?/g, "\n")
    : undefined;

  // HTML from elsewhere becomes blocks through the parser's HTML rules; the provider's own
  // copy carries the exact markdown as text, which is better than its rendering
  const html = data.types.includes("text/html") ? data.getData("text/html") : "";
  if (html !== "" && !html.includes(OWN_HTML_MARK)) {
    const blocks = pasteEntries(markdownDocFromText(clipboardHtml(html)).blocks);
    if (blocks.length > 0) {
      return { blocks, text: text ?? blocks.join("\n") };
    }
  }

  if (text === undefined) {
    return undefined;
  }
  const blocks = pasteEntries(markdownDocFromText(text).blocks);

  return { blocks: blocks.length > 0 ? blocks : [""], text };
}
