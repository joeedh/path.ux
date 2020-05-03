import './_struct.js';

export let nstructjs = window.nstructjs;

export const STRUCT = nstructjs.STRUCT;
export const manager = nstructjs.manager;
export const write_scripts = nstructjs.write_scripts;


export function register(cls) {
  manager.add_class(cls);
}
