import { decodeWidgetFence, reidentifyWidgetFence } from "../widget_codec";
// Markdown text to the block model: mdast's tree, flattened one block per node, with inline
// HTML paired into marks and wikilinks lifted out of the text.

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import type {
  Blockquote,
  Definition,
  List,
  ListItem,
  Nodes,
  PhrasingContent,
  RootContent,
} from "mdast";
import { newBlockId } from "../provider";
import type { BlockId } from "../provider";
import { InlineBuilder } from "./markdown_inline";
import type { OpenMark } from "./markdown_inline";
import {
  ALLOWED_ELEMENTS,
  RAW_ELEMENTS,
  blocksFromHtml,
  contextUnder,
  htmlWrapper,
  imageOf,
  markForTag,
  parseInlineTag,
  rootHtmlContext,
} from "./markdown_html";
import type { HtmlContext } from "./markdown_html";
import { mdBlock } from "./markdown_model";
import type { MdBlock, MdDoc, MdKind } from "./markdown_model";

const DROPPED_INLINE: ReadonlySet<string> = new Set(["script", "style", "template"]);

interface OpenTag {
  tag: string;
  handle?: number;
  /** Where the tag's own text goes if it never closes. */
  at: number;
  source: string;
  dropping: boolean;
}

/** The text of a node and its children, for a reference that fails to resolve. */
function plainText(node: PhrasingContent): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
    case "html":
      return node.value;
    case "image":
    case "imageReference":
      return node.alt ?? "";
    case "break":
      return "\n";
    case "footnoteReference":
      return `[^${node.label ?? node.identifier}]`;
    default:
      return "children" in node ? node.children.map(plainText).join("") : "";
  }
}

class Parser {
  readonly blocks: MdBlock[] = [];
  readonly widgetRanges = new Map<BlockId, { from: number; to: number }>();
  private flowDepth = 0;
  private readonly definitions = new Map<string, Definition>();
  private readonly wrappers: HtmlContext[] = [];

  constructor(
    private readonly source: string,
    private readonly newId: () => BlockId,
    private readonly original = source,
    private readonly crlfOffsets: readonly number[] = []
  ) {}

