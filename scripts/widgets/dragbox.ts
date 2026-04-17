import { UIBase, Icons } from "../core/ui_base";
import { Container } from "../core/ui";
import { IContextBase } from "../core/context_base";
import {
  pushModalLight,
  popModalLight,
  keymap,
  ModalState,
} from "../path-controller/util/simple_events";
import { parsepx } from "../core/ui_theme";

interface DragHandlers {
  on_mousemove(e: MouseEvent): void;
  end(): void;
  on_mouseup(e: MouseEvent): void;
  on_keydown(e: KeyboardEvent): void;
}

function startDrag<CTX extends IContextBase>(box: DragBox<CTX>) {
  if (box._modal) {
    popModalLight(box._modal);
    box._modal = undefined;
    return;
  }

  let first = true;
  let lastx = 0;
  let lasty = 0;

  const handlers: DragHandlers = {
    on_mousemove(e: MouseEvent) {
      const x = e.x;
      const y = e.y;

      if (first) {
        lastx = x;
        lasty = y;
        first = false;

        return;
      }

      const dx = x - lastx;
      const dy = y - lasty;

      let hx = parsepx(box.style.left);
      let hy = parsepx(box.style.top);

      hx += dx;
      hy += dy;

      console.log(hx, hy);

      box.style.left = hx + "px";
      box.style.top = hy + "px";

      lastx = x;
      lasty = y;
    },

    end() {
      if (box._modal) {
        popModalLight(box._modal);
        box._modal = undefined;
      }
    },

    on_mouseup(e: MouseEvent) {
      this.end();
    },

    on_keydown(e: KeyboardEvent) {
      switch (e.keyCode) {
        case keymap["Escape"]:
        case keymap["Return"]:
          this.end();
          break;
      }
    },
  };

  box._modal = pushModalLight(handlers as unknown as Record<string, unknown>);
}

export class DragBox<CTX extends IContextBase = IContextBase> extends Container<CTX> {
  _done: boolean;
  header: Container<CTX>;
  contents: Container<CTX>;
  _modal: ModalState | undefined;
  _onend: (() => void) | undefined;
  onend: (() => void) | undefined;

  constructor() {
    super();

    this._done = false;
    this.header = UIBase.createElement("rowframe-x") as Container<CTX>;
    this.contents = UIBase.createElement("container-x") as Container<CTX>;

    this.header.style.borderRadius = "20px";

    this.header.parentWidget = this;
    this.contents.parentWidget = this;

    this.shadow.appendChild(this.header);
    this.shadow.appendChild(this.contents);
  }

  init() {
    super.init();

    const header = this.header;

    header.ctx = this.ctx;
    this.contents.ctx = this.ctx;
    header._init();
    this.contents._init();

    this.style.minWidth = "350px";
    header.style.height = "35px";

    const icon = header.iconbutton(Icons.DELETE, "Hide", () => {
      this.end();
    });
    (icon as any).iconsheet = 0; //use small icons

    this.addEventListener(
      "mousedown",
      (e) => {
        console.log("start drag");
        startDrag(this);

        /* ensure browser doesn't spawn its own (incompatible)
         touch->mouse emulation events}; */
        e.preventDefault();
      },
      { capture: false }
    );

    header.background = this.getDefault("background-color");

    this.setCSS();
  }

  override add(...args: any[]) {
    return (this.contents as any).add(...args);
  }

  prepend(...args: any[]) {
    return (this.contents as any).prepend(...args);
  }

  override appendChild<T extends Node>(n: T): T {
    return this.contents.appendChild(n);
  }

  override col(...args: any[]) {
    return (this.contents as any).col(...args);
  }

  override row(...args: any[]) {
    return (this.contents as any).row(...args);
  }

  override strip(...args: any[]) {
    return (this.contents as any).strip(...args);
  }

  override button(...args: any[]) {
    return (this.contents as any).button(...args);
  }

  override iconbutton(...args: any[]) {
    return (this.contents as any).iconbutton(...args);
  }

  override iconcheck(...args: any[]) {
    return (this.contents as any).iconcheck(...args);
  }

  override tool(...args: any[]) {
    return (this.contents as any).tool(...args);
  }

  override menu(...args: any[]) {
    return (this.contents as any).menu(...args);
  }

  override prop(...args: any[]) {
    return (this.contents as any).prop(...args);
  }

  override listenum(...args: any[]) {
    return (this.contents as any).listenum(...args);
  }

  override check(...args: any[]) {
    return (this.contents as any).check(...args);
  }

  iconenum(...args: any[]) {
    return (this.contents as any).iconenum(...args);
  }

  override slider(...args: any[]) {
    return (this.contents as any).slider(...args);
  }

  override simpleslider(...args: any[]) {
    return (this.contents as any).simpleslider(...args);
  }

  curve(...args: any[]) {
    return (this.contents as any).curve(...args);
  }

  override textbox(...args: any[]) {
    return (this.contents as any).textbox(...args);
  }

  override textarea(...args: any[]) {
    return (this.contents as any).textarea(...args);
  }

  override viewer(...args: any[]) {
    return (this.contents as any).viewer(...args);
  }

  override panel(...args: any[]) {
    return (this.contents as any).panel(...args);
  }

  override tabs(...args: any[]) {
    return (this.contents as any).tabs(...args);
  }

  override table(...args: any[]) {
    return (this.contents as any).table(...args);
  }

  end() {
    if (this._done) {
      return;
    }
    this.remove();

    if (this._onend) {
      this._onend();
    }

    if (this.onend) {
      this.onend();
    }
  }

  setCSS() {
    super.setCSS();

    this.background = this.getDefault("background-color");
  }

  static define() {
    return {
      tagname: "drag-box-x",
      style  : "panel",
    };
  }
}
UIBase.internalRegister(DragBox);
