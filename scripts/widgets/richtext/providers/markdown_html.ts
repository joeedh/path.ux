import { isInlineWidget } from "../widget_codec";
// HTML in a markdown source, both ways: the element table that folds a tag into a block kind
// or a mark, the sanitizer that decides which attributes and styles survive into the model,
// and the emitter that writes a block back as HTML when markdown syntax cannot carry it.
// The model is the trust boundary: nothing reaches a live element that did not pass here.

import type { BlockId } from "../provider";
import { InlineBuilder, inlineTree, treeText } from "./markdown_inline";
import type { InlineNode, OpenMark } from "./markdown_inline";
import type { MdBlock, MdHtml, MdImage, MdKind, MdMark } from "./markdown_model";
import { mdBlock, wikilinkSource } from "./markdown_model";

/** GitHub's sanitizer list: the elements most renderers show. Anything else is dropped. */
export const ALLOWED_ELEMENTS: ReadonlySet<string> = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "span",
  "br",
  "hr",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "ins",
  "code",
  "pre",
  "kbd",
  "samp",
  "var",
  "tt",
  "sup",
  "sub",
  "small",
  "mark",
  "abbr",
  "cite",
  "dfn",
  "q",
  "time",
  "a",
  "img",
  "blockquote",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "details",
  "summary",
  "figure",
  "figcaption",
  "center",
  "wbr",
]);

/** Media and embeds: preserved as opaque `raw` blocks, never instantiated. */
export const RAW_ELEMENTS: ReadonlySet<string> = new Set([
  "video",
  "audio",
  "picture",
  "iframe",
  "object",
  "embed",
]);

/** Dropped with their content. */
const DROPPED_ELEMENTS: ReadonlySet<string> = new Set(["script", "style", "form", "template"]);

// Elements that end an inline run and start a block of their own, allowed or not; an
// element outside this set is walked as inline content
const BLOCK_ELEMENTS: ReadonlySet<string> = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "div",
  "hr",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "details",
  "summary",
  "figure",
  "figcaption",
  "center",
  "section",
  "article",
  "nav",
  "header",
  "footer",
  "main",
  "aside",
  "address",
  "fieldset",
  "legend",
  "menu",
  "dialog",
  "body",
  "html",
  "head",
  "md-raw-placeholder",
  ...RAW_ELEMENTS,
]);

const ALLOWED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "id",
  "class",
  "title",
  "lang",
  "dir",
  "align",
  "width",
  "height",
  "style",
]);

/** Allowed only on the elements they belong to. */
const ELEMENT_ATTRIBUTES: Record<string, readonly string[]> = {
  a      : ["href", "target", "rel"],
  img    : ["src", "alt"],
  details: ["open"],
  td     : ["colspan", "rowspan"],
  th     : ["colspan", "rowspan"],
};

/**
 * The HTML attribute vocabulary: a name here that is not on the allowlist is dropped, since
 * the browser has a meaning for it; a name outside it is a consumer's own and is kept as
 * inert text. Carries the attributes that act without appearing on older lists.
 */
