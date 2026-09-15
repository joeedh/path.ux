import { UIBase } from "../../../core/ui_base";
import type { UIBaseDefinition } from "../../../core/ui_base";
import { t } from "../../../core/theme_schema";
import { ToolOp, UndoFlags } from "../../../path-controller/toolsys/toolop";
import type { ContextLike } from "../../../path-controller/controller/controller_abstract";
import { fromDocPos } from "../positions";
import type { BlockId, DocPos, EditOp, ProviderContext } from "../provider";
import { safeUrl } from "./markdown_html";
import type { MdImage } from "./markdown_model";

// The image atom's widget and the two gestures on it: a corner handle that resizes, and a drag
// on the body that moves the atom to the position under the pointer. Both are modal ops on the
// session's toolstack that preview on the DOM and commit one custom op on release.

const MIN_WIDTH = 16;
const CLICK_SLOP_PX = 3;

/** The `moveAtom` custom op from `from` to `to`; `order` is the document's block order. */
export function moveAtomOp(order: readonly BlockId[], from: DocPos, to: DocPos): EditOp {
  const a = order.indexOf(from.block);
  const b = order.indexOf(to.block);
  const blocks = order.slice(Math.min(a, b), Math.max(a, b) + 1);
  const shifts =
    from.block === to.block
      ? []
      : [
          { block: from.block, at: from.offset, delta: -1 },
          { block: to.block, at: to.offset, delta: 1 },
        ];

  return {
    type: "custom",
    name: "moveAtom",
    blocks,
    data: { from: { ...from }, to: { ...to } },
    shifts,
  };
}

/** The block ids in the order the root shows them. */
function blockOrder(root: HTMLElement): BlockId[] {
  const ids: BlockId[] = [];
  for (const child of root.children) {
    const id = child.getAttribute("data-doc-block");
    if (id !== null) {
      ids.push(id);
    }
  }
  return ids;
}

/** Whether the atom may land in the block `el` renders: not a fence, not an opaque block. */
function acceptsAtom(el: HTMLElement): boolean {
  return el.getAttribute("contenteditable") !== "false" && el.tagName !== "PRE";
}

/** Where a caret at `pos` would draw, in viewport coordinates. */
function caretRect(root: HTMLElement, pos: DocPos): DOMRect | undefined {
  const dom = fromDocPos(root, pos);
  if (dom === undefined) {
    return undefined;
  }

  const range = document.createRange();
  range.setStart(dom.node, dom.offset);
  range.collapse(true);
  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  if (rect.height > 0) {
    return rect;
  }

  // an empty block has no glyph to measure; its own box stands in
  const el = dom.node instanceof Element ? dom.node : dom.node.parentElement;
  return el?.getBoundingClientRect();
}

/**
 * Wraps the `<img>` of an image atom. Hovering shows an outline and a corner handle; the handle
 * resizes and the body moves. Both read `ctx.editor.readOnly` at the gesture, and the widget
 * mirrors it onto a `readonly` attribute so the handle hides without a re-render.
 */
export class MdImageWidget extends UIBase<ProviderContext, unknown, "MdImageWidget"> {
  readonly img: HTMLImageElement;
  private readonly handle: HTMLDivElement;
  private readonly styletag: HTMLStyleElement;
  block: BlockId = "";
  offset = 0;

  constructor() {
    super();

    this.styletag = document.createElement("style");
    this.styletag.textContent = `
      :host {
        position       : relative;
        display        : inline-block;
        vertical-align : middle;
        line-height    : 0;
      }
      img {
        max-width : 100%;
        display   : block;
      }
      :host(:hover:not([readonly])) img {
        outline : 2px solid var(--md-image-outline-color);
      }
      .handle {
        display    : none;
        position   : absolute;
        right      : -2px;
        bottom     : -2px;
        width      : var(--md-image-handle-size);
        height     : var(--md-image-handle-size);
        background : var(--md-image-handle-color);
        cursor     : nwse-resize;
      }
      :host(:hover:not([readonly])) .handle,
      :host([resizing]) .handle {
        display : block;
      }
      :host([resizing]) img {
        outline : 2px solid var(--md-image-outline-color);
      }
    `;
    this.shadow.appendChild(this.styletag);

    this.img = document.createElement("img");
    this.img.draggable = false;
    this.img.addEventListener("dragstart", (e) => e.preventDefault());
    this.shadow.appendChild(this.img);

    this.handle = document.createElement("div");
    this.handle.className = "handle";
    this.handle.setAttribute("data-testid", "md-image-handle");
    this.shadow.appendChild(this.handle);
  }

