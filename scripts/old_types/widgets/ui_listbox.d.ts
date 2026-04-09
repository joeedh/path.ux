import {Context} from "../core/context";
import {Container, RowFrame} from "../core/ui";

export class ListItem<CTX extends Context = Context> extends RowFrame<CTX> {
}

export class ListBox<CTX extends Context = Context> extends Container<CTX> {
  addItem(name: string, id: any): ListItem<CTX>;

  removeItem(item: ListItem<CTX>);

  setActive(item: number | string | ListItem);

  items: ListItem<CTX>[]
}
