import { UIBase } from "../../../core/ui_base";
import type { RowFrame } from "../../../core/ui_containers";
import type { IconCheck } from "../../ui_widgets";
import type {
  DocRange,
  DocumentProvider,
  MarkInfo,
  ProviderContext,
  ToolbarSync,
} from "../provider";

// The pieces a provider's buildToolbar assembles its row from. Imported by the providers and
// never re-exported from the barrel; a consumer's provider reaches it through the deep export.

const isCollapsed = ({ anchor, head }: DocRange) =>
  anchor.block === head.block && anchor.offset === head.offset;

/**
 * Adds one `IconCheck` per entry of `marks` that toggles the mark over the selection through
 * `ctx.editor.dispatch`, and returns the sync that lights the buttons from `activeMarks`.
 */
export function addMarkButtons<Doc>(
  row: RowFrame<ProviderContext>,
  ctx: ProviderContext,
  provider: DocumentProvider<Doc>,
  marks: readonly MarkInfo[] = provider.marks()
): ToolbarSync<Doc> {
  const buttons = new Map<string, IconCheck<ProviderContext>>();
  // a checked write from the sync fires on_change like a click does; the flag tells them apart
  let syncing = false;

  for (const mark of marks) {
    const btn = UIBase.createElement<IconCheck<ProviderContext>>("iconcheck-x");
    btn.icon = mark.icon;
    btn.description = mark.label;
    btn.iconsheet = 1;
    btn.drawCheck = false;
    btn.setAttribute("data-testid", `richtext-mark-${mark.name}`);
    // the editor sets the tint variable from its text color, so the white sprite reads in any theme
    btn.dom.style.filter = "var(--richtext-icon-tint, none)";
    btn.on_change = () => {
      if (syncing) {
        return;
      }

      const range = ctx.editor.selection();
      if (range !== undefined && !isCollapsed(range)) {
        void ctx.editor.dispatch({ type: "toggleMark", range, mark: mark.name });
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
      btn.checked = active.has(name);
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
