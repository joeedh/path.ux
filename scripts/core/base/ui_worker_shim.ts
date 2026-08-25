// inside a worker?
if (typeof HTMLElement === "undefined") {
  // @ts-expect-error
  window.HTMLElement = class HTMLElement {};
  // @ts-expect-error
  window.customElements = {
    define: () => {},
  };
  window.devicePixelRatio = 1.0;
  // @ts-expect-error
  window.PointerEvent = class PointerEvent {};
}