  private originalRange(node: Nodes): { from: number; to: number } {
    const offset = (value: number) => {
      let lo = 0;
      let hi = this.crlfOffsets.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (this.crlfOffsets[mid] < value) lo = mid + 1;
        else hi = mid;
      }
      return value + lo;
    };
    return { from: offset(node.position!.start.offset!), to: offset(node.position!.end.offset!) };
  }

  private originalSlice(node: Nodes): string {
    const { from, to } = this.originalRange(node);
    return this.original.slice(from, to);
  }

  private get ctx(): HtmlContext {
    return this.wrappers.length > 0 ? this.wrappers[this.wrappers.length - 1] : rootHtmlContext();
  }

  private sliceOf(node: Nodes): string {
    const { start, end } = node.position ?? {};
    if (start?.offset === undefined || end?.offset === undefined) {
      return "";
    }

    return this.source.slice(start.offset, end.offset);
  }

  collectDefinitions(nodes: readonly RootContent[]): void {
    for (const node of nodes) {
      if (node.type === "definition") {
        this.definitions.set(node.identifier, node);
      } else if ("children" in node) {
        this.collectDefinitions(node.children as RootContent[]);
      }
    }
  }

  /** The block `kind` with the current wrapper's style and attributes, when any. */
  private push(kind: MdKind, text = ""): MdBlock {
    const block = mdBlock(this.newId(), kind, text);
    const { style, attrs } = this.ctx;
    if (style !== undefined || attrs !== undefined) {
      block.html = {};
      if (style !== undefined) {
        block.html.style = style;
      }
      if (attrs !== undefined) {
        block.html.attrs = attrs;
      }
    }

    this.blocks.push(block);
    return block;
  }

  flow(nodes: readonly RootContent[], ctx: HtmlContext): void {
    this.flowDepth++;
    try {
      for (const node of nodes) this.node(node, ctx);
    } finally {
      this.flowDepth--;
    }
  }

  private node(node: RootContent, ctx: HtmlContext): void {
    switch (node.type) {
      case "yaml":
        // front matter can only be first; anywhere else mdast would not have parsed it
        this.push({ kind: "frontmatter", source: this.sliceOf(node) });
        break;
      case "heading":
        this.inline(this.push({ kind: "heading", level: node.depth }), node.children);
        break;
      case "paragraph":
        if (this.rawParagraph(node.children)) {
          // a media element alone is a raw block, though mdast read it as inline html
          this.push({ kind: "raw", source: this.sliceOf(node) });
        } else {
          this.inline(this.push(this.textKind(ctx)), node.children);
        }
        break;
      case "list":
        this.list(node, ctx);
        break;
      case "blockquote":
        this.quote(node, ctx);
        break;
      case "code":
        if (
          this.flowDepth === 1 &&
          /^pathux-widget-v[0-9]+$/.test(node.lang ?? "") &&
          !ctx.listDepth &&
          !ctx.quoteDepth &&
          !this.wrappers.length
        ) {
          const block = this.push({ kind: "widget", source: this.originalSlice(node) });
          this.widgetRanges.set(block.id, this.originalRange(node));
        } else this.push({ kind: "code", lang: node.lang ?? "" }, node.value);
        break;
      case "thematicBreak":
        this.push({ kind: "hr" });
        break;
      case "table":
        this.push({ kind: "table", source: this.sliceOf(node) });
        break;
      case "html":
        this.html(node.value, ctx);
        break;
      case "footnoteDefinition":
        this.flow(node.children, ctx);
        break;
      case "definition":
        break;
      default:
        break;
    }
  }

  /** Whether a paragraph is nothing but one media element, which mdast does not read as flow. */
  private rawParagraph(nodes: readonly PhrasingContent[]): boolean {
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (first?.type !== "html" || last?.type !== "html") {
      return false;
    }

    const open = parseInlineTag(first.value);
    if (open.type === "other" || open.type === "close" || !RAW_ELEMENTS.has(open.tag)) {
      return false;
    }
    if (nodes.length === 1) {
      return true;
    }

    const close = parseInlineTag(last.value);
    return close.type === "close" && close.tag === open.tag;
  }

  private textKind(ctx: HtmlContext): MdKind {
    if (ctx.listDepth > 0) {
      return { kind: "listItem", ordered: ctx.ordered, depth: ctx.listDepth - 1 };
    }
    if (ctx.quoteDepth > 0) {
      return { kind: "quote", depth: ctx.quoteDepth - 1 };
    }

    return { kind: "paragraph" };
  }

  private list(list: List, ctx: HtmlContext): void {
    const inner = { ...ctx, listDepth: ctx.listDepth + 1, ordered: list.ordered === true };
    for (const item of list.children) {
      this.listItem(item, inner);
    }
  }

  private listItem(item: ListItem, ctx: HtmlContext): void {
    const [first, ...rest] = item.children;
    const kind: MdKind = { kind: "listItem", ordered: ctx.ordered, depth: ctx.listDepth - 1 };
    if (item.checked !== null && item.checked !== undefined) {
      kind.task = true;
      kind.checked = item.checked;
    }

    if (first?.type === "html") {
      // an item written as HTML resolves to its own blocks, at the item's depth
      this.html(first.value, ctx);
      this.flow(rest, ctx);
      return;
    }
    if (first === undefined || first.type !== "paragraph") {
      // an item with no text of its own still holds its place, so its children keep their depth
      this.push(kind);
      this.flow(item.children, ctx);
      return;
    }

    this.inline(this.push(kind), first.children);
    this.flow(rest, ctx);
  }

  private quote(quote: Blockquote, ctx: HtmlContext): void {
    this.flow(quote.children, { ...ctx, quoteDepth: ctx.quoteDepth + 1 });
  }

  /** A block-level `html` node: a wrapper's edge, or a run of elements parsed whole. */
  private html(value: string, ctx: HtmlContext): void {
    const wrapper = htmlWrapper(value);
    if (wrapper?.type === "open") {
      this.wrappers.push(contextUnder(wrapper.element, this.ctx));
      return;
    }
    if (wrapper?.type === "close") {
      // an unpaired closing tag is dropped, as is one for a wrapper that never opened
      if (this.wrappers.length > 0) {
        this.wrappers.pop();
      }
      return;
    }

    this.blocks.push(...blocksFromHtml(value, { ...this.ctx, ...structural(ctx) }, this.newId));
  }

  /** Fills `block` from a paragraph's inline nodes. */
  private inline(block: MdBlock, nodes: readonly PhrasingContent[]): void {
    const builder = new InlineBuilder();
    const open: OpenTag[] = [];

    this.phrasing(nodes, builder, open);
    // a tag that never closed is text after all; later ones first, so the offsets hold
    for (const tag of open.reverse()) {
      if (tag.handle !== undefined) {
        builder.discard(tag.handle);
      }
      builder.splice(tag.at, tag.at, tag.source);
    }

    this.liftSpan(block, builder);
    this.wikilinks(builder);
    builder.finish(block);
  }

  /**
   * A paragraph that is one `<span>` pair around all of its text is a block-level span:
   * its tag, style and attributes move onto the block.
   */
  private liftSpan(block: MdBlock, builder: InlineBuilder): void {
    const whole = builder.marks.find(
      (m) => m.name === "style" && m.tag === undefined && m.from === 0 && m.to === builder.length
    );
    if (whole === undefined || block.kind !== "paragraph" || builder.length === 0) {
      return;
    }

    builder.marks = builder.marks.filter((m) => m !== whole);
    block.html = { ...block.html, tag: "span" };
    if (whole.style !== undefined) {
      block.html.style = { ...block.html.style, ...whole.style };
    }
    if (whole.attrs !== undefined) {
      block.html.attrs = { ...block.html.attrs, ...whole.attrs };
    }
  }

  private phrasing(
    nodes: readonly PhrasingContent[],
    builder: InlineBuilder,
    open: OpenTag[]
  ): void {
    const dropping = () => open.some((t) => t.dropping);

    for (const node of nodes) {
      if (node.type === "html") {
        this.inlineHtml(node.value, builder, open);
        continue;
      }
      if (dropping()) {
        continue;
      }

      switch (node.type) {
        case "text":
          builder.append(node.value);
          break;
        case "break":
          builder.lineBreak(true);
          break;
        case "inlineCode": {
          const handle = builder.start({ name: "code" });
          builder.append(node.value);
          builder.close(handle);
          break;
        }
        case "image":
          builder.atom({ src: node.url, alt: node.alt ?? "", ...titleOf(node.title) });
          break;
        case "imageReference": {
          const def = this.definitions.get(node.identifier);
          if (def === undefined) {
            builder.append(`![${node.alt ?? ""}]`);
          } else {
            builder.atom({ src: def.url, alt: node.alt ?? "", ...titleOf(def.title) });
          }
          break;
        }
        case "link":
          this.wrapped(
            { name: "link", kind: "url", target: node.url, ...titleOf(node.title) },
            node.children,
            builder,
            open
          );
          break;
        case "linkReference": {
          const def = this.definitions.get(node.identifier);
          if (def === undefined) {
            builder.append(`[${node.children.map(plainText).join("")}]`);
          } else {
            this.wrapped(
              { name: "link", kind: "url", target: def.url, ...titleOf(def.title) },
              node.children,
              builder,
              open
            );
          }
          break;
        }
        case "strong":
          this.wrapped({ name: "bold" }, node.children, builder, open);
          break;
        case "emphasis":
          this.wrapped({ name: "italic" }, node.children, builder, open);
          break;
        case "delete":
          this.wrapped({ name: "strikethrough" }, node.children, builder, open);
          break;
        case "footnoteReference":
          builder.append(plainText(node));
          break;
        default:
          break;
      }
    }
  }

  private wrapped(
    mark: OpenMark,
    children: readonly PhrasingContent[],
    builder: InlineBuilder,
    open: OpenTag[]
  ): void {
    const handle = builder.start(mark);
    this.phrasing(children, builder, open);
    builder.close(handle);
  }

  /** One inline tag: opens or closes a mark, drops in an image or a break, or stays as text. */
  private inlineHtml(value: string, builder: InlineBuilder, open: OpenTag[]): void {
    const tag = parseInlineTag(value);
    const dropping = open.some((t) => t.dropping);

    if (tag.type === "close") {
      const top = open[open.length - 1];
      if (top?.tag === tag.tag) {
        open.pop();
        if (top.handle !== undefined) {
          builder.close(top.handle);
        }
      } else if (!dropping) {
        builder.append(value);
      }
      return;
    }
    if (dropping) {
      return;
    }

    if (tag.type === "other") {
      // a comment or a fragment no browser would read as a tag
      if (!/^\s*<!--/.test(value)) {
        builder.append(value);
      }
    } else if (tag.type === "void") {
      if (tag.tag === "br") {
        builder.lineBreak(true);
      } else if (tag.tag === "img") {
        const image = imageOf(tag.element);
        if (image !== undefined) {
          builder.atom(image);
        }
      }
    } else if (DROPPED_INLINE.has(tag.tag)) {
      open.push({ tag: tag.tag, at: builder.length, source: value, dropping: true });
    } else {
      const mark = ALLOWED_ELEMENTS.has(tag.tag) ? markForTag(tag.tag, tag.element) : undefined;
      open.push({
        tag     : tag.tag,
        handle  : mark === undefined ? undefined : builder.start(mark),
        at      : builder.length,
        source  : value,
        dropping: false,
      });
    }
  }

  /** Turns each `[[…]]` run outside code and links into a `wiki` link mark over its display text. */
  private wikilinks(builder: InlineBuilder): void {
    const covered = (from: number, to: number) =>
      builder.marks.some(
        (m) => (m.name === "code" || m.name === "link") && m.from < to && m.to > from
      );

    let search = 0;
    for (;;) {
      const match = /\[\[([^\n\]]+?)\]\]/.exec(builder.text.slice(search));
      if (match === null) {
        break;
      }

      const from = search + match.index;
      const to = from + match[0].length;
      if (covered(from, to)) {
        search = to;
        continue;
      }

      const inner = match[1];
      const bar = inner.indexOf("|");
      const target = bar < 0 ? inner : inner.slice(0, bar);
      const text = bar < 0 ? inner : inner.slice(bar + 1);

      builder.splice(from, to, text);
      builder.mark({ name: "link", kind: "wiki", target }, from, from + text.length);
      search = from + text.length;
    }
  }
}