  /** Points the widget at the atom it renders and shows its image. */
  setAtom(block: BlockId, offset: number, image: MdImage): void {
    this.block = block;
    this.offset = offset;

    const src = safeUrl(image.src, true);
    if (src !== undefined) {
      this.img.setAttribute("src", src);
    } else {
      this.img.removeAttribute("src");
    }
    this.img.setAttribute("alt", image.alt);
    if (image.title !== undefined) {
      this.img.setAttribute("title", image.title);
    } else {
      this.img.removeAttribute("title");
    }
    if (image.width !== undefined) {
      this.img.setAttribute("width", String(image.width));
    } else {
      this.img.removeAttribute("width");
    }
  }

  /** The position of the atom's own character. */
  get atomPos(): DocPos {
    return { block: this.block, offset: this.offset };
  }

  override init() {
    super.init();
    // not in the constructor, where a custom element may not add attributes
    this.setAttribute("data-testid", "md-image");
    this.setCSS();

    this.addEventListener("pointerenter", () => this.mirrorReadOnly());
    this.handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 0 && this.canEdit()) {
        this.spawn(new ImageResizeOp(this, e), e);
      }
    });
    this.img.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 0 && this.canEdit()) {
        this.spawn(new ImageMoveOp(this, e), e);
      }
    });
  }

  private canEdit(): boolean {
    return this.ctx !== undefined && !this.ctx.editor.readOnly;
  }

  private spawn(op: ToolOp<{}, {}, ContextLike>, e: PointerEvent): void {
    const ctx = this.ctx as unknown as ContextLike;
    void ctx.toolstack.execTool(ctx, op, e);
  }

  private mirrorReadOnly(): void {
    this.toggleAttribute("readonly", this.ctx?.editor.readOnly ?? false);
  }

  override update() {
    super.update();
    this.mirrorReadOnly();
  }

  override setCSS() {
    super.setCSS();
    this.style.setProperty("--md-image-handle-color", this.getDefault("handle-color") as string);
    this.style.setProperty(
      "--md-image-handle-size",
      `${this.getDefault("handle-size") as number}px`
    );
    this.style.setProperty("--md-image-outline-color", this.getDefault("outline-color") as string);
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "md-image-x",
      style  : "mdimage",
      theme: {
        "handle-color"    : t.color,
        "handle-size"     : t.number,
        "outline-color"   : t.color,
        "drop-caret-color": t.color,
      },
    };
  }
}

UIBase.internalRegister(MdImageWidget);

/**
 * Drags the corner handle to a new width, previewed on the `<img>` and committed as one
 * `setImage` on release. Escape puts the old width back. Navigation of the pointer only, so
 * the op itself leaves no undo entry; the committed op is the one.
 */
export class ImageResizeOp extends ToolOp<{}, {}, ContextLike> {
  private widget: MdImageWidget | undefined;
  private startX = 0;
  private startWidth = 0;
  private width = 0;
  private hadWidth = false;

  constructor(widget?: MdImageWidget, e?: PointerEvent) {
    super();
    this.widget = widget;
    if (widget !== undefined && e !== undefined) {
      this.startX = e.clientX;
      this.startWidth = widget.img.getBoundingClientRect().width;
      this.width = this.startWidth;
      this.hadWidth = widget.img.hasAttribute("width");
      widget.setAttribute("resizing", "");
    }
  }

  static tooldef() {
    return {
      uiname     : "Resize Image",
      description: "Drag the corner handle to resize the image",
      toolpath   : "richtext.markdown.resize_image",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      inputs     : {},
      outputs    : {},
    };
  }

  on_pointermove(e: PointerEvent) {
    const widget = this.widget;
    if (widget === undefined) {
      return;
    }

    this.width = Math.max(MIN_WIDTH, Math.round(this.startWidth + e.clientX - this.startX));
    widget.img.setAttribute("width", String(this.width));
  }

  on_pointerup(_e: PointerEvent) {
    const widget = this.widget;
    if (widget !== undefined && this.width !== Math.round(this.startWidth)) {
      // queued before modalEnd, which is what frees the toolstack for it
      void widget.ctx.editor.dispatch({
        type  : "custom",
        name  : "setImage",
        blocks: [widget.block],
        data  : { offset: widget.offset, width: this.width },
      });
    }
    this.modalEnd(false);
  }

  on_pointercancel(_e: PointerEvent) {
    this.modalEnd(true);
  }

  override on_keydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.modalEnd(true);
    }
  }

  override modalEnd(was_cancelled?: boolean) {
    const widget = this.widget;
    this.widget = undefined;
    if (widget !== undefined) {
      widget.removeAttribute("resizing");
      if (was_cancelled) {
        if (this.hadWidth) {
          widget.img.setAttribute("width", String(Math.round(this.startWidth)));
        } else {
          widget.img.removeAttribute("width");
        }
      }
    }
    super.modalEnd(was_cancelled);
  }
}
ToolOp.register(ImageResizeOp as unknown as Parameters<typeof ToolOp.register>[0]);

/**
 * Drags the image to another position: a translucent copy follows the pointer and a drop caret
 * marks where `posFromPoint` says it would land, muted where the block refuses it. Release
 * commits one `moveAtom`; a release that never moved selects the atom instead; Escape cancels.
 */
