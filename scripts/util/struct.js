import './nstructjs.js';

export let nstructjs = window.nstructjs;

export const STRUCT = nstructjs.STRUCT;
export const manager = nstructjs.manager;
export const write_scripts = nstructjs.write_scripts;
export const inherit = nstructjs.inherit;
export const setDebugMode = nstructjs.setDebugMode;
export const validateStructs = nstructjs.validateStructs;
export const readObject = nstructjs.readObject;
export const writeObject = nstructjs.writeObject;
export const _nstructjs = nstructjs;
export const readJSON = nstructjs.readJSON;
export const writeJSON = nstructjs.writeJSON;
export const setAllowOverriding = nstructjs.setAllowOverriding;

export function register(cls) {
  manager.add_class(cls);
}

export function setEndian(little_endian=true) {
  nstructjs.STRUCT_ENDIAN = little_endian;
}

