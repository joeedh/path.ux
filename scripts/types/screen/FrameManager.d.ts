import { UIBase } from "../core/ui_base";
import { Context } from "../core/context";
import { Vector2 } from "../../path-controller/types/util/vectormath";
import { ScreenArea } from "./ScreenArea";

export class Screen<CTX = Context> extends UIBase<CTX> {
  listen(): void;

  unlisten(): void;

  add(child: UIBase<CTX>);

  mpos: Vector2;

  pickElement(
    x: number,
    y: number,
    args?: {
      nodeclass?: new () => HTMLElement;
      excluded_classes?: Array<new () => HTMLElement>;
      clip?: { pos: Vector2 | [number, number]; size: Vector2 | number; number };
    }
  ): HTMLElement | undefined;

  sareas: ScreenArea[]
}
