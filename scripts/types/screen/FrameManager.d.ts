import {UIBase} from "../core/ui_base";
import {Context} from "../core/context";

export class Screen<CTX = Context> extends UIBase<CTX> {
  listen(): void;

  unlisten(): void;

  add(child: UIBase<CTX>);
}
