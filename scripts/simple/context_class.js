
export class SimpleContext {
  constructor() {

  }

  static getContextClass() {
    let props = {};

    let rec = (cls) => {
      let prototype = cls.prototype;

      if (cls.__proto__ !== Object.__proto__) {
        rec(cls);
      }

      for (let k in cls) {
        let descr = Object.getOwnPropertyDescriptor(prototype, k);

        if (descr) {
          props[k] = descr;
        }
      }
    }

    console.log(props);

    for (let k in props) {
      if (k.search("_save") >= 0 || k.search("_load") >= 0) {
        continue;
      }

    }
  }
}