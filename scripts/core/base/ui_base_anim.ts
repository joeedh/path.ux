import * as util from "../../path-controller/util/util";
import { Vector3, Vector4 } from "../../path-controller/util/vectormath";
import { Animator } from "../anim";
import { color2css, css2color, parsepx } from "../ui_theme";
import { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

export function flash(
  elem: AnyUIBase,
  colorIn: string | number[] | Vector3 | Vector4,
  rect_element: UIBase | HTMLElement = elem,
  timems = 355,
  autoFocus = true
): void {
  if (typeof colorIn === "string") {
    colorIn = Array.from(css2color(colorIn));
  }
  const color = new Vector4().loadXYZW(colorIn[0], colorIn[1], colorIn[2], colorIn[3] ?? 1.0);
  const csscolor = color2css(color);

  if (elem._flashtimer !== undefined && elem._flashcolor !== csscolor) {
    window.setTimeout(() => {
      elem.flash(color, rect_element, timems, autoFocus);
    }, 100);

    return;
  } else if (elem._flashtimer !== undefined) {
    return;
  }

  const rect = rect_element.getBoundingClientRect();

  if (rect === undefined) {
    return;
  }

  //dom calls onchange() on .remove, so the timer code has to come first to avoid loops
  let timer: number | undefined;
  let tick = 0;
  const max = ~~(timems / 20);

  const x = rect.x;
  const y = rect.y;

  const cb = () => {
    if (timer === undefined) {
      return;
    }

    const a = 1.0 - tick / max;
    div.style["backgroundColor"] = color2css(color, a * a * 0.5);

    if (tick > max) {
      window.clearInterval(timer);

      elem._flashtimer = undefined;
      elem._flashcolor = undefined;
      timer = undefined;

      div.remove();

      if (autoFocus) {
        elem._flash_focus();
      }
    }

    tick++;
  };

  window.setTimeout(cb, 5);
  timer = window.setInterval(cb, 20);
  elem._flashtimer = timer;

  const div = document.createElement("div");

  div.style["pointerEvents"] = "none";
  div.tabIndex = -1;
  div.style["zIndex"] = "900";
  div.style["display"] = "float";
  div.style["position"] = UIBase.PositionKey;
  div.style["margin"] = "0px";
  div.style["left"] = x + "px";
  div.style["top"] = y + "px";

  div.style["backgroundColor"] = color2css(color, 0.5);
  div.style["width"] = rect.width + "px";
  div.style["height"] = rect.height + "px";
  div.setAttribute("class", "UIBaseFlash");

  const screen = elem.getScreen();
  if (screen !== undefined) {
    screen._enterPopupSafe();
  }

  document.body.appendChild(div);
  if (autoFocus) {
    elem._flash_focus();
  }

  elem._flashcolor = csscolor;

  if (screen !== undefined) {
    screen._exitPopupSafe();
  }
}

export function animateOld(
  elem: AnyUIBase,
  _extra_handlers: Record<string, Function> | Keyframe[] | PropertyIndexedKeyframes | null = {},
  domAnimateOptions?: KeyframeAnimationOptions | number
): Animator {
  const transform = new DOMMatrix(elem.saneStyle["transform"]);

  const update_trans = () => {
    const t = transform;
    const css = "matrix(" + t.a + "," + t.b + "," + t.c + "," + t.d + "," + t.e + "," + t.f + ")";
    elem.saneStyle["transform"] = css;
  };

  let handlers: Record<string, Function> = {
    background_get(this: UIBase) {
      return css2color(this.background);
    },

    background_set(this: UIBase, c: string | number[]) {
      if (typeof c !== "string") {
        c = color2css(c);
      }
      this.background = c;
    },

    dx_get() {
      return transform.m41;
    },
    dx_set(x: number) {
      transform.m41 = x;
      update_trans();
    },

    dy_get() {
      return transform.m42;
    },
    dy_set(x: number) {
      transform.m42 = x;
      update_trans();
    },
  };

  const pixkeys = [
    "width",
    "height",
    "left",
    "top",
    "right",
    "bottom",
    "border-radius",
    "border-width",
    "margin",
    "padding",
    "margin-left",
    "margin-right",
    "margin-top",
    "margin-bottom",
    "padding-left",
    "padding-right",
    "padding-bottom",
    "padding-top",
  ];
  handlers = Object.assign(handlers, _extra_handlers);

  const makePixHandler = (k: string, k2: string) => {
    handlers[k2 + "_get"] = () => {
      const s = elem.saneStyle[k];

      if (s.endsWith("px")) {
        return parsepx(s);
      } else {
        return 0.0;
      }
    };

    handlers[k2 + "_set"] = (val: number | string) => {
      elem.saneStyle[k] = val + "px";
    };
  };

  for (const k of pixkeys) {
    if (!(k in handlers)) {
      makePixHandler(k, `style.${k}`);
      makePixHandler(k, `style["${k}"]`);
      makePixHandler(k, `style['${k}']`);
    }
  }

  const handler: ProxyHandler<UIBase> = {
    get: (target: UIBase, key: string, receiver: unknown) => {
      console.log(key, handlers[key + "_get"], handlers);

      if (key + "_get" in handlers) {
        return handlers[key + "_get"].call(target);
      } else {
        return (target as any)[key];
      }
    },
    set: (target: UIBase, key: string, val: unknown, receiver: unknown) => {
      console.log(key);

      if (key + "_set" in handlers) {
        handlers[key + "_set"].call(target, val);
      } else {
        (target as any)[key] = val;
      }

      return true;
    },
  };

  const proxy = new Proxy(elem, handler);
  const anim = new Animator(proxy as any);

  anim.onend = () => {
    elem._active_animations.remove(anim);
  };

  elem._active_animations.push(anim);
  return anim;
}

export function abortAnimations(elem: AnyUIBase): void {
  for (const anim of util.list(elem._active_animations)) {
    anim.end();
  }

  elem._active_animations = [];
}
