import { NodeClasses } from "../../graph/node";
import { GroupInputNode, GroupNode, GroupOutputNode } from "../../graph/group";

export interface AddMenuItem {
  typeName: string;
  uiName: string;
  description: string;
}

/**
 * The node types the add menu offers: every registered class except the group
 * machinery (instances come from a definition, proxies from declareInput /
 * declareOutput). Names come from a throwaway instance, which is inert until
 * a graph adds it.
 */
export function addMenuItems(): AddMenuItem[] {
  const items: AddMenuItem[] = [];

  for (const [typeName, cls] of NodeClasses) {
    if (cls === GroupNode || cls === GroupInputNode || cls === GroupOutputNode) {
      continue;
    }
    const probe = new cls();
    items.push({
      typeName,
      uiName     : probe.getUIName(),
      description: probe.getDescription(),
    });
  }

  return items;
}

/**
 * A filterable list of node types, built as a raw-DOM popup the caller
 * positions and appends. Enter picks the first visible item, Escape closes,
 * and a pick reports the type name through onPick and closes. The same menu
 * serves both adding a node and choosing a replacement type.
 */
export class AddNodeMenu {
  root: HTMLDivElement;
  items: AddMenuItem[];

  private onPick: (typeName: string) => void;
  private onClose: (() => void) | undefined;
  private _buttons: HTMLButtonElement[] = [];

  constructor(opts: {
    items?: AddMenuItem[];
    onPick: (typeName: string) => void;
    onClose?: () => void;
  }) {
    this.items = opts.items ?? addMenuItems();
    this.onPick = opts.onPick;
    this.onClose = opts.onClose;

    this.root = document.createElement("div");
    this.root.className = "nodeeditor-addmenu";
    this.root.style.cssText =
      "position: absolute; z-index: 10; min-width: 160px; padding: 4px; " +
      "background: rgba(48, 48, 48, 0.97); border: 1px solid #888; border-radius: 4px; " +
      "display: flex; flex-direction: column; gap: 2px; font-size: 12px;";

    const input = document.createElement("input");
    input.type = "text";
    input.title = "Filter node types";
    input.placeholder = "Search…";
    input.addEventListener("input", () => this.filter(input.value));
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const first = this._buttons.find((b) => b.style.display !== "none");
        if (first !== undefined) {
          this.pick(first.dataset.typeName!);
        }
      } else if (e.key === "Escape") {
        this.close();
      }
      e.stopPropagation();
    });
    this.root.appendChild(input);

    for (const item of this.items) {
      const btn = document.createElement("button");
      btn.textContent = item.uiName;
      btn.title = item.description || `Add a ${item.uiName} node`;
      btn.dataset.typeName = item.typeName;
      btn.style.cssText = "display: block; width: 100%; text-align: left;";
      btn.addEventListener("click", () => this.pick(item.typeName));
      this.root.appendChild(btn);
      this._buttons.push(btn);
    }
  }

  /** Hides items whose names do not contain text (case-insensitive). */
  filter(text: string): void {
    const needle = text.trim().toLowerCase();
    for (const btn of this._buttons) {
      const item = this.items.find((i) => i.typeName === btn.dataset.typeName)!;
      const hit =
        needle === "" ||
        item.uiName.toLowerCase().includes(needle) ||
        item.typeName.toLowerCase().includes(needle);
      btn.style.display = hit ? "" : "none";
    }
  }

  pick(typeName: string): void {
    const onPick = this.onPick;
    this.close();
    onPick(typeName);
  }

  close(): void {
    this.root.remove();
    this.onClose?.();
    this.onClose = undefined;
  }
}
