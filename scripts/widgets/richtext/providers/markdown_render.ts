import type { WidgetDescriptor } from "../widget";
import { newBlockId } from "../provider";
// The DOM for a markdown block, and the stylesheet the blocks need. One element per block, the
// inline runs from the shared tree walk; bullets and numbers are drawn by CSS alone, so nothing
// but the block's own text ever counts in the position walk.

import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import type { Table } from "mdast";
import { UIBase } from "../../../core/ui_base";
import { CARET_SLOT } from "../provider";
import type { LinkInfo, ProviderContext } from "../provider";
import { safeUrl, sanitizeAttrs, sanitizeStyle, styleText } from "./markdown_html";
import { MdImageWidget } from "./markdown_image";
import { inlineTree } from "./markdown_inline";
import type { InlineNode } from "./markdown_inline";
import { markdownDocFromText } from "./markdown_parse";
import type { MdAtom, MdBlock, MdImage, MdMark } from "./markdown_model";

/** What `renderMarkdownBlock` takes beyond the block: the consumer's media hook. */
export interface MarkdownRenderOptions {
  /**
   * The element for an image atom, called for every one; `undefined` falls back to `<img>`.
   * The provider wraps what comes back in the atom element, so the atom contract stays its own.
   */
  renderMedia?: (
    image: MdImage,
    ctx: ProviderContext
  ) => HTMLElement | WidgetDescriptor | undefined;
}

/** Depths the numbering rules are generated for; a deeper item still lists, without a counter. */
const COUNTER_DEPTHS = 8;

const MARK_ELEMENTS: Record<string, string> = {
  bold         : "strong",
  italic       : "em",
  underline    : "u",
  strikethrough: "s",
  code         : "code",
};

/** Sets the sanitized `style` and attributes on `el`, sanitizing again so a hand-built block cannot bypass it. */
function applyHtml(
  el: HTMLElement,
  style: Readonly<Record<string, string>> | undefined,
  attrs: Readonly<Record<string, string>> | undefined
): void {
  const tag = el.tagName.toLowerCase();

  if (style !== undefined) {
    const safe = sanitizeStyle(styleText(style));
    if (Object.keys(safe).length > 0) {
      el.setAttribute("style", styleText(safe));
    }
  }
  if (attrs !== undefined) {
    for (const [name, value] of Object.entries(sanitizeAttrs(tag, attrs))) {
      el.setAttribute(name, value);
    }
  }
}

/** The link the `<a>` for `mark` reports when clicked. */
function linkInfo(block: MdBlock, mark: MdMark): LinkInfo {
  return {
    kind  : mark.kind ?? "url",
    target: mark.target ?? "",
    text  : block.text.slice(mark.from, mark.to),
    range: {
      anchor: { block: block.id, offset: mark.from },
      head  : { block: block.id, offset: mark.to },
    },
  };
}

function markElement(block: MdBlock, mark: MdMark, ctx: ProviderContext): HTMLElement {
  if (mark.name === "link") {
    const a = document.createElement("a");
    a.setAttribute("data-link-kind", mark.kind ?? "url");
    a.setAttribute("data-link-target", mark.target ?? "");
    const href = mark.kind === "url" || mark.kind === undefined ? safeUrl(mark.target ?? "") : "#";
    if (href !== undefined) {
      a.setAttribute("href", href);
    }
    if (mark.title !== undefined) {
      a.setAttribute("title", mark.title);
    }
    applyHtml(a, mark.style, mark.attrs);
    // the editor decides what a link means; the browser's own navigation never runs
    a.addEventListener("click", (e) => {
      e.preventDefault();
      ctx.editor.linkClicked(linkInfo(block, mark), e);
    });
    return a;
  }

  const el = document.createElement(
    mark.name === "style" ? (mark.tag ?? "span") : (MARK_ELEMENTS[mark.name] ?? "span")
  );
  applyHtml(el, mark.style, mark.attrs);
  return el;
}

