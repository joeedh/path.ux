export class SimpleContext {
  constructor() {}

  static getContextClass() {
    const props: Record<string, PropertyDescriptor> = {};

    const rec = (cls: any) => {
      const prototype = cls.prototype;

      if (Object.getPrototypeOf(cls) !== Object.getPrototypeOf(Object)) {
        rec(cls);
      }

      for (const k in cls) {
        const descr = Object.getOwnPropertyDescriptor(prototype, k);

        if (descr) {
          props[k] = descr;
        }
      }
    };

    console.log(props);

    for (const k in props) {
      if (k.search("_save") >= 0 || k.search("_load") >= 0) {
        continue;
      }
    }
  }
}
