// A worker has `self` and node has neither `self` nor `window`; only `globalThis` is on every
// runtime that can evaluate `class UIBase extends HTMLElement`
if (typeof HTMLElement === "undefined") {
  const g = globalThis as Record<string, unknown>;
  g.HTMLElement = class HTMLElement {};
  g.customElements = {
    define: () => {},
  };
  g.devicePixelRatio = 1.0;
  g.PointerEvent = class PointerEvent {};
}
