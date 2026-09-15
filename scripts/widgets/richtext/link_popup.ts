import { UIBase } from "../../core/ui_base";
import type { UIBaseDefinition } from "../../core/ui_base";
import { Container } from "../../core/ui";
import type { IContextBase } from "../../core/context_base";
import { t } from "../../core/theme_schema";
import type { PopupContainer } from "../../screen/FrameManager_popup";
import type { DocRange, EditOp, EditorBridge, JsonValue } from "./provider";

// The editor's one link default: a small popup editing the target of the link under the click,
// or setting one over the selection from a toolbar. It dispatches the `setLink` custom op, which
// is the protocol's convention for a link, so it never imports a provider.

/** What the popup edits: the link's range within one block, its kind and target. */
export interface LinkEdit {
  range: DocRange;
  kind: string;
  target: string;
  title?: string;
}

/** The `setLink` custom op over `edit.range`; an empty target removes the link there. */
export function setLinkOp(edit: LinkEdit, target: string): EditOp {
  const { range } = edit;
  const from = Math.min(range.anchor.offset, range.head.offset);
  const to = Math.max(range.anchor.offset, range.head.offset);
  const data: Record<string, JsonValue> = {
    from,
    to,
    target,
    kind     : edit.kind,
    selection: { anchor: { ...range.anchor }, head: { ...range.head } },
  };
  if (edit.title !== undefined && target !== "") {
    data.title = edit.title;
  }

  return { type: "custom", name: "setLink", blocks: [range.anchor.block], data };
}

/** The popup's body: the kind as a label, the target in a textbox, Apply and Remove. */
export class LinkPopup<CTX extends IContextBase = IContextBase> extends Container<
  CTX,
  "LinkPopup"
> {
  override setCSS() {
    super.setCSS();
    this.setBoxCSS();
    this.background = this.getDefault("background-color") as string;
    this.style.padding = `${this.getDefault("padding") as number}px`;
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "link-popup-x",
      style  : "linkpopup",
      theme: {
        "background-color": t.color,
        border            : t.boxborder,
        padding           : t.number,
      },
    };
  }
}

UIBase.internalRegister(LinkPopup);

/**
 * Opens the link popup at `x, y` for `edit`, dispatching through `editor` when the user applies
 * or removes. The range is the one captured at open, since focusing the textbox takes the
 * editor's selection away; the popup closes on Escape and on a press outside it.
 */
export function openLinkPopup(
  owner: UIBase,
  editor: EditorBridge,
  edit: LinkEdit,
  x: number,
  y: number
): PopupContainer {
  const screen = owner.ctx.screen;
  const popup = screen.popup(owner, x, y, "click", undefined, window) as unknown as PopupContainer;
  popup.style.overflow = "hidden";
  popup.style.padding = "0";

  const body = UIBase.createElement<LinkPopup>("link-popup-x");
  body.setAttribute("data-testid", "richtext-link-popup");
  popup.add(body);

  const row = body.row();
  const kind = row.label(edit.kind);
  kind.style.opacity = "0.7";
  kind.style.marginRight = "6px";

  const box = row.textbox(undefined, edit.target);
  box.setAttribute("data-testid", "richtext-link-target");
  box.style.width = "18em";

  const finish = (target: string | undefined) => {
    if (target !== undefined && target !== edit.target) {
      void editor.dispatch(setLinkOp(edit, target));
    }
    popup.remove();
  };

  // The textbox blurs itself on Enter and Escape, and focus falls back to the editor's root,
  // so the key is cancelled here or its input would land in the document as well
  box.onend = () => {};
  box.dom.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(e.key === "Enter" ? box.text : undefined);
    }
  });

  const apply = row.button("Apply", () => finish(box.text));
  apply.setAttribute("data-testid", "richtext-link-apply");
  const remove = row.button("Remove", () => finish(""));
  remove.setAttribute("data-testid", "richtext-link-remove");

  box.focus();
  box.select();

  return popup;
}