const HTML_VOCABULARY: ReadonlySet<string> = new Set([
  "accesskey",
  "autocapitalize",
  "autocorrect",
  "autofocus",
  "contenteditable",
  "draggable",
  "enterkeyhint",
  "exportparts",
  "hidden",
  "inert",
  "inputmode",
  "is",
  "itemid",
  "itemprop",
  "itemref",
  "itemscope",
  "itemtype",
  "nonce",
  "part",
  "popover",
  "slot",
  "spellcheck",
  "tabindex",
  "translate",
  "writingsuggestions",
  "role",
  "xmlns",
  "xml:lang",
  "action",
  "method",
  "enctype",
  "formaction",
  "formmethod",
  "formtarget",
  "formenctype",
  "formnovalidate",
  "novalidate",
  "srcdoc",
  "srcset",
  "sizes",
  "ping",
  "download",
  "referrerpolicy",
  "crossorigin",
  "loading",
  "decoding",
  "fetchpriority",
  "usemap",
  "ismap",
  "type",
  "name",
  "value",
  "for",
  "form",
  "list",
  "autocomplete",
  "disabled",
  "readonly",
  "required",
  "checked",
  "selected",
  "multiple",
  "size",
  "maxlength",
  "minlength",
  "min",
  "max",
  "step",
  "pattern",
  "placeholder",
  "accept",
  "capture",
  "cite",
  "datetime",
  "start",
  "reversed",
  "span",
  "headers",
  "scope",
  "abbr",
  "charset",
  "content",
  "http-equiv",
  "media",
  "hreflang",
  "shape",
  "coords",
  "controls",
  "autoplay",
  "loop",
  "muted",
  "poster",
  "preload",
  "playsinline",
  "sandbox",
  "allow",
  "allowfullscreen",
  "frameborder",
  "scrolling",
  "data",
  "codebase",
  "classid",
  "label",
  "wrap",
  "cols",
  "rows",
  "dirname",
  "async",
  "defer",
  "integrity",
  "language",
  "kind",
  "srclang",
  "default",
  "popovertarget",
  "popovertargetaction",
  "commandfor",
  "command",
  "shadowrootmode",
  "shadowrootdelegatesfocus",
  "shadowrootclonable",
  "shadowrootserializable",
  "xlink:href",
  "bgcolor",
  "background",
  "border",
  "cellpadding",
  "cellspacing",
  "valign",
  "color",
  "face",
  "noshade",
  "nowrap",
  "compact",
  "frame",
  "rules",
  "summary",
  "axis",
  "char",
  "charoff",
  "hspace",
  "vspace",
  "longdesc",
  "marginheight",
  "marginwidth",
  "clear",
  "version",
  "profile",
  "scheme",
  "rev",
  "manifest",
  "nomodule",
  "blocking",
  "elementtiming",
  "virtualkeyboardpolicy",
  "anchor",
  "open",
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "colspan",
  "rowspan",
]);

/** The editor's and provider's own protocol attributes, dropped whatever the allowlist says. */
const RESERVED_PREFIXES = ["data-doc-", "data-md-", "data-link-"];

const STYLE_PROPERTIES: ReadonlySet<string> = new Set([
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
  "vertical-align",
  "line-height",
  "letter-spacing",
  "white-space",
  "display",
  "width",
  "height",
  "max-width",
  "max-height",
  "float",
  "opacity",
  "border-radius",
]);

const STYLE_PREFIXES = ["margin", "padding", "border", "list-style"];

const SAFE_SCHEMES: ReadonlySet<string> = new Set(["http", "https", "mailto", "tel"]);

/**
 * `url` when it may be set as an `href` or `src`, else `undefined`: a relative path, a
 * fragment, or one of the safe schemes; `data:image/*` too when `image` is set.
 */
export function safeUrl(url: string, image = false): string | undefined {
  const value = url.trim();
  // a scheme is read with control characters and spaces removed, as the browser reads it
  // eslint-disable-next-line no-control-regex
  const probe = value.replace(/[\u0000-\u0020]/g, "").toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(probe);

  if (scheme === null) {
    return value;
  }
  if (SAFE_SCHEMES.has(scheme[1])) {
    return value;
  }
  if (image && scheme[1] === "data" && probe.startsWith("data:image/")) {
    return value;
  }

  return undefined;
}

