/*function doimport() {
  let args = [];

  for (let i=0; i<arguments.length; i++) {
    args.push(arguments[i]);
  }

  let mods = [];

  return new Promise((accept, reject) => {
    function next() {
      if (args.length === 0) {
        console.log("loaded all modules");
        accept.apply(undefined, mods);
        return;
      }

      let modname = args.shift();
      console.log("Modname", modname)
      import(modname).then(mod2 => {
        mods.push(mod2);
        next();
      });
    }

    next();
  });
}

export const exports = {
  ready : false
};

export default exports;

doimport("marked", "fs", "path", "diff", "parse5").then((marked, fs, pathmod, jsdiff, parse5) => {

  exports.ready = true;

  console.log(fs, pathmod);

  marked = marked.default;
  fs = fs.default;
  parse5 = parse5.default;
  pathmod = pathmod.default;
 */

import fs from 'fs';
import { marked } from 'marked';
import parse5 from 'parse5';
import pathmod from 'path';
import * as jsdiff from 'diff';

import docsys_base from './docsys_base.js';

let exports = docsys_base(fs, marked, parse5, pathmod, jsdiff);
export const readConfig = exports.readConfig;