const titleOf = (title: string | null | undefined) =>
  title === null || title === undefined ? {} : { title };

/** The list and quote depths of `ctx` alone, without a wrapper's style. */
const structural = (ctx: HtmlContext) => ({
  quoteDepth: ctx.quoteDepth,
  listDepth : ctx.listDepth,
  ordered   : ctx.ordered,
});

/**
 * Parses markdown into an `MdDoc`. GFM tables, task lists and strikethrough and YAML front
 * matter are understood; `newId` supplies block ids, fresh per parse by default.
 */
export function markdownDocFromText(
  text: string,
  newId: () => BlockId = newBlockId,
  repaired?: (from: number, to: number, source: string) => void
): MdDoc {
  const source = text.replace(/\r\n?/g, "\n");
  const tree = fromMarkdown(source, {
    extensions     : [gfm(), frontmatter(["yaml"])],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(["yaml"])],
  });

  const crlfOffsets: number[] = [];
  for (const match of text.matchAll(/\r\n/g)) crlfOffsets.push(match.index - crlfOffsets.length);
  const parser = new Parser(source, newId, text, crlfOffsets);
  parser.collectDefinitions(tree.children);
  parser.flow(tree.children, rootHtmlContext());

  const records = parser.blocks.map((block) =>
    block.kind === "widget" ? decodeWidgetFence(block.source) : undefined
  );
  const reserved = new Set(records.flatMap((record) => (record ? [record.id] : [])));
  const seen = new Set<string>();
  parser.blocks.forEach((block, index) => {
    const record = records[index];
    if (!record || block.kind !== "widget") return;
    if (seen.has(record.id)) {
      let id: string;
      do {
        id = newBlockId();
      } while (reserved.has(id));
      reserved.add(id);
      block.source = reidentifyWidgetFence(block.source, id);
      const range = parser.widgetRanges.get(block.id)!;
      repaired?.(range.from, range.to, block.source);
    } else seen.add(record.id);
  });
  return { blocks: parser.blocks };
}
