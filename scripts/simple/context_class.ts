export class SimpleContext {
  constructor() {}

  static getContextClass() {
    let props: Record<string, PropertyDescriptor> = {};

    let rec = (cls: any) => {
      let prototype = cls.prototype;

      if (Object.getPrototypeOf(cls) !== Object.getPrototypeOf(Object)) {
        rec(cls);
      }

      for (let k in cls) {
        let descr = Object.getOwnPropertyDescriptor(prototype, k);

        if (descr) {
          props[k] = descr;
        }
      }
    };

    console.log(props);

    for (let k in props) {
      if (k.search("_save") >= 0 || k.search("_load") >= 0) {
        continue;
      }
    }
  }
}
