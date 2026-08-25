/**
 * Floating popup screen areas.
 *
 * A popup is an ordinary {@link ScreenArea} that is floating and independent of the screen mesh,
 * so the editor inside it is a real editor — same class, same context, same keymaps — rather than
 * a dialog wearing one's clothes. What the mesh gives it for free is resizing: a floating area's
 * four borders are all movable, so the existing border-drag tool sizes a popup with no help from
 * here.
 *
 * What this module adds on top is the rest of what a window needs and an area does not have: a
 * titlebar to move it by, a close button, and a way to interrupt closing, which is
 * {@link ScreenArea.close}'s cancelable `areaclose` event.
 */
import { UIBase, Icons } from "../core/ui_base";
import type { Container } from "../core/ui";
import type { RowFrame } from "../core/ui_containers";
import type { Area, ScreenArea } from "../screen/ScreenArea";
import { AreaFlags } from "../screen/ScreenArea";
import type { Screen } from "../screen/FrameManager";
import { ZIndexes } from "../screen/constants";
import type { IContextBase } from "../core/context_base";
import {
  keymap,
  pushModalLight,
  popModalLight,
  ModalState,
} from "../path-controller/util/simple_events";

/**
 * Height of a popup's titlebar, in pixels.
 *
 * Fixed rather than measured because {@link ScreenArea.chromeHeight} has to be known before the
 * editor under it is laid out, and a number that arrives one frame late is a popup that jumps.
 */
export const POPUP_TITLEBAR_HEIGHT = 24;

export interface PopupAreaArgs {
  width?: number;
  height?: number;
  /** Top-left corner in screen space. Defaults to a fixed inset from the top-left. */
  pos?: [number, number];
  /** What the titlebar says. An empty string leaves the popup untitled but still draggable. */
  title?: string;
  /** Whether the titlebar is drawn at all. Without it a popup can be resized but not moved. */
  titlebar?: boolean;
  addEscapeKeyHandler?: boolean;
}

/** The `detail` of the cancelable `areaclose` event {@link ScreenArea.close} dispatches. */
export interface AreaCloseDetail<CTX extends IContextBase = IContextBase> {
  sarea: ScreenArea<CTX>;
}

/**
 * Move `sarea` with the pointer until it is let go, keeping it inside the screen.
 *
 * The drag is a light modal rather than a pointer capture because a popup's titlebar sits inside
 * a shadow root, and the pointer leaves it the moment the popup falls behind the cursor.
 */
function startTitleDrag<CTX extends IContextBase>(sarea: ScreenArea<CTX>, e: PointerEvent): void {
  const screen = sarea.getScreen();

  if (!screen) {
    return;
  }

  const startPos: [number, number] = [sarea.pos[0], sarea.pos[1]];
  const startMouse: [number, number] = [e.x, e.y];
  let modal: ModalState | undefined;

  const move = (x: number, y: number) => {
    const maxx = Math.max(screen.size[0] - sarea.size[0], 0);
    const maxy = Math.max(screen.size[1] - sarea.size[1], 0);

    sarea.pos[0] = Math.min(Math.max(startPos[0] + x - startMouse[0], 0), maxx);
    sarea.pos[1] = Math.min(Math.max(startPos[1] + y - startMouse[1], 0), maxy);

    sarea.loadFromPosSize();
  };

  const finish = (commit: boolean) => {
    if (modal) {
      popModalLight(modal);
      modal = undefined;
    }

    if (!commit) {
      move(startMouse[0], startMouse[1]);
    }
  };

  modal = pushModalLight({
    on_pointermove: (e2: PointerEvent) => {
      move(e2.x, e2.y);
    },
    on_pointerup: () => {
      finish(true);
    },
    on_keydown: (e2: KeyboardEvent) => {
      if (e2.keyCode === keymap["Escape"]) {
        finish(false);
      }
    },
  } as unknown as Record<string, unknown>);
}

/**
 * Build the titlebar and put it in the area's shadow, above the editor.
 *
 * It goes in the area rather than beside it so that it moves, stacks, clips and dies with the
 * popup without anything having to keep the two in step; {@link ScreenArea.chromeHeight} is what
 * keeps the editor from being drawn underneath it.
 */