export class ImageMoveOp extends ToolOp<{}, {}, ContextLike> {
  private widget: MdImageWidget | undefined;
  private ghost: HTMLImageElement | undefined;
  private caret: HTMLDivElement | undefined;
  private startX = 0;
  private startY = 0;
  private grabX = 0;
  private grabY = 0;
  private moved = false;
  private target: DocPos | undefined;

  constructor(widget?: MdImageWidget, e?: PointerEvent) {
    super();
    this.widget = widget;
    if (widget !== undefined && e !== undefined) {
      const rect = widget.img.getBoundingClientRect();
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.grabX = e.clientX - rect.left;
      this.grabY = e.clientY - rect.top;
    }
  }

  static tooldef() {
    return {
      uiname     : "Move Image",
      description: "Drag the image to another place in the text",
      toolpath   : "richtext.markdown.move_image",
      is_modal   : true,
      undoflag   : UndoFlags.NO_UNDO,
      inputs     : {},
      outputs    : {},
    };
  }

  on_pointermove(e: PointerEvent) {
    const widget = this.widget;
    if (widget === undefined) {
      return;
    }

    if (
      !this.moved &&
      Math.abs(e.clientX - this.startX) < CLICK_SLOP_PX &&
      Math.abs(e.clientY - this.startY) < CLICK_SLOP_PX
    ) {
      return;
    }
    this.moved = true;

    const bridge = widget.ctx.editor;
    const shadow = bridge.root.parentNode;
    if (!(shadow instanceof ShadowRoot)) {
      return;
    }
    // placed against the editor's host, since a fixed position would answer to any transformed
    // ancestor such as a zoomed screen area
    const origin = shadow.host.getBoundingClientRect();

    if (this.ghost === undefined) {
      const rect = widget.img.getBoundingClientRect();
      const ghost = (this.ghost = document.createElement("img"));
      ghost.className = "md-image-ghost";
      ghost.src = widget.img.src;
      ghost.style.position = "absolute";
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.opacity = "0.5";
      ghost.style.pointerEvents = "none";
      ghost.style.zIndex = "10";
      shadow.appendChild(ghost);

      const caret = (this.caret = document.createElement("div"));
      caret.className = "md-image-drop-caret";
      caret.style.position = "absolute";
      caret.style.width = "2px";
      caret.style.pointerEvents = "none";
      caret.style.zIndex = "10";
      caret.style.display = "none";
      shadow.appendChild(caret);
    }

    this.ghost.style.left = `${e.clientX - this.grabX - origin.left}px`;
    this.ghost.style.top = `${e.clientY - this.grabY - origin.top}px`;

    const pos = bridge.posFromPoint(e.clientX, e.clientY);
    const own = widget.atomPos;
    const unchanged =
      pos?.block === own.block && (pos.offset === own.offset || pos.offset === own.offset + 1);
    const el = pos === undefined ? undefined : bridge.blockElement(pos.block);
    const rect = pos === undefined ? undefined : caretRect(bridge.root, pos);
    const caret = this.caret;
    if (caret === undefined) {
      return;
    }

    if (pos === undefined || el === undefined || rect === undefined || unchanged) {
      this.target = undefined;
      caret.style.display = "none";
      return;
    }

    const allowed = acceptsAtom(el);
    this.target = allowed ? pos : undefined;
    caret.style.display = "block";
    caret.style.left = `${rect.left - 1 - origin.left}px`;
    caret.style.top = `${rect.top - origin.top}px`;
    caret.style.height = `${rect.height}px`;
    caret.style.background = allowed
      ? (widget.getDefault("drop-caret-color") as string)
      : "rgba(128, 128, 128, 0.5)";
    caret.toggleAttribute("data-refused", !allowed);
  }

  on_pointerup(_e: PointerEvent) {
    const widget = this.widget;
    const target = this.target;
    if (widget !== undefined) {
      const bridge = widget.ctx.editor;
      if (!this.moved) {
        const own = widget.atomPos;
        bridge.select({ anchor: own, head: { block: own.block, offset: own.offset + 1 } });
      } else if (target !== undefined) {
        // queued before modalEnd, which is what frees the toolstack for it
        void bridge.dispatch(moveAtomOp(blockOrder(bridge.root), widget.atomPos, target));
      }
    }
    this.modalEnd(false);
  }

  on_pointercancel(_e: PointerEvent) {
    this.modalEnd(true);
  }

  override on_keydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.modalEnd(true);
    }
  }

  override modalEnd(was_cancelled?: boolean) {
    this.widget = undefined;
    this.target = undefined;
    this.ghost?.remove();
    this.caret?.remove();
    this.ghost = undefined;
    this.caret = undefined;
    super.modalEnd(was_cancelled);
  }
}
ToolOp.register(ImageMoveOp as unknown as Parameters<typeof ToolOp.register>[0]);
