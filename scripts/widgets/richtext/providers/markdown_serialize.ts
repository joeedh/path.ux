// The block model back to markdown text: an mdast tree rebuilt from the blocks, with list
// and quote runs regrouped into nested nodes, and handed to `mdast-util-to-markdown`.

import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";
import { frontmatterToMarkdown } from "mdast-util-frontmatter";
import type {
  BlockContent,
  Blockquote,
  DefinitionContent,
  List,
  ListItem,
  Literal,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import { htmlForBlock, imageTag, markTag } from "./markdown_html";
import { inlineTree, treeText } from "./markdown_inline";
import type { InlineNode } from "./markdown_inline";
import { blockNeedsHtml, wikilinkSource, markdownBodyKey } from "./markdown_model";
import type { MdBlock, MdDoc, MdImage } from "./markdown_model";

/**
 * A wikilink in the tree. An inline `html` node would do for the text, but the serializer
 * turns a newline before an `html` node into a space (flow HTML could start there), and a
 * marker on a line of its own has to stay on it; a node of its own is written verbatim.
 */
export interface Wikilink extends Literal {
  type: "wikilink";
}

declare module "mdast" {
  interface PhrasingContentMap {
    wikilink: Wikilink;
  }
  interface RootContentMap {
    wikilink: Wikilink;
  }
}

const html = (value: string): PhrasingContent => ({ type: "html", value });

/** An image as an mdast node: markdown syntax, or an `<img>` when it carries a width or attributes. */
function imageNode(image: MdImage): PhrasingContent {
  if (image.width !== undefined || image.attrs !== undefined) {
    return html(imageTag(image));
  }

  return { type: "image", url: image.src, alt: image.alt, title: image.title ?? null };
}

/**
 * Inline content as mdast phrasing nodes. A wikilink, an underline and a tag-carrying `style`
 * mark are inline `html` nodes, which the serializer emits verbatim; `htmlTags` makes every
 * styled mark one too, for a paragraph that is itself an inline HTML element.
 */
function phrasing(nodes: readonly InlineNode[], htmlTags: boolean): PhrasingContent[] {
  const out: PhrasingContent[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      out.push({ type: "text", value: node.value });
    } else if (node.type === "atom") {
      out.push(imageNode(node.atom.image));
    } else if (node.type === "break") {
      out.push(node.hard ? { type: "break" } : { type: "text", value: "\n" });
    } else {
      out.push(...wrapped(node.mark, node.children, htmlTags));
    }
  }

  return out;
}

function wrapped(
  mark: MdBlock["marks"][number],
  children: readonly InlineNode[],
  htmlTags: boolean
): PhrasingContent[] {
  const inner = () => phrasing(children, htmlTags);
  const tagged = () => {
    const { open, close } = markTag(mark);
    return [html(open), ...inner(), html(close)];
  };

  if (mark.name === "link" && mark.kind === "wiki") {
    return [{ type: "wikilink", value: wikilinkSource(mark.target ?? "", treeText(children)) }];
  }
  if (htmlTags && (mark.style !== undefined || mark.attrs !== undefined)) {
    return tagged();
  }

  switch (mark.name) {
    case "bold":
      return [{ type: "strong", children: inner() }];
    case "italic":
      return [{ type: "emphasis", children: inner() }];
    case "strikethrough":
      return [{ type: "delete", children: inner() }];
    case "code":
      return [{ type: "inlineCode", value: treeText(children) }];
    case "link":
      return [
        { type: "link", url: mark.target ?? "", title: mark.title ?? null, children: inner() },
      ];
    default:
      // underline and a tag-carrying style mark have no markdown form
      return tagged();
  }
}

/** The inline content of `block`, with newlines turned to spaces where the syntax has no line. */
function inlineOf(block: MdBlock, htmlTags = false): PhrasingContent[] {
  const nodes = phrasing(inlineTree(block), htmlTags);
  if (block.kind !== "heading") {
    return nodes;
  }

  return nodes.map((n) => (n.type === "text" ? { ...n, value: n.value.replace(/\n/g, " ") } : n));
}

const paragraph = (children: PhrasingContent[]): Paragraph => ({ type: "paragraph", children });

/** One block as flow content; list items and quotes are grouped by the caller. */
function flowNode(block: MdBlock): RootContent {
  if (block.kind === "widget") return { type: "html", value: block.source };
  if (blockNeedsHtml(block) && block.kind !== "table" && block.kind !== "raw") {
    if (block.kind === "paragraph" && block.html?.tag === "span") {
      // an inline element is a paragraph to the parser, so its content stays markdown
      const { open, close } = markTag({ name: "style", from: 0, to: 0, ...block.html });
      return paragraph([html(open), ...inlineOf(block, true), html(close)]);
    }

    return { type: "html", value: htmlForBlock(block) };
  }

  switch (block.kind) {
    case "heading":
      return { type: "heading", depth: block.level, children: inlineOf(block) };
    case "code":
      return { type: "code", lang: block.lang === "" ? null : block.lang, value: block.text };
    case "hr":
      return { type: "thematicBreak" };
    case "table":
    case "raw":
    case "frontmatter":
      return { type: "html", value: block.source };
    default:
      return paragraph(inlineOf(block));
  }
}

