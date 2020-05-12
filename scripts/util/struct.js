import './nstructjs.js';

export let nstructjs = window.nstructjs;

export const STRUCT = nstructjs.STRUCT;
export const manager = nstructjs.manager;
export const write_scripts = nstructjs.write_scripts;
export const inherit = nstructjs.inherit;
export const setDebugMode = nstructjs.setDebugMode;

export function register(cls) {
  manager.add_class(cls);
}
