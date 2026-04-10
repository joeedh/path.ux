import type { IContextBase } from "../../core/context_base";
import { Container, RowFrame } from "../core/ui";

export class ListItem<CTX extends IContextBase = IContextBase> extends RowFrame<CTX> {}

export class ListBox<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  addItem(name: string, id: any): ListItem<CTX>;

  removeItem(item: ListItem<CTX>);

  setActive(item: number | string | ListItem);

  items: ListItem<CTX>[];
}