const styleValueUnsafe = (value: string) => /url\s*\(|expression\s*\(|@|\\|</i.test(value);

const styleAllowed = (name: string) =>
  STYLE_PROPERTIES.has(name) || STYLE_PREFIXES.some((p) => name === p || name.startsWith(`${p}-`));

/** Splits `text` into declarations at `;` outside quotes and parentheses. */
function splitDeclarations(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== "") {
      if (ch === quote) {
        quote = "";
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
    } else if (ch === ";" && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));

  return out;
}

/**
 * The declarations of a `style` attribute that may reach a live element, as a property
 * record; the provider's own tokenizer, so the result does not depend on the host's CSS parser.
 */
export function sanitizeStyle(text: string): Record<string, string> {
  const out: Record<string, string> = {};

  for (const decl of splitDeclarations(text)) {
    const colon = decl.indexOf(":");
    if (colon < 0) {
      continue;
    }

    const name = decl.slice(0, colon).trim().toLowerCase();
    const value = decl.slice(colon + 1).trim();
    if (name !== "" && value !== "" && styleAllowed(name) && !styleValueUnsafe(value)) {
      out[name] = value;
    }
  }

  return out;
}

const reserved = (name: string) => RESERVED_PREFIXES.some((p) => name.startsWith(p));

/**
 * The attributes of a `tag` that may reach a live element. `style` is not among them: it goes
 * through `sanitizeStyle` and lives in its own record.
 */
export function sanitizeAttrs(
  tag: string,
  attrs: Readonly<Record<string, string>>
): Record<string, string> {
  const out: Record<string, string> = {};
  const own = ELEMENT_ATTRIBUTES[tag] ?? [];

  for (const [rawName, value] of Object.entries(attrs)) {
    const name = rawName.toLowerCase();
    if (name === "style" || reserved(name) || /^on/.test(name)) {
      continue;
    }

    if (name === "class") {
      const classes = value.split(/\s+/).filter((c) => c !== "" && !c.startsWith("md-"));
      if (classes.length > 0) {
        out.class = classes.join(" ");
      }
    } else if (name === "href" || name === "src") {
      const url = own.includes(name) ? safeUrl(value, name === "src") : undefined;
      if (url !== undefined) {
        out[name] = url;
      }
    } else if (
      ALLOWED_ATTRIBUTES.has(name) ||
      own.includes(name) ||
      name.startsWith("data-") ||
      name.startsWith("aria-") ||
      !HTML_VOCABULARY.has(name)
    ) {
      out[name] = value;
    }
  }

  return out;
}

const emptyToUndefined = (record: Record<string, string>) =>
  Object.keys(record).length > 0 ? record : undefined;

/** The sanitized `style` and `attrs` of an element, each absent when nothing survived. */
export function sanitizedOf(element: Element): {
  style?: Record<string, string>;
  attrs?: Record<string, string>;
} {
  const tag = element.tagName.toLowerCase();
  const raw: Record<string, string> = {};
  for (const attr of element.attributes) {
    raw[attr.name] = attr.value;
  }

  const style = element.getAttribute("style");
  return {
    style: style === null ? undefined : emptyToUndefined(sanitizeStyle(style)),
    attrs: emptyToUndefined(sanitizeAttrs(tag, raw)),
  };
}

/** The mark a pair of inline tags becomes, or `undefined` when the pair only keeps its content. */
export function markForTag(tag: string, element: Element): OpenMark | undefined {
  const { style, attrs } = sanitizedOf(element);
  const carry = { style, attrs };

  switch (tag) {
    case "b":
    case "strong":
      return { name: "bold", ...carry };
    case "i":
    case "em":
      return { name: "italic", ...carry };
    case "u":
    case "ins":
      return { name: "underline", ...carry };
    case "s":
    case "del":
    case "strike":
      return { name: "strikethrough", ...carry };
    case "code":
      return { name: "code", ...carry };
    case "a": {
      const rest = attrs === undefined ? undefined : { ...attrs };
      const target = rest?.href;
      const title = rest?.title;
      if (rest !== undefined) {
        delete rest.href;
        delete rest.title;
      }
      if (target === undefined) {
        return undefined;
      }

      return {
        name: "link",
        kind: "url",
        target,
        title,
        style,
        attrs: rest === undefined ? undefined : emptyToUndefined(rest),
      };
    }
    case "span":
      return { name: "style", ...carry };
    default:
      return ALLOWED_ELEMENTS.has(tag) ? { name: "style", tag, ...carry } : undefined;
  }
}

/** The image record of an `<img>`, with its sanitized attributes beyond the ones it names. */
export function imageOf(element: Element): MdImage | undefined {
  const { attrs } = sanitizedOf(element);
  const rest = attrs === undefined ? {} : { ...attrs };
  const src = rest.src;
  if (src === undefined) {
    return undefined;
  }

  const width = Number.parseInt(rest.width ?? "", 10);
  const image: MdImage = { src, alt: rest.alt ?? "" };
  if (rest.title !== undefined) {
    image.title = rest.title;
  }
  if (Number.isFinite(width) && width > 0) {
    image.width = width;
  }
  delete rest.src;
  delete rest.alt;
  delete rest.title;
  delete rest.width;
  const extra = emptyToUndefined(rest);
  if (extra !== undefined) {
    image.attrs = extra;
  }

  return image;
}

/** What one inline `html` node of an mdast paragraph is. */
export type InlineTag =
  | { type: "open"; tag: string; element: Element; source: string }
  | { type: "close"; tag: string; source: string }
  | { type: "void"; tag: string; element: Element }
  | { type: "other" };

const VOID_ELEMENTS: ReadonlySet<string> = new Set(["br", "img", "wbr", "hr"]);

/** Reads one inline tag with `DOMParser`, so its attributes are decoded as a browser would. */
export function parseInlineTag(source: string): InlineTag {
  const close = /^\s*<\/([a-zA-Z][\w:-]*)\s*>\s*$/.exec(source);
  if (close !== null) {
    return { type: "close", tag: close[1].toLowerCase(), source };
  }

  const open = /^\s*<([a-zA-Z][\w:-]*)(\s[^>]*)?>\s*$/.exec(source);
  if (open === null) {
    return { type: "other" };
  }

  const tag = open[1].toLowerCase();
  // a media or script element is read as a span, so no host ever instantiates one
  const inert =
    RAW_ELEMENTS.has(tag) || DROPPED_ELEMENTS.has(tag)
      ? source.replace(/^\s*<[a-zA-Z][\w:-]*/, "<span")
      : source;
  const doc = new DOMParser().parseFromString(`<body>${inert}</body>`, "text/html");
  const element = doc.body.firstElementChild;
  if (element === null || element.tagName.toLowerCase() !== (inert === source ? tag : "span")) {
    return { type: "other" };
  }

  if (VOID_ELEMENTS.has(tag) || /\/\s*>\s*$/.test(source)) {
    return { type: "void", tag, element };
  }

  return { type: "open", tag, element, source };
}

/** What a parse inherits from the wrappers and containers around a block. */
export interface HtmlContext {
  quoteDepth: number;
  listDepth: number;
  ordered: boolean;
  /** A wrapper's style and attributes, copied onto every block it contains. */
  style?: Record<string, string>;
  attrs?: Record<string, string>;
}

export const rootHtmlContext = (): HtmlContext => ({
  quoteDepth: 0,
  listDepth : 0,
  ordered   : false,
});

/**
 * A block-level `html` node that is one opening tag, or one closing tag, and so wraps the
 * markdown after it; `undefined` for a node that holds its whole element.
 */
export function htmlWrapper(
  source: string
): { type: "open"; tag: string; element: Element } | { type: "close"; tag: string } | undefined {
  const tag = parseInlineTag(source);
  if (tag.type !== "other" && RAW_ELEMENTS.has(tag.tag)) {
    // a media element wraps nothing: its opening tag alone is the raw block
    return undefined;
  }
  if (tag.type === "close" && BLOCK_ELEMENTS.has(tag.tag)) {
    return { type: "close", tag: tag.tag };
  }
  if (tag.type === "open" && BLOCK_ELEMENTS.has(tag.tag)) {
    return { type: "open", tag: tag.tag, element: tag.element };
  }

  return undefined;
}

/**
 * A context under `element`, carrying its style and attributes on to what it contains. Only
 * the attributes any element may carry come along; one that belongs to the wrapper's own
 * element, such as `open` on `details`, stays with it.
 */
export function contextUnder(element: Element, ctx: HtmlContext): HtmlContext {
  const { style, attrs: own } = sanitizedOf(element);
  const attrs = own === undefined ? undefined : emptyToUndefined(sanitizeAttrs("div", own));
  return {
    ...ctx,
    style: style === undefined ? ctx.style : { ...ctx.style, ...style },
    attrs: attrs === undefined ? ctx.attrs : { ...ctx.attrs, ...attrs },
  };
}

const headingLevel = (tag: string) => {
  const level = Number(tag.slice(1));
  return level >= 1 && level <= 6 ? (level as 1 | 2 | 3 | 4 | 5 | 6) : undefined;
};

/** The block kind a text-bearing element makes under `ctx`. */
function textKind(tag: string, ctx: HtmlContext): MdKind {
  const level = headingLevel(tag);
  if (/^h[1-6]$/.test(tag) && level !== undefined) {
    return { kind: "heading", level };
  }
  if (ctx.listDepth > 0 || tag === "li") {
    return { kind: "listItem", ordered: ctx.ordered, depth: Math.max(0, ctx.listDepth - 1) };
  }
  if (ctx.quoteDepth > 0) {
    return { kind: "quote", depth: ctx.quoteDepth - 1 };
  }

  return { kind: "paragraph" };
}

const OWN_TAGS: ReadonlySet<string> = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "pre",
]);

