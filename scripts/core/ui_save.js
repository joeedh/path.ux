//this code is currently disabled
//XXX todo: review this rewritten version of saveUIData/loadUIData

import * as util from '../util/util.js';
import {Vector2, Vector3} from '../util/vectormath.js';

export const UI_SAVE_VERSION = 2;

function debuglog() {
  if (window.DEBUG && window.DEBUG.uipaths) {
    console.warn.apply(...arguments);
  }
}

//avoid circular module ref
let UIBase;
export function setUIBase(cls) {
  UIBase = cls;
}

export function saveUIData(node, key) {
  if (key === undefined) {
    throw new Error("ui_base.saveUIData(): key cannot be undefined");
  }

  let paths = new Map();

  let rec = (path, n) => {
    if (!(n instanceof HTMLElement)) {
      return;
    }


    if (n instanceof UIBase) {
      let path2 = n.constructor.define().tagname + "|" + path;
      paths.set(path2, n.saveData());
    }

    let ni = 0;
    for (let n2 of n.childNodes) {
      let path2 = path + `[${ni}]`;
      rec(path2, n2);
      ni++;
    }

    if (n.shadow) {
      let ni = 0;

      for (let n2 of n.shadow.childNodes) {
        let path2 = path + `{${ni}}`;
        rec(path2, n2);
        ni++;
      }
    }
  }

  rec("", node, undefined, 0, false);

  let paths2 = {};
  for (let [path, data] of paths) {
    let bad = !data;
    bad = bad || (typeof data === "object" && Object.keys(data).length === 0);

    if (!bad) {
      paths2[path] = data;
    }
  }

  paths = paths2;

  return JSON.stringify({
    version : UI_SAVE_VERSION,
    key,
    paths
  });
}

//window._saveUIData = saveUIData;

import {tokdef, parser, lexer, PUTLParseError} from '../path-controller/util/parseutil.js';

export function makeParser() {
  const tk = (name, re, func) => new tokdef(name, re, func);
  let p;

  const tokens = [
    tk("LSBRACKET", /\[/),
    tk("RSBRACKET", /\]/),
    tk("LBRACE", /\{/),
    tk("RBRACE", /\}/),
    tk("NUM", /[0-9]+/, t => t.setValue(parseInt(t.value))),
    tk("WS", /[ \t]/, token => undefined), //drop token
  ];

  function p_error(t) {
    console.warn(t);

    p.userdata = undefined; //prevent reference leak
    throw new PUTLParseError("Parse error");
  }

  const l = new lexer(tokens);
  p = new parser(l, p_error);

  function consumeAll() {
    while (!p.at_end()) {
      p.next();
    }
  }

  function p_Start() {
    let node = p.userdata;

    while (!p.at_end()) {
      let t = p.peeknext();

      //console.log(node.tagName.toLowerCase());

      if (t.type === "LSBRACKET") {
        p.next();
        let idx = p.expect("NUM");

        if (idx >= node.childNodes.length || !(node.childNodes[idx] instanceof HTMLElement)) {
          let li = p.lexer.lexpos;
          let path = p.lexer.lexdata;

          debuglog(idx, p.lexer.lexpos, path.slice(li-3, path.length), node.childNodes);

          consumeAll();
          return undefined;
        }

        node = node.childNodes[idx];

        p.expect('RSBRACKET');
      } else if (t.type === "LBRACE") {
        p.next();
        let idx = p.expect("NUM");

        if (!node.shadow || idx >= node.shadow.childNodes.length || !(node.shadow.childNodes[idx] instanceof HTMLElement)) {
          let li = p.lexer.lexpos;
          let path = p.lexer.lexdata;

          debuglog(idx, p.lexer.lexpos, path.slice(li-3, path.length), node, node.shadow ? node.shadow.childNodes : undefined);
          consumeAll();
          return undefined;
        }

        node = node.shadow.childNodes[idx];

        p.expect("RBRACE");
      } else {
        p.expect("LBRACE");
      }
    }

    return node;
  }

  p.start = p_Start;

  return p;
}

const pathParser = makeParser();

export function loadPath(node, key, json) {
  console.log(key);
  key = key.split("|");
  let tagname = key[0].trim();
  let path = (key[1] || "").trim();

  if (path === "") {
    if (tagname === node.constructor.define().tagname) {
      node.loadData(json);
    } else {
      debuglog("Failed to load ui save path", key);
    }

    return;
  }

  pathParser.userdata = node;
  let child;

  try {
    child = pathParser.parse(path);
  } catch (error) {
    if (error instanceof PUTLParseError) {
      console.error("Parse error parsing ui save path " + path);
    } else {
      throw error;
    }
  }

  if (child && child.constructor.define().tagname !== tagname) {
    debuglog("Failed to load ui save path", key);
    child = undefined;
  } else if (!child) {
    debuglog("Failed to load ui save path", key);
  }

  pathParser.userdata = undefined; //prevent reference leak

  if (child) {
    child.loadData(json);
  }
}

export function loadUIData(node, json) {
  if (typeof json === 'string') {
    json = JSON.parse(json);
  }

  for (let k in json.paths) {
    let v = json.paths[k];

    //paranoia check
    if (v === undefined) {
      continue;
    }

    loadPath(node, k, v);
  }
}
//window._loadUIData = loadUIData;
