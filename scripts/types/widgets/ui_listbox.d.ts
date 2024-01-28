import {Context} from "../core/context";
import {Container, RowFrame} from "../core/ui";

export class ListItem<CTX = Context> extends RowFrame<CTX> {
}

export class ListBox<CTX = Context> extends Container<CTX> {
  addItem(name: string, id: any): ListItem<CTX>;

  removeItem(item: ListItem<CTX>);

  setActive(item: number | string | ListItem);

  items: ListItem<CTX>[]
}