/** Parses the HTML of one block-level node into blocks, flattening what it wraps. */
export function blocksFromHtml(source: string, ctx: HtmlContext, newId: () => BlockId): MdBlock[] {
  const { html, raw } = extractRaw(source);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const out: MdBlock[] = [];
  const walker = new HtmlWalker(newId, out, raw);
  walker.walk([...doc.body.childNodes], ctx, source.trim());
  walker.flush();

  return out;
}

const RAW_PLACEHOLDER = "md-raw-placeholder";

/**
 * Cuts every media element out of `source` before the parser sees it, since a host may load
 * what a parsed document names; each is replaced by an empty placeholder element that the
 * walk turns back into the verbatim source. An element that never closes runs to the end.
 */
function extractRaw(source: string): { html: string; raw: string[] } {
  const raw: string[] = [];
  const open = /<(video|audio|picture|iframe|object|embed)\b[^>]*>/gi;
  let html = "";
  let last = 0;

  for (;;) {
    open.lastIndex = last;
    const match = open.exec(source);
    if (match === null) {
      break;
    }

    const close = new RegExp(`</${match[1]}\\s*>`, "i");
    close.lastIndex = 0;
    const rest = source.slice(match.index + match[0].length);
    const closeMatch = close.exec(rest);
    const end =
      closeMatch === null
        ? source.length
        : match.index + match[0].length + closeMatch.index + closeMatch[0].length;

    html += `${source.slice(last, match.index)}<${RAW_PLACEHOLDER} data-raw="${raw.length}"></${RAW_PLACEHOLDER}>`;
    raw.push(source.slice(match.index, end));
    last = end;
  }

  return { html: html + source.slice(last), raw };
}