/** The atom element for an image: the hook's element or an `<img>`, inside the opaque wrapper. */
/** The atom element: the consumer's media element, or an `md-image-x` with its resize and move gestures. */
function atomElement(
  block: MdBlock,
  atom: MdAtom,
  ctx: ProviderContext,
  options: MarkdownRenderOptions
): HTMLElement {
  const wrap = document.createElement("span");
  if (atom.widget !== undefined) {
    wrap.className = "md-inline-widget";
    wrap.dataset.docAtom = "";
    wrap.contentEditable = "false";
    const descriptor = ctx.editor.inlineWidget?.({ block: block.id, offset: atom.offset });
    if (descriptor && ctx.editor.widget) wrap.append(ctx.editor.widget(descriptor));
    else wrap.textContent = "Widget unavailable";
    return wrap;
  }
  wrap.className = "md-image";
  wrap.setAttribute("data-doc-atom", "");
  wrap.setAttribute("contenteditable", "false");

  atom.id ??= newBlockId();
  const custom = options.renderMedia?.(atom.image, ctx);
  if (custom instanceof HTMLElement) {
    wrap.append(
      ctx.editor.widget
        ? ctx.editor.widget({
            id            : atom.id,
            implementation: {},
            label         : atom.image.alt || "Media",
            create        : () => ({ element: custom, dispose: () => custom.remove() }),
          })
        : custom
    );
    return wrap;
  }
  const descriptor: WidgetDescriptor = custom
    ? { ...custom, id: atom.id }
    : {
        id            : atom.id,
        implementation: MdImageWidget,
        label         : atom.image.alt || "Image",
        value: { block: block.id, offset: atom.offset, image: structuredClone(atom.image) },
        create: () => {
          const widget = UIBase.constructElement<MdImageWidget>("md-image-x", ctx);
          return {
            element: widget,
            update: ({ value }) => {
              const state = value as { block: string; offset: number; image: MdImage };
              widget.setAtom(state.block, state.offset, state.image);
            },
            dispose: () => widget.remove(),
          };
        },
      };
  if (ctx.editor.widget) wrap.append(ctx.editor.widget(descriptor));
  else {
    const widget = UIBase.constructElement<MdImageWidget>("md-image-x", ctx);
    widget.setAtom(block.id, atom.offset, atom.image);
    wrap.append(widget);
  }
  return wrap;
}

function renderInline(
  into: HTMLElement,
  block: MdBlock,
  nodes: readonly InlineNode[],
  ctx: ProviderContext,
  options: MarkdownRenderOptions
): void {
  for (const node of nodes) {
    if (node.type === "text") {
      into.append(document.createTextNode(node.value));
    } else if (node.type === "break") {
      // the root's pre-wrap renders the newline, which counts as the one character it is
      into.append(document.createTextNode("\n"));
    } else if (node.type === "atom") {
      into.append(
        document.createTextNode(CARET_SLOT),
        atomElement(block, node.atom, ctx, options),
        document.createTextNode(CARET_SLOT)
      );
    } else {
      const el = markElement(block, node.mark, ctx);
      renderInline(el, block, node.children, ctx, options);
      into.append(el);
    }
  }
}

/** Fills `el` with the block's inline content, the caret slot for an empty block and the trailing `<br>`. */
function fillInline(
  el: HTMLElement,
  block: MdBlock,
  ctx: ProviderContext,
  options: MarkdownRenderOptions
): void {
  if (block.text.length === 0) {
    el.append(document.createTextNode(CARET_SLOT));
    return;
  }

  renderInline(el, block, inlineTree(block), ctx, options);

  // a newline at the end draws no line of its own; the `<br>` counts 0 and gives the caret one
  if (block.text.endsWith("\n")) {
    el.append(document.createElement("br"));
  }
}

function renderCode(block: MdBlock & { kind: "code" }): HTMLElement {
  const pre = document.createElement("pre");
  pre.className = "md-code";
  if (block.lang !== "") {
    pre.setAttribute("data-md-lang", block.lang);
  }

  if (block.text.length === 0) {
    pre.append(document.createTextNode(CARET_SLOT));
    return pre;
  }

  pre.append(document.createTextNode(block.text));
  if (block.text.endsWith("\n")) {
    pre.append(document.createElement("br"));
  }

  return pre;
}

function renderListItem(
  block: MdBlock & { kind: "listItem" },
  ctx: ProviderContext,
  options: MarkdownRenderOptions
): HTMLElement {
  const el = document.createElement("div");
  el.className = "md-li";
  el.setAttribute("data-md-ordered", String(block.ordered));
  el.setAttribute("data-md-depth", String(block.depth));
  el.style.setProperty("--md-depth", String(block.depth));

  if (block.task) {
    el.setAttribute("data-md-task", "");
    el.toggleAttribute("data-md-checked", block.checked === true);

    // childless and not an atom, so it counts 0 and the block's offsets stay its text's
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "md-task";
    box.checked = block.checked === true;
    box.setAttribute("contenteditable", "false");
    box.tabIndex = -1;
    box.addEventListener("click", (e) => {
      // the re-render shows the new state; the browser's own toggle would show it twice
      e.preventDefault();
      if (!ctx.editor.readOnly) {
        void ctx.editor.dispatch({
          type  : "custom",
          name  : "setTask",
          blocks: [block.id],
          data  : { checked: block.checked !== true },
        });
      }
    });
    el.append(box);
  }

  fillInline(el, block, ctx, options);
  return el;
}

