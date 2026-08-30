import { UIBase } from "../ui_base";
import type { IContextBase } from "../context_base";
import type { PanelFrame } from "../../widgets/ui_panel";
import type { TabContainer } from "../../widgets/ui_tabs";
import type { TreeView } from "../../widgets/ui_treeview";
import type { ListBox } from "../../widgets/ui_listbox";
// Type-only, mirroring the constraint documented in ui.ts: ui_containers imports
// Container from ./ui at runtime, so this module must never import it at runtime.
import type { RowFrame, ColumnFrame, TwoColumnFrame } from "../ui_containers";
import type { TableFrame } from "../../widgets/ui_table";
import type { Container } from "../ui";

export function treeviewImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>
): TreeView<CTX> {
  const ret = UIBase.createElement("tree-view-x") as TreeView<CTX>;
  ret.ctx = self.ctx;
  self.add(ret);

  self._container_inherit(ret);

  return ret;
}

export function panelImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  name: string,
  id?: string,
  packflag = 0,
  tooltip?: string
) {
  id = id === undefined ? name : id;

  // XXX todo: add <CTX> after panelFrame is moved to TS
  const ret = UIBase.createElement("panelframe-x") as PanelFrame<CTX>;

  if (tooltip) {
    ret.setHeaderToolTip(tooltip);
  }

  ret.setAttribute("label", name);
  ret.setAttribute("id", id);

  self._add(ret);

  if (self.ctx) {
    //check init was called
    ret.ctx = self.ctx;
    ret.contents.ctx = self.ctx;
    ret._init();
    //ret.headerLabel = name;
  }

  self._container_inherit(ret, packflag);
  self._container_inherit(ret.contents, packflag);
  return ret.contents;
}

export function rowImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  packflag = 0
): RowFrame<CTX> {
  const ret = UIBase.createElement("rowframe-x") as RowFrame<CTX>;

  self._container_inherit(ret, packflag);
  self._add(ret);

  ret.ctx = self.ctx;

  return ret;
}

export function listboxImpl<
  CTX extends IContextBase,
  SELF extends string,
  IDType extends string | number = string | number,
>(self: Container<CTX, SELF>, path?: string, packflag = 0) {
  const ret = UIBase.createElement("listbox-x") as ListBox<CTX, IDType>;

  self._container_inherit(ret, packflag);

  self._add(ret);

  if (path !== undefined) {
    ret.setAttribute("datapath", self._joinPrefix(path)!);
  }

  return ret;
}

export function tableImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  packflag = 0
): TableFrame<CTX> {
  const ret = UIBase.createElement("tableframe-x") as TableFrame<CTX>;

  self._container_inherit(ret, packflag);

  self._add(ret);
  return ret;
}

export function twocolImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  parentDepth = 1,
  packflag = 0
) {
  const ret = UIBase.createElement("two-column-x") as TwoColumnFrame<CTX>;

  ret.parentDepth = parentDepth;

  self._container_inherit(ret, packflag);

  self._add(ret);
  return ret;
}

export function colImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  packflag = 0
): ColumnFrame<CTX> {
  const ret = UIBase.createElement("colframe-x") as ColumnFrame<CTX>;

  self._container_inherit(ret, packflag);

  self._add(ret);
  return ret;
}

export function tabsImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  position: "top" | "bottom" | "left" | "right" = "top",
  packflag = 0
) {
  const ret = UIBase.createElement("tabcontainer-x") as TabContainer<CTX>;

  ret.constructor.setDefault(ret);
  ret.setAttribute("bar_pos", position);

  // XXX nee to fix tabcontainer's base class type conflict
  // with it's on_change method
  self._container_inherit(ret, packflag);
  self._add(ret as unknown as UIBase<CTX>);

  return ret;
}
