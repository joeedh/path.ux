export class SimpleContext {
  constructor() {}

  static getContextClass() {
    const props: Record<string, PropertyDescriptor> = {};

    console.log(props);

    for (const k in props) {
      if (k.search("_save") >= 0 || k.search("_load") >= 0) {
        continue;
      }
    }
  }
}