/** The table as `<table>`, each cell parsed as inline markdown; nothing in it is editable. */
function renderTable(source: string, ctx: ProviderContext, options: MarkdownRenderOptions) {
  const tree = fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const node = tree.children.find((n): n is Table => n.type === "table");
  const table = document.createElement("table");
  if (node === undefined) {
    table.append(document.createTextNode(source));
    return table;
  }

  node.children.forEach((row, r) => {
    const tr = document.createElement("tr");
    row.children.forEach((cell, c) => {
      const td = document.createElement(r === 0 ? "th" : "td");
      const align = node.align?.[c];
      if (align !== undefined && align !== null) {
        td.style.textAlign = align;
      }

      const md = toMarkdown(
        { type: "paragraph", children: cell.children },
        {
          extensions: [gfmToMarkdown()],
          emphasis  : "*",
          strong    : "*",
          unsafe    : [{ character: "{", after: "\\{pathux-widget-v[0-9]+:" }],
        }
      );
      const block = markdownDocFromText(md).blocks[0];
      if (block !== undefined && block.text.length > 0) {
        renderInline(td, block, inlineTree(block), ctx, options);
      }
      tr.append(td);
    });
    (r === 0 ? table.createTHead() : (table.tBodies[0] ?? table.createTBody())).append(tr);
  });

  return table;
}

/** An opaque block's element: the class, the flag, and one child so offsets 0 and 1 have a DOM place each. */
function opaque(className: string, child: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.className = `${className} md-opaque`;
  el.setAttribute("contenteditable", "false");
  el.append(child);
  return el;
}

/** The opening tag of a raw block, for its placeholder. */
function openingTag(source: string): string {
  const match = /<[^>]*>/.exec(source);
  return match === null ? source.trim().split("\n")[0] : match[0];
}

/**
 * A fresh element for `block`, carrying `data-doc-block`: `<p>` and `<h1>` to `<h6>` for
 * paragraphs and headings, a `div.md-li` with `display: list-item` for a list item, `div.md-quote`
 * for a quote, `<pre>` for code, and an opaque `contenteditable="false"` `div` wrapping a rule, a
 * table rendered from its source, a raw block's placeholder or the front matter's text.
 */
export function renderMarkdownBlock(
  block: MdBlock,
  ctx: ProviderContext,
  options: MarkdownRenderOptions = {}
): HTMLElement {
  let el: HTMLElement;

  switch (block.kind) {
    case "heading":
      el = document.createElement(`h${block.level}`);
      fillInline(el, block, ctx, options);
      break;
    case "listItem":
      el = renderListItem(block, ctx, options);
      break;
    case "quote":
      el = document.createElement("div");
      el.className = "md-quote";
      el.setAttribute("data-md-depth", String(block.depth));
      el.style.setProperty("--md-depth", String(block.depth));
      fillInline(el, block, ctx, options);
      break;
    case "code":
      el = renderCode(block);
      break;
    case "hr":
      el = opaque("md-hr", document.createElement("hr"));
      break;
    case "table":
      el = opaque("md-table", renderTable(block.source, ctx, options));
      break;
    case "raw": {
      const tag = document.createElement("code");
      tag.textContent = openingTag(block.source);
      el = opaque("md-raw", tag);
      break;
    }
    case "widget": {
      const label = document.createElement("code");
      label.textContent = "Widget unavailable";
      el = opaque("md-widget", label);
      break;
    }
    case "frontmatter": {
      const pre = document.createElement("pre");
      pre.textContent = block.source;
      el = opaque("md-frontmatter", pre);
      break;
    }
    default:
      el = document.createElement("p");
      if (block.html?.tag !== undefined && block.html.tag !== "p") {
        el.setAttribute("data-md-tag", block.html.tag);
      }
      fillInline(el, block, ctx, options);
      break;
  }

  if (block.html !== undefined) {
    applyHtml(el, block.html.style, block.html.attrs);
  }
  el.setAttribute("data-doc-block", block.id);

  return el;
}

/** The counter rules: a non-item resets every depth, an item resets the depths below its own, a bullet its own too. */
function counterRules(): string {
  const all = Array.from({ length: COUNTER_DEPTHS }, (_, d) => `md-ol-${d}`);
  let css = `
    .rich-text-root, [data-doc-block]:not(.md-li) { counter-reset: ${all.join(" ")}; }
  `;

  for (let d = 0; d < COUNTER_DEPTHS; d++) {
    const below = all.slice(d + 1).join(" ");
    const own = `md-ol-${d}`;
    css += `
    .md-li[data-md-depth="${d}"][data-md-ordered="true"] {
      counter-increment: ${own};
      ${below === "" ? "" : `counter-reset: ${below};`}
    }
    .md-li[data-md-depth="${d}"][data-md-ordered="true"]::marker { content: counter(${own}) ". "; }
    .md-li[data-md-depth="${d}"][data-md-ordered="false"] { counter-reset: ${own}${below === "" ? "" : ` ${below}`}; }
    `;
  }

  return css;
}

