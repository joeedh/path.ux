import { UIBase } from "../../../core/ui_base";
import type { UIBaseDefinition } from "../../../core/ui_base";
import type { RowFrame } from "../../../core/ui_containers";
import { Button } from "../../ui_button";
import type { IconCheck } from "../../ui_widgets";
import type {
  DocRange,
  DocumentProvider,
  MarkInfo,
  ProviderContext,
  ToolbarSync,
} from "../provider";

// The pieces a provider's buildToolbar assembles its row from. Imported by the providers and
// never re-exported from the barrel; a consumer's provider reaches it through the deep export
// or, for the button and the separator, through the markdown entry.

const isCollapsed = ({ anchor, head }: DocRange) =>
  anchor.block === head.block && anchor.offset === head.offset;

/**
 * A compact toolbar button drawing a glyph rather than a sprite, with an `active` state lit
 * from `--richtext-toolbar-active-background`. Pressing it never moves focus, so the editor's
 * selection is still there for the handler to read.
 */
export class ToolButton extends Button<ProviderContext, "Button"> {
  private _active = false;

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    if (value !== this._active) {
      this._active = value;
      this.setCSS();
    }
  }

  override init() {
    super.init();
    this.addEventListener("pointerdown", (e) => e.preventDefault());
  }

  override setCSS() {
    super.setCSS();

    const height = this.getDefault("height") as number;
    this.style.minWidth = `${height}px`;
    this.style.justifyContent = "center";
    this.style.padding = "0 4px";
    this.style.margin = "0";
    this.label.style.lineHeight = "1";
    if (this._active && !this.disabled) {
      this.style.backgroundColor = "var(--richtext-toolbar-active-background)";
    }
  }

  static define(): UIBaseDefinition {
    return {
      tagname: "richtext-toolbutton-x",
      style  : "button",
    };
  }
}

UIBase.internalRegister(ToolButton);

/** Adds a glyph button to the row; `label` is its tooltip and `onPress` runs on each press. */
export function addToolButton(
  row: RowFrame<ProviderContext>,
  glyph: string,
  label: string,
  onPress: () => void
): ToolButton {
  const btn = UIBase.createElement<ToolButton>("richtext-toolbutton-x");
  btn.setAttribute("name", glyph);
  btn.description = label;
  btn.onclick = onPress;
  row.add(btn);

  return btn;
}

/**
 * Adds one button per entry of `marks` that toggles the mark over the selection through
 * `ctx.editor.dispatch`, and returns the sync that lights the buttons from `activeMarks`. A
 * mark with a `glyph` gets a `ToolButton`; the others an `IconCheck` over the sprite sheet.
 */
export function addMarkButtons<Doc>(
  row: RowFrame<ProviderContext>,
  ctx: ProviderContext,
  provider: DocumentProvider<Doc>,
  marks: readonly MarkInfo[] = provider.marks()
): ToolbarSync<Doc> {
  const buttons = new Map<string, IconCheck<ProviderContext> | ToolButton>();
  // a checked write from the sync fires on_change like a click does; the flag tells them apart
  let syncing = false;

  const toggle = (mark: MarkInfo) => {
    const range = ctx.editor.selection();
    if (range !== undefined && !isCollapsed(range)) {
      void ctx.editor.dispatch({ type: "toggleMark", range, mark: mark.name });
    }
  };

  for (const mark of marks) {
    if (mark.glyph !== undefined) {
      const btn = addToolButton(row, mark.glyph, mark.label, () => toggle(mark));
      btn.setAttribute("data-testid", `richtext-mark-${mark.name}`);
      buttons.set(mark.name, btn);
      continue;
    }

    const btn = UIBase.createElement<IconCheck<ProviderContext>>("iconcheck-x");
    btn.icon = mark.icon;
    btn.description = mark.label;
    btn.iconsheet = 1;
    btn.drawCheck = false;
    btn.setAttribute("data-testid", `richtext-mark-${mark.name}`);
    // the editor sets the tint variable from its text color, so the white sprite reads in any theme
    btn.dom.style.filter = "var(--richtext-icon-tint, none)";
    btn.on_change = () => {
      if (!syncing) {
        toggle(mark);
      }
    };

    row.add(btn);
    buttons.set(mark.name, btn);
  }

  return (doc, selection) => {
    const active = new Set(
      selection !== undefined && provider.activeMarks !== undefined
        ? provider.activeMarks(doc, selection)
        : []
    );

    syncing = true;
    for (const [name, btn] of buttons) {
      if (btn instanceof ToolButton) {
        btn.active = active.has(name);
      } else {
        btn.checked = active.has(name);
      }
    }
    syncing = false;
  };
}

/** Adds a thin vertical rule between two groups of toolbar items. */
export function addSeparator(row: RowFrame<ProviderContext>): HTMLElement {
  const sep = document.createElement("div");
  sep.className = "richtext-toolbar-separator";
  sep.style.width = "1px";
  sep.style.alignSelf = "stretch";
  sep.style.margin = "2px 4px";
  sep.style.backgroundColor = "var(--richtext-toolbar-border, currentColor)";
  sep.style.opacity = "0.4";
  row.shadow.appendChild(sep);

  return sep;
}
