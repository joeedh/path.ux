import * as util from './util.js';

export function startupReport() {
  let s = '';
  for (let i=0; i<arguments.length; i++) {
    s += arguments[i] + ' ';
  }

  console.log(util.termColor(s, "green"));
}