class HtmlWalker {
  private pending?: {
    builder: InlineBuilder;
    ctx: HtmlContext;
    tag: string;
    task?: boolean;
    checked?: boolean;
  };

  constructor(
    private readonly newId: () => BlockId,
    private readonly out: MdBlock[],
    private readonly raw: readonly string[]
  ) {}

  /** Ends the inline run in progress as one block of its context's kind. */
  flush(): void {
    const pending = this.pending;
    this.pending = undefined;
    if (pending === undefined) {
      return;
    }

    pending.builder.trim();
    if (pending.builder.length === 0 && pending.tag === "") {
      return;
    }

    const kind = textKind(pending.tag, pending.ctx);
    if (kind.kind === "listItem" && pending.task) {
      kind.task = true;
      kind.checked = pending.checked === true;
    }
    const block = pending.builder.finish(mdBlock(this.newId(), kind));

    const html: MdHtml = {};
    if (pending.tag !== "" && !OWN_TAGS.has(pending.tag)) {
      html.tag = pending.tag;
    }
    if (pending.ctx.style !== undefined) {
      html.style = pending.ctx.style;
    }
    if (pending.ctx.attrs !== undefined) {
      html.attrs = pending.ctx.attrs;
    }
    if (Object.keys(html).length > 0) {
      block.html = html;
    }

    this.out.push(block);
  }

  private inline(ctx: HtmlContext, tag = ""): InlineBuilder {
    if (this.pending === undefined) {
      this.pending = { builder: new InlineBuilder(), ctx, tag };
    }

    return this.pending.builder;
  }

  /** Walks `nodes` as block content; `source` is the verbatim text when it is one element. */
  walk(nodes: readonly ChildNode[], ctx: HtmlContext, source?: string): void {
    const single = nodes.filter((n) => n.nodeType !== 3 || n.textContent?.trim() !== "");
    const verbatim = single.length === 1 ? source : undefined;

    for (const node of nodes) {
      if (node.nodeType === 3) {
        const text = node.textContent ?? "";
        if (this.pending !== undefined || text.trim() !== "") {
          this.inline(ctx).append(text.replace(/\s+/g, " "));
        }
        continue;
      }
      if (node.nodeType !== 1) {
        continue;
      }

      const element = node as Element;
      const tag = element.tagName.toLowerCase();
      if (DROPPED_ELEMENTS.has(tag)) {
        continue;
      }
      if (!BLOCK_ELEMENTS.has(tag)) {
        this.walkInline(element, this.inline(ctx), ctx);
        continue;
      }

      this.flush();
      this.block(element, tag, ctx, verbatim);
    }
  }

