import './_struct.js';

export const STRUCT = nstructjs.STRUCT;
export const manager = nstructjs.manager;
export function register(cls) {
  manager.add_class(cls);
}
