export declare type AnimMethod = "update";
export declare type AnimCurve = "ease" | "bounce" | "random";
export declare type AnimPropKey = string | number;

/**
 *
 * custom get/setters for animated properties
 *
 * e.g. {
 *    prop_get() {}
 *    prop_set(val) {}
 * }
 */
export type AnimatorHandlers = {
  /* prop_get/prop_set */
  [k: string]: (() => any) | ((any) => void);
};

export declare class Animator {
  constructor(owner: any, method: AnimMethod);

  bind(owner: any);

  wait(ms: number): this;

  goto(key: AnimPropKey, val: any, timeMs: number, curve?: AnimeCurve): this;

  set(key: AnimPropKey, val: any, time: number): this;

  /** Call this while the current command is still being executed. */
  while(cb: () => void): this;

  then(cb: () => void): this;

  end(): void;

  on_tick(): void;
}