type ListHost = { children: (BlockContent | DefinitionContent)[] } | { children: RootContent[] };

/** Regroups a run of list items into nested `list` nodes by depth and kind. */
function listRun(items: readonly MdBlock[], into: RootContent[]): void {
  const stack: { list: List; depth: number; host: ListHost }[] = [];

  for (const block of items) {
    if (block.kind !== "listItem") {
      continue;
    }

    while (stack.length > 0 && stack[stack.length - 1].depth > block.depth) {
      stack.pop();
    }

    let top = stack[stack.length - 1];
    if (top !== undefined && top.depth === block.depth && top.list.ordered !== block.ordered) {
      stack.pop();
      top = stack[stack.length - 1];
    }

    if (top === undefined || top.depth < block.depth) {
      // a deeper item nests under the last item of the list above it, or opens a run
      const lastItem = top?.list.children[top.list.children.length - 1];
      const host: ListHost = lastItem ?? { children: into };
      const list: List = {
        type    : "list",
        ordered : block.ordered,
        start   : block.ordered ? 1 : null,
        spread  : false,
        children: [],
      };
      host.children.push(list);
      stack.push({ list, depth: block.depth, host });
      top = stack[stack.length - 1];
    }

    const item: ListItem = {
      type    : "listItem",
      spread  : false,
      checked : block.task ? block.checked === true : null,
      children: [paragraph(inlineOf(block))],
    };
    if (blockNeedsHtml(block)) {
      // the `<li>` carries the checkbox itself
      item.checked = null;
      item.children = [{ type: "html", value: htmlForBlock(block) }];
    }
    top.list.children.push(item);
  }
}

/** Regroups a run of quote blocks into nested `blockquote` nodes by depth. */
function quoteRun(quotes: readonly MdBlock[], into: RootContent[]): void {
  const stack: { quote: Blockquote; depth: number }[] = [];

  for (const block of quotes) {
    if (block.kind !== "quote") {
      continue;
    }

    while (stack.length > 0 && stack[stack.length - 1].depth > block.depth) {
      stack.pop();
    }
    while (stack.length === 0 || stack[stack.length - 1].depth < block.depth) {
      const depth = stack.length === 0 ? 0 : stack[stack.length - 1].depth + 1;
      const quote: Blockquote = { type: "blockquote", children: [] };
      if (stack.length === 0) {
        into.push(quote);
      } else {
        stack[stack.length - 1].quote.children.push(quote);
      }
      stack.push({ quote, depth });
    }

    const top = stack[stack.length - 1];
    top.quote.children.push(
      blockNeedsHtml(block)
        ? { type: "html", value: htmlForBlock(block) }
        : paragraph(inlineOf(block))
    );
  }
}

/** The mdast tree for `doc`. */
export function markdownTree(doc: MdDoc): Root {
  const children: RootContent[] = [];
  const blocks = doc.blocks;

  for (let i = 0; i < blocks.length;) {
    const kind = blocks[i].kind;
    if (kind === "listItem" || kind === "quote") {
      let j = i;
      while (j < blocks.length && blocks[j].kind === kind) {
        j++;
      }
      (kind === "listItem" ? listRun : quoteRun)(blocks.slice(i, j), children);
      i = j;
    } else {
      children.push(flowNode(blocks[i]));
      i++;
    }
  }

  return { type: "root", children };
}

/**
 * Serializes `doc` to markdown. The forms are fixed: `-` bullets, `*` emphasis and strong,
 * fenced code, `---` rules, ATX headings; a wikilink, an underline and a sized image are
 * inline HTML, and a block the model marks as HTML is one HTML block.
 */
export function markdownText(doc: MdDoc): string {
  const retained = doc.blocks.find((b) => b.retainedSource)?.retainedSource;
  if (retained) {
    const front = doc.blocks[0]?.kind === "frontmatter" ? doc.blocks[0] : undefined;
    const blocks = front ? doc.blocks.slice(1) : doc.blocks;
    const body =
      markdownBodyKey(blocks) === retained.bodyKey
        ? retained.body
        : canonicalMarkdownText({ blocks }).replace(/\r?\n/g, retained.eol);
    return retained.prefix + (front ? front.source + retained.separator : "") + body;
  }
  return canonicalMarkdownText(doc);
}

function canonicalMarkdownText(doc: MdDoc): string {
  return toMarkdown(markdownTree(doc), {
    extensions    : [gfmToMarkdown(), frontmatterToMarkdown(["yaml"])],
    handlers      : { wikilink: (node: Wikilink) => node.value },
    bullet        : "-",
    bulletOrdered : ".",
    emphasis      : "*",
    strong        : "*",
    fences        : true,
    rule          : "-",
    listItemIndent: "one",
  });
}