function makeTitleBar<CTX extends IContextBase>(
  sarea: ScreenArea<CTX>,
  title: string
): RowFrame<CTX> {
  const bar = UIBase.createElement("rowframe-x") as unknown as RowFrame<CTX>;

  bar.ctx = sarea.ctx;
  bar.parentWidget = sarea as unknown as Container<CTX>;

  sarea.shadow.appendChild(bar as unknown as HTMLElement);
  bar._init();

  bar.noMarginsOrPadding();

  bar.style.position = UIBase.PositionKey;
  bar.style.left = "0px";
  bar.style.top = "0px";
  bar.style.width = "100%";
  bar.style.height = POPUP_TITLEBAR_HEIGHT + "px";
  bar.style.alignItems = "center";
  //title at one end, close button at the other, with the whole strip between them still
  //somewhere to grab. A spacer child would be the other way to do it, but a Container's
  //flex-grow comes from the theme via `saneStyle`, which lands after anything set here.
  bar.style.justifyContent = "space-between";
  bar.style.backgroundColor = bar.getDefault("background-color") as string;
  //the editor below is the same colour, so without a line the titlebar reads as part of it
  bar.style.borderBottom =
    "1px solid " + ((bar.getDefault("border-color") as string) || "rgba(0,0,0,0.5)");
  bar.style.cursor = "move";
  //the editor below has its own stacking context; without this the titlebar loses to it
  bar.style.zIndex = `${ZIndexes.popupTitlebar}`;

  //always, even untitled: `space-between` needs something at the near end or the button slides
  //back to it
  const label = bar.label(title);
  label.style.marginLeft = "6px";
  label.style.pointerEvents = "none";

  const close = bar.iconbutton(Icons.TINY_X, "Close this window", () => {
    sarea.close();
  });

  bar.addEventListener("pointerdown", (e: Event) => {
    const pe = e as PointerEvent;

    //the close button is inside the bar; dragging is for everywhere else
    if (pe.composedPath().includes(close as unknown as EventTarget)) {
      return;
    }

    startTitleDrag(sarea, pe);
    pe.preventDefault();
  });

  return bar;
}

/**
 * Open `area_class` in a floating popup area on `screen`.
 *
 * The popup is movable by its titlebar, resizable by its borders, and closed either by the
 * titlebar's button or by Escape. Closing goes through {@link ScreenArea.close}, so a caller that
 * needs to interrupt it listens for `areaclose` on the returned area.
 */
export function makePopupArea<CTX extends IContextBase = IContextBase>(
  area_class: typeof Area,
  screen: Screen<CTX>,
  args: PopupAreaArgs = {}
): ScreenArea<CTX> {
  const sarea = UIBase.createElement("screenarea-x") as unknown as ScreenArea<CTX>;

  const width = args.width || screen.size[0] * 0.7;
  const height = args.height || screen.size[1] * 0.7;
  const addEscapeKeyHandler = args.addEscapeKeyHandler !== false;
  const titlebar = args.titlebar !== false;

  sarea.ctx = screen.ctx;
  sarea.size[0] = width;
  sarea.size[1] = height;
  sarea.pos[0] = args.pos ? args.pos[0] : 100;
  sarea.pos[1] = args.pos ? args.pos[1] : 100;

  sarea.pos[0] = Math.min(Math.max(sarea.pos[0], 0), Math.max(screen.size[0] - width - 2, 0));
  sarea.pos[1] = Math.min(Math.max(sarea.pos[1], 0), Math.max(screen.size[1] - height - 2, 0));

  //before switchEditor, so the editor is laid out under the titlebar on its first pass rather
  //than being resized out from under itself on the next one
  if (titlebar) {
    sarea.chromeHeight = POPUP_TITLEBAR_HEIGHT;
  }

  sarea.switchEditor(area_class as never);

  //a frame and a shadow, so the popup reads as sitting *over* the mesh rather than as one more
  //pane in it. Themed where the theme has an opinion and hardcoded where it does not — a
  //screen area is normally edge to edge, so most of these have no default at all.
  sarea.style.backgroundColor = sarea.getDefault("background-color") as string;
  sarea.style.borderRadius = ((sarea.getDefault("border-radius") as number) || 4) + "px";
  sarea.style.borderColor = (sarea.getDefault("border-color") as string) || "rgba(0,0,0,0.5)";
  sarea.style.borderStyle = "solid";
  sarea.style.borderWidth = "1px";
  sarea.style.boxShadow = "0 6px 24px rgba(0,0,0,0.45)";
  //the titlebar's corners are square; without this they paint over the rounded ones
  sarea.style.overflow = "hidden";

  sarea.flag |= AreaFlags.FLOATING | AreaFlags.INDEPENDENT;

  screen.appendChild(sarea as unknown as Node);

  if (titlebar) {
    makeTitleBar(sarea, args.title ?? area_class.define().uiname ?? "");
  }

  //builds the four borders the resize tool drags, which a popup only gets by asking
  sarea.loadFromPosSize();
  sarea.setCSS();

  if (addEscapeKeyHandler) {
    sarea.on_keydown = (e: KeyboardEvent) => {
      if (e.keyCode === keymap.Escape) {
        sarea.close();
      }
    };
  }

  sarea.bringToFront();

  return sarea;
}