/**
 * The stylesheet for the rendered blocks. Colors and fonts come from the `--richtext-*`
 * variables the editor sets from its theme keys; the string itself never changes.
 */
export function markdownStyles(): string {
  return `
    p, .md-li, .md-quote { margin: 0.25em 0; }
    h1, h2, h3, h4, h5, h6 {
      font       : var(--richtext-heading-font);
      line-height: 1.25;
      margin     : 0.9em 0 0.35em;
    }
    h1 { font-size: 2em; }
    h2 { font-size: 1.6em; }
    h3 { font-size: 1.3em; }
    h4 { font-size: 1.15em; }
    h5 { font-size: 1em; }
    h6 { font-size: 0.9em; color: var(--richtext-quote-text-color); }

    .md-li {
      display            : list-item;
      list-style-position: outside;
      margin-left        : calc(1.6em + var(--md-depth, 0) * 1.6em);
    }
    .md-li::marker { color: var(--richtext-marker-color); }
    .md-li[data-md-ordered="false"] { list-style-type: disc; }
    .md-li[data-md-ordered="false"][data-md-depth="1"] { list-style-type: circle; }
    .md-li[data-md-ordered="false"][data-md-depth="2"] { list-style-type: square; }
    .md-li[data-md-task][data-md-ordered][data-md-depth]::marker { content: none; }
    .md-task {
      margin        : 0 0.5em 0 -1.4em;
      vertical-align: middle;
      accent-color  : var(--richtext-link-color);
    }
    ${counterRules()}

    .md-quote {
      border-left : 3px solid var(--richtext-quote-border-color);
      color       : var(--richtext-quote-text-color);
      padding-left: 0.75em;
      margin-left : calc(var(--md-depth, 0) * 1.1em);
    }

    pre.md-code, code {
      font         : var(--richtext-code-font);
      background   : var(--richtext-code-background);
      border-radius: var(--richtext-code-border-radius);
    }
    pre.md-code {
      margin     : 0.5em 0;
      padding    : 0.6em 0.8em;
      white-space: pre-wrap;
      tab-size   : 4;
    }
    code { padding: 0 0.3em; }
    pre.md-code code { padding: 0; background: none; }

    a[data-link-kind] {
      color          : var(--richtext-link-color);
      text-decoration: var(--richtext-link-underline);
      cursor         : pointer;
    }

    .md-inline-widget { display: inline-block; vertical-align: middle; max-width: 100%; }
    .md-image { display: inline-block; vertical-align: middle; }
    .md-image img { max-width: 100%; vertical-align: middle; }
    [readonly] .md-image { cursor: default; }

    .md-opaque {
      background   : var(--richtext-opaque-background);
      border-radius: var(--richtext-code-border-radius);
      margin       : 0.5em 0;
      user-select  : none;
    }
    .md-hr { background: none; padding: 0.4em 0; }
    .md-hr hr {
      border    : 0;
      border-top: 1px solid var(--richtext-hr-color);
      margin    : 0;
    }
    .md-table { overflow-x: auto; padding: 0.25em; }
    .md-table table { border-collapse: collapse; }
    .md-table th, .md-table td {
      border : 1px solid var(--richtext-hr-color);
      padding: 0.25em 0.6em;
    }
    .md-table th { background: var(--richtext-code-background); }
    .table-editor input {
      color: inherit;
      background: transparent;
      border: 0;
      font: inherit;
      min-width: 6em;
      width: 100%;
      box-sizing: border-box;
    }
    .table-editor [data-selected] { outline: 1px solid var(--richtext-link-color); outline-offset: -1px; }
    .table-editor [role="toolbar"] { display: flex; flex-wrap: wrap; gap: 0.25em; margin: 0.4em 0; }
    .table-editor [role="status"] { display: block; font-size: 0.85em; white-space: normal; }
    .md-raw, .md-frontmatter {
      font   : var(--richtext-code-font);
      color  : var(--richtext-quote-text-color);
      padding: 0.4em 0.8em;
    }
    .md-raw::before {
      content       : "HTML";
      font-size     : 0.75em;
      letter-spacing: 0.08em;
      margin-right  : 0.8em;
      opacity       : 0.7;
    }
    .md-raw code { background: none; padding: 0; }
    .md-frontmatter pre { margin: 0; font: inherit; white-space: pre-wrap; }
    .md-frontmatter::before {
      content       : "FRONT MATTER";
      display       : block;
      font-size     : 0.75em;
      letter-spacing: 0.08em;
      margin-bottom : 0.3em;
      opacity       : 0.7;
    }
  `;
}
