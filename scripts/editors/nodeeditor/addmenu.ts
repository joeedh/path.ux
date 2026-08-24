import type { IContextBase } from "../../core/context_base";
import { Menu, createMenu } from "../../widgets/ui_menu";
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
 * The node-type picker as a Menu: one row per item, labelled by uiName and
 * keyed by the type name, reporting a pick through onPick. The same menu
 * serves both adding a node and choosing a replacement type. Start it with
 * `startMenu(menu, x, y, true)` so it opens with the filter box.
 */
export function buildAddNodeMenu<CTX extends IContextBase>(
  ctx: CTX,
  onPick: (typeName: string) => void,
  items = addMenuItems()
): Menu<CTX> {
  return createMenu(
    ctx,
    "Add Node",
    items.map((item) => ({
      name    : item.uiName,
      id      : item.typeName,
      tooltip : item.description || `Add a ${item.uiName} node`,
      callback: () => onPick(item.typeName),
    }))
  );
}
