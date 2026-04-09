import {UIBase} from "../core/ui_base";
import {Context} from "../core/context";
import {Container} from "../core/ui";

export declare class TextBoxBase<CTX extends Context = Context> extends UIBase<CTX> {
  startSelected: boolean
  realtime: boolean
  isModal: boolean
  select(): void
}

export declare class TextBox<CTX extends Context = Context> extends TextBoxBase<CTX> {
}