  private block(element: Element, tag: string, ctx: HtmlContext, verbatim?: string): void {
    const opaque = (kind: "table" | "raw") => {
      const block = mdBlock(this.newId(), { kind, source: verbatim ?? element.outerHTML });
      block.text = "";
      this.out.push(block);
    };

    if (tag === RAW_PLACEHOLDER) {
      const source = this.raw[Number(element.getAttribute("data-raw"))] ?? "";
      this.out.push(mdBlock(this.newId(), { kind: "raw", source }));
    } else if (tag === "table") {
      opaque("table");
    } else if (tag === "hr") {
      this.out.push(mdBlock(this.newId(), { kind: "hr" }));
    } else if (tag === "pre") {
      this.code(element);
    } else if (tag === "blockquote") {
      const inner = contextUnder(element, { ...ctx, quoteDepth: ctx.quoteDepth + 1 });
      this.walk([...element.childNodes], inner);
      this.flush();
    } else if (tag === "ul" || tag === "ol") {
      const inner = contextUnder(element, {
        ...ctx,
        listDepth: ctx.listDepth + 1,
        ordered  : tag === "ol",
      });
      for (const child of element.children) {
        if (child.tagName.toLowerCase() === "li") {
          this.listItem(child, inner);
        }
      }
    } else if (!ALLOWED_ELEMENTS.has(tag)) {
      // not on the list: the element goes, its content stays in place
      this.walk([...element.childNodes], ctx);
      this.flush();
    } else if (hasBlockChildren(element)) {
      this.walk([...element.childNodes], contextUnder(element, ctx));
      this.flush();
    } else {
      this.textBlock(element, tag, contextUnder(element, ctx));
    }
  }

  /** A text-bearing element: its inline content as one block, its tag kept when not the kind's own. */
  private textBlock(element: Element, tag: string, ctx: HtmlContext): void {
    const builder = this.inline(ctx, tag);
    this.walkInline(element, builder, ctx, true);
    this.flush();
  }

  private listItem(li: Element, ctx: HtmlContext): void {
    const itemCtx = contextUnder(li, ctx);
    const builder = this.inline(itemCtx, "li");
    const nested: Element[] = [];

    for (const node of li.childNodes) {
      if (node.nodeType === 1) {
        const child = node as Element;
        const tag = child.tagName.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          nested.push(child);
          continue;
        }
        if (BLOCK_ELEMENTS.has(tag)) {
          // a paragraph inside the item is the item's own text; a second one follows as a block
          if (builder.length === 0 && (tag === "p" || tag === "div")) {
            this.walkInline(child, builder, itemCtx, true);
          } else {
            this.flush();
            this.block(child, tag, itemCtx);
          }
          continue;
        }
      }
      if (node.nodeType === 3) {
        builder.append((node.textContent ?? "").replace(/\s+/g, " "));
      } else if (node.nodeType === 1) {
        this.walkInline(node as Element, builder, itemCtx);
      }
    }

    this.flush();
    for (const list of nested) {
      this.block(list, list.tagName.toLowerCase(), itemCtx);
    }
  }

  private code(pre: Element): void {
    const code = pre.querySelector("code");
    const lang = /language-([\w+-]+)/.exec(code?.getAttribute("class") ?? "")?.[1] ?? "";
    const text = (code ?? pre).textContent ?? "";
    this.out.push(mdBlock(this.newId(), { kind: "code", lang }, text.replace(/\n$/, "")));
  }

  /** Walks an element's content as inline runs, wrapping it in its mark when it has one. */
  private walkInline(
    element: Element,
    builder: InlineBuilder,
    ctx: HtmlContext,
    own = false
  ): void {
    const tag = element.tagName.toLowerCase();
    if (DROPPED_ELEMENTS.has(tag)) {
      return;
    }
    if (
      tag === "code" &&
      element.hasAttribute("data-pathux-widget") &&
      !element.children.length &&
      isInlineWidget(element.textContent ?? "")
    ) {
      builder.widget(element.textContent ?? "");
      return;
    }
    if (tag === "br") {
      builder.lineBreak(true);
      return;
    }
    if (tag === "img") {
      const image = imageOf(element);
      if (image !== undefined) {
        builder.atom(image);
      }
      return;
    }
    if (tag === "input") {
      if (
        element.getAttribute("type")?.toLowerCase() === "checkbox" &&
        this.pending !== undefined
      ) {
        this.pending.task = true;
        this.pending.checked = element.hasAttribute("checked");
      }
      return;
    }

    const mark = own ? undefined : markForTag(tag, element);
    const handle = mark === undefined ? undefined : builder.start(mark);
    for (const node of element.childNodes) {
      if (node.nodeType === 3) {
        builder.append((node.textContent ?? "").replace(/\s+/g, " "));
      } else if (node.nodeType === 1) {
        this.walkInline(node as Element, builder, ctx);
      }
    }
    if (handle !== undefined) {
      builder.close(handle);
    }
  }
}

function hasBlockChildren(element: Element): boolean {
  for (const child of element.children) {
    if (BLOCK_ELEMENTS.has(child.tagName.toLowerCase())) {
      return true;
    }
  }

  return false;
}

// Emitting

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A `style` record as the attribute's text. */
export function styleText(style: Readonly<Record<string, string>>): string {
  return Object.entries(style)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

/** The attribute text of an element, leading space included; empty when there is none. */
export function attrText(
  attrs: Readonly<Record<string, string>> | undefined,
  style?: Readonly<Record<string, string>>
): string {
  let out = "";
  if (style !== undefined && Object.keys(style).length > 0) {
    out += ` style="${escapeHtml(styleText(style))}"`;
  }
  for (const [k, v] of Object.entries(attrs ?? {})) {
    out += ` ${k}="${escapeHtml(v)}"`;
  }

  return out;
}

/** The tag a mark wraps its content in when written as HTML, with its attributes. */
export function markTag(mark: MdMark): { open: string; close: string } {
  const wrap = (tag: string, extra = "") => ({
    open : `<${tag}${extra}${attrText(mark.attrs, mark.style)}>`,
    close: `</${tag}>`,
  });

  switch (mark.name) {
    case "bold":
      return wrap("strong");
    case "italic":
      return wrap("em");
    case "underline":
      return wrap("u");
    case "strikethrough":
      return wrap("s");
    case "code":
      return wrap("code");
    case "link": {
      if (mark.kind === "wiki") {
        return { open: "", close: "" };
      }
      const title = mark.title === undefined ? "" : ` title="${escapeHtml(mark.title)}"`;
      return wrap("a", ` href="${escapeHtml(mark.target ?? "")}"${title}`);
    }
    case "style":
      return wrap(mark.tag ?? "span");
    default:
      return { open: "", close: "" };
  }
}

/** An image as an `<img>` tag. */
export function imageTag(image: MdImage): string {
  let out = `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"`;
  if (image.title !== undefined) {
    out += ` title="${escapeHtml(image.title)}"`;
  }
  if (image.width !== undefined) {
    out += ` width="${image.width}"`;
  }

  return `${out}${attrText(image.attrs)}>`;
}

/** Inline content as HTML; a wikilink stays in its bracket form, which any renderer leaves alone. */
export function inlineHtml(nodes: readonly InlineNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += escapeHtml(node.value);
    } else if (node.type === "atom") {
      out +=
        node.atom.widget !== undefined
          ? "<code data-pathux-widget>" + escapeHtml(node.atom.widget) + "</code>"
          : imageTag(node.atom.image);
    } else if (node.type === "break") {
      out += "<br>";
    } else if (node.mark.name === "link" && node.mark.kind === "wiki") {
      out += wikilinkSource(node.mark.target ?? "", treeText(node.children));
    } else {
      const { open, close } = markTag(node.mark);
      out += open + inlineHtml(node.children) + close;
    }
  }

  return out;
}

/** The whole of `block` as one HTML block, for a block markdown syntax cannot carry. */
export function htmlForBlock(block: MdBlock): string {
  if (block.kind === "widget") return `<pre>${escapeHtml(block.source)}</pre>`;
  const attrs = attrText(block.html?.attrs, block.html?.style);
  const inner = inlineHtml(inlineTree(block));

  switch (block.kind) {
    case "heading": {
      const tag = block.html?.tag ?? `h${block.level}`;
      return `<${tag}${attrs}>${inner}</${tag}>`;
    }
    case "listItem": {
      // written inside a markdown list item, so the list itself is markdown
      const box = block.task
        ? `<input type="checkbox" disabled${block.checked ? " checked" : ""}> `
        : "";
      return `<li${attrs}>${box}${inner}</li>`;
    }
    case "quote":
      return `<blockquote${attrs}>${inner}</blockquote>`;
    case "code": {
      const lang = block.lang === "" ? "" : ` class="language-${escapeHtml(block.lang)}"`;
      return `<pre${attrs}><code${lang}>${escapeHtml(block.text)}</code></pre>`;
    }
    case "hr":
      return `<hr${attrs}>`;
    case "table":
    case "raw":
    case "frontmatter":
      return block.source;
    default: {
      const tag = block.html?.tag ?? "p";
      return `<${tag}${attrs}>${inner}</${tag}>`;
    }
  }
}
